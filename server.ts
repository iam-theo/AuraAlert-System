import './server/telemetry.js';
import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import swaggerUi from 'swagger-ui-express';
import { createServer as createViteServer } from "vite";

import { initDatabase, query } from './server/db.js';
import { generateAITemplate, troubleshootFailureLog } from './server/gemini.js';
import { swaggerDocument } from './server/swagger.js';
import { container } from './server/microkernel/container.js';
import { SendNotificationCommand, RotateSecretCommand, ToggleProviderCommand } from './server/microkernel/application.js';
import { register, Counter, Histogram } from 'prom-client';

const app = express();
const PORT = 3000;

// Prometheus metrics
const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    requestCounter.inc({ method: req.method, route, status: res.statusCode });
    requestDuration.observe({ method: req.method, route, status: res.statusCode }, duration);
  });
  next();
});

app.use(express.json());

// Metrics endpoint
app.get('/api/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Mount Swagger UI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// JWT secrets derived from environment or secure defaults
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || crypto.randomBytes(64).toString('hex');

// SSE clients for real-time notification streams
let sseClients: express.Response[] = [];

// Helper to broadcast real-time updates to connected dashboards
function broadcastUpdate(type: string, data: any) {
  const payload = JSON.stringify({ type, data });
  sseClients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
}

// Wire the event-driven microkernel events directly to SSE broadcast
container.onBroadcast((type, data) => {
  broadcastUpdate(type, data);
});

// ----------------------------------------------------
// AUTHENTICATION MIDDLEWARES & ENDPOINTS
// ----------------------------------------------------
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_ACCESS_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired access token' });
    req.user = user;
    next();
  });
}

// RBAC Permission Enforcer Middleware
function requirePermission(permissionCode: string) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Administrator role bypasses all checks for convenience
    if (req.user.role === 'administrator') {
      return next();
    }
    if (req.user.permissions && req.user.permissions.includes(permissionCode)) {
      return next();
    }
    return res.status(403).json({ error: `Forbidden: Missing required privilege (${permissionCode})` });
  };
}

// Login Endpoint (Relational & Cryptographic Auth)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // 1. Fetch user by email and join role
    const userResult = await query(
      'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // 2. Validate password hash using bcrypt with legacy SHA-256 fallback
    let isValid = false;
    if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
      isValid = bcrypt.compareSync(password, user.password_hash);
    } else {
      const inputHash = crypto.createHash('sha256').update(password).digest('hex');
      isValid = user.password_hash === inputHash || user.password_hash === password;
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Fetch role permissions
    const permResult = await query(
      'SELECT p.code FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = $1',
      [user.role_id]
    );

    const permissions = permResult.rows.map((row: any) => row.code);

    // 4. Generate enterprise signed JWT token with permissions
    const tokenUser = {
      email: user.email,
      role: user.role_name,
      permissions
    };

    const accessToken = jwt.sign(tokenUser, JWT_ACCESS_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken,
      user: tokenUser
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// RBAC USER & ROLE MANAGEMENT ENDPOINTS
// ----------------------------------------------------
app.get('/api/rbac/users', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  try {
    const result = await query('SELECT u.id, u.email, u.role_id, r.name as role_name, u.created_at FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rbac/roles', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM roles ORDER BY name ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rbac/users', authenticateToken, requirePermission('MANAGE_APPLICATIONS'), async (req, res) => {
  const { email, password, role_id } = req.body;
  if (!email || !password || !role_id) {
    return res.status(400).json({ error: 'Email, password and role_id are required' });
  }

  try {
    const password_hash = bcrypt.hashSync(password, 10);
    const id = `user-${crypto.randomUUID().split('-')[0]}`;
    await query(
      'INSERT INTO users (id, email, password_hash, role_id) VALUES ($1, $2, $3, $4)',
      [id, email, password_hash, role_id]
    );
    res.status(201).json({ id, email, role_id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/rbac/users/:id', authenticateToken, requirePermission('MANAGE_APPLICATIONS'), async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SSE Subscription Endpoint for real-time dashboard events
app.get('/api/events/subscribe', (req, res) => {
  const token = req.query.token as string;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, JWT_ACCESS_SECRET, (err: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired access token' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
  
    sseClients.push(res);
  
    req.on('close', () => {
      sseClients = sseClients.filter(client => client !== res);
    });
  });
});

// ----------------------------------------------------
// APPLICATIONS ENDPOINTS
// ----------------------------------------------------
app.get('/api/applications', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM applications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/applications', authenticateToken, requirePermission('MANAGE_APPLICATIONS'), async (req, res) => {
  const { name, environment } = req.body;
  if (!name || !environment) {
    return res.status(400).json({ error: 'Application name and environment are required' });
  }

  const id = `app-${crypto.randomUUID().split('-')[0]}`;
  const apiKey = `aa_live_key_${crypto.randomUUID().split('-')[0]}`;

  try {
    await query(
      'INSERT INTO applications (id, name, api_key, environment) VALUES ($1, $2, $3, $4)',
      [id, name, apiKey, environment]
    );
    res.status(201).json({ id, name, api_key: apiKey, environment });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/applications/:id', authenticateToken, requirePermission('MANAGE_APPLICATIONS'), async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM applications WHERE id = $1', [id]);
    res.json({ success: true, message: 'Application deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// PROVIDERS ENDPOINTS
// ----------------------------------------------------
app.get('/api/providers', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM providers ORDER BY channel ASC, priority ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers', authenticateToken, requirePermission('MANAGE_PROVIDERS'), async (req, res) => {
  const { name, channel, config, priority, is_active } = req.body;
  if (!name || !channel || !config) {
    return res.status(400).json({ error: 'Provider name, channel and config are required' });
  }

  const id = `prov-${crypto.randomUUID().split('-')[0]}`;
  try {
    // If setting active, deactivate others on the same channel
    if (is_active) {
      await query('UPDATE providers SET is_active = FALSE WHERE channel = $1', [channel]);
    }

    await query(
      'INSERT INTO providers (id, name, channel, config, priority, is_active, health_status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, name, channel, JSON.stringify(config), priority || 1, !!is_active, 'healthy']
    );
    res.status(201).json({ id, name, channel, config, priority, is_active });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/providers/:id', authenticateToken, requirePermission('MANAGE_PROVIDERS'), async (req, res) => {
  const { id } = req.params;
  const { name, channel, config, priority, is_active, health_status } = req.body;

  try {
    if (is_active) {
      await query('UPDATE providers SET is_active = FALSE WHERE channel = $1 AND id != $2', [channel, id]);
    }

    await query(
      'UPDATE providers SET name = $1, channel = $2, config = $3, priority = $4, is_active = $5, health_status = $6 WHERE id = $7',
      [name, channel, JSON.stringify(config), priority, !!is_active, health_status || 'healthy', id]
    );
    res.json({ success: true, message: 'Provider updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers/:id/toggle', authenticateToken, requirePermission('MANAGE_PROVIDERS'), async (req, res) => {
  const { id } = req.params;
  const { is_active, channel } = req.body;

  try {
    if (is_active) {
      // Deactivate others
      await query('UPDATE providers SET is_active = FALSE WHERE channel = $1', [channel]);
    }
    
    const commandBus = container.serviceDiscovery.resolve<any>('CommandBus');
    const actor = (req as any).user ? (req as any).user.email : 'system_admin';
    await commandBus.execute(new ToggleProviderCommand(actor, id, !!is_active));
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers/:id/test', authenticateToken, requirePermission('MANAGE_PROVIDERS'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM providers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    // Simulate diagnostic check
    const provider = result.rows[0];
    const isSuccess = false; // 85% success rate
    const newStatus = isSuccess ? 'healthy' : 'degraded';
    
    await query('UPDATE providers SET health_status = $1 WHERE id = $2', [newStatus, id]);

    res.json({
      success: isSuccess,
      status: newStatus,
      latencyMs: 120,
      timestamp: new Date().toISOString(),
      diagnostics: isSuccess 
        ? `Successfully connected to ${provider.name} gateway. Connection handshake accepted.`
        : `Connection degraded to ${provider.name}. High response latency detected in handshake packet.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/providers/:id', authenticateToken, requirePermission('MANAGE_PROVIDERS'), async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM providers WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ENTERPRISE ADVANCED SERVICES ENDPOINTS
// ----------------------------------------------------

// Queues Status & Action Routing
app.get('/api/queues/status', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM queue_states');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/queues/:name/action', authenticateToken, requirePermission('MANAGE_QUEUES'), async (req, res) => {
  const { name } = req.params;
  const { action } = req.body; // 'pause', 'resume', 'clear', 'flush_dlq'
  try {
    const result = await query('SELECT * FROM queue_states WHERE name = $1', [name]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    if (action === 'pause') {
      await query('UPDATE queue_states SET status = $1 WHERE name = $2', ['paused', name]);
    } else if (action === 'resume') {
      await query('UPDATE queue_states SET status = $1 WHERE name = $2', ['active', name]);
    } else if (action === 'clear') {
      await query('UPDATE queue_states SET waiting = 0, active = 0 WHERE name = $2', [name]);
    } else if (action === 'flush_dlq') {
      // Move DLQ item count to retry queue
      await query('UPDATE queue_states SET waiting = waiting + 14 WHERE name = $1', ['retry']);
      await query('UPDATE queue_states SET waiting = 0 WHERE name = $1', ['dlq']);
    }
    const updated = await query('SELECT * FROM queue_states WHERE name = $1', [name]);
    res.json({ success: true, queue: updated.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Credential Vault Secret Manager
app.get('/api/vault/secrets', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM credential_vault ORDER BY key ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vault/secrets/rotate', authenticateToken, requirePermission('MANAGE_VAULT'), async (req, res) => {
  const { key, secret_value } = req.body;
  try {
    const result = await query('SELECT * FROM credential_vault WHERE key = $1', [key]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Secret not found' });
    }
    const newVal = secret_value || `aa_vault_rotated_${crypto.randomUUID().split('-')[0]}`;
    
    const commandBus = container.serviceDiscovery.resolve<any>('CommandBus');
    const actor = (req as any).user ? (req as any).user.email : 'system_admin';
    await commandBus.execute(new RotateSecretCommand(actor, key, newVal));

    const updated = await query('SELECT * FROM credential_vault WHERE key = $1', [key]);
    res.json({ success: true, secret: updated.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Event Registry
app.get('/api/events/registry', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM event_registry ORDER BY name ASC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/registry/register', authenticateToken, requirePermission('MANAGE_EVENTS'), async (req, res) => {
  const { name, appId, variables, priority, retryPolicy } = req.body;
  try {
    const id = `evt-${Date.now()}`;
    await query(
      `INSERT INTO event_registry (id, name, app_id, variables, priority, retry_policy) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name, appId || 'demo-app-uuid-1111-2222', variables || [], priority || 'normal', JSON.stringify(retryPolicy || {})]
    );
    const result = await query('SELECT * FROM event_registry WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SLA and Financial Costs Analytics
app.get('/api/analytics/costs', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  res.json({
    totalCost: 124.50,
    dailySpend: [
      { date: 'Jul 10', email: 2.10, sms: 10.50, whatsapp: 5.20 },
      { date: 'Jul 11', email: 2.30, sms: 11.20, whatsapp: 5.40 },
      { date: 'Jul 12', email: 1.95, sms: 9.80, whatsapp: 4.90 },
      { date: 'Jul 13', email: 2.45, sms: 12.30, whatsapp: 6.10 },
      { date: 'Jul 14', email: 2.20, sms: 10.90, whatsapp: 5.80 },
      { date: 'Jul 15', email: 2.50, sms: 11.50, whatsapp: 6.50 },
      { date: 'Jul 16', email: 2.80, sms: 13.10, whatsapp: 7.20 }
    ],
    projections: {
      nextMonthEstimate: 540.00,
      confidenceScore: 0.94
    },
    chargesByProvider: [
      { name: 'SMTP - Brevo Gateway', cost: 18.40 },
      { name: 'Twilio SMS Core', cost: 72.80 },
      { name: 'Twilio WhatsApp API', cost: 33.30 }
    ]
  });
});

app.get('/api/analytics/sla', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  res.json({
    averageLatencyMs: 142,
    p95LatencyMs: 285,
    averageQueueWaitMs: 38,
    compliancePct: 99.8,
    breachCount: 2,
    incidents: [
      { id: 'inc-1', provider: 'SMTP - Brevo Gateway', title: 'SMTP Timeout Failure', durationMinutes: 12, resolvedAt: new Date(Date.now() - 3600000 * 5).toISOString(), status: 'resolved' },
      { id: 'inc-2', provider: 'Twilio SMS Core', title: 'Sms Handshake Slowdown', durationMinutes: 4, resolvedAt: new Date(Date.now() - 3600000 * 24).toISOString(), status: 'resolved' }
    ]
  });
});

// Multi-Tenant Control Plane Settings Updates
app.post('/api/applications/:id/settings', authenticateToken, requirePermission('MANAGE_APPLICATIONS'), async (req, res) => {
  const { id } = req.params;
  const { rate_limit, webhook_url, webhook_secret, webhook_active, branding } = req.body;
  try {
    await query(
      `UPDATE applications SET rate_limit = $1, webhook_url = $2, webhook_secret = $3, webhook_active = $4, branding = $5 WHERE id = $6`,
      [rate_limit, webhook_url, webhook_secret, webhook_active, JSON.stringify(branding || {}), id]
    );
    const result = await query('SELECT * FROM applications WHERE id = $1', [id]);
    res.json({ success: true, application: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Diagnostics handler alias
app.post('/api/providers/:id/diagnostics', authenticateToken, requirePermission('MANAGE_PROVIDERS'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM providers WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    const provider = result.rows[0];
    // Perform real health check based on provider type
    let isSuccess = false;
    let diagnostics = 'Handshake failed.';

    if (provider.config?.providerType === 'termii' || provider.name?.toLowerCase().includes('termii')) {
        try {
            const response = await fetch(`${provider.config.baseUrl || 'https://v3.api.termii.com'}/api/sms/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: provider.config.apiKey,
                    from: provider.config.senderId,
                    to: '+2348000000000', // Valid international format for handshake test
                    sms: 'Handshake Test',
                    type: 'plain',
                    channel: 'generic'
                })
            });
            
            // Termii will likely return 401/400 for invalid API key
            if (response.ok) {
                isSuccess = true;
                diagnostics = 'Successfully connected to Termii gateway.';
            } else {
                const data = await response.json();
                isSuccess = false;
                diagnostics = `Termii API Authentication failed: ${data.message || JSON.stringify(data)}`;
            }
        } catch (err: any) {
            isSuccess = false;
            diagnostics = `Termii Connection Error: ${err.message}`;
        }
    } else {
        // Fallback for other providers: simulation
        isSuccess = false;
        diagnostics = isSuccess 
          ? `Successfully connected to ${provider.name} gateway. SLA handshake completed in 120ms.`
          : `Connection degraded to ${provider.name}. Outbound packet-loss detected on handshake.`;
    }
    
    const newStatus = isSuccess ? 'healthy' : 'degraded';
    await query('UPDATE providers SET health_status = $1 WHERE id = $2', [newStatus, id]);
    res.json({
      success: isSuccess,
      status: newStatus,
      latencyMs: 120,
      timestamp: new Date().toISOString(),
      diagnostics: diagnostics
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// TEMPLATES ENDPOINTS
// ----------------------------------------------------
app.get('/api/templates', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM templates ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates', authenticateToken, requirePermission('MANAGE_TEMPLATES'), async (req, res) => {
  const { name, subject, content, channel, variables, status } = req.body;
  if (!name || !subject || !content || !channel) {
    return res.status(400).json({ error: 'Name, subject, content and channel are required' });
  }

  const id = `temp-${crypto.randomUUID().split('-')[0]}`;
  try {
    await query(
      'INSERT INTO templates (id, name, subject, content, channel, variables, status, version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, name, subject, content, channel, variables || [], status || 'published', 1]
    );
    res.status(201).json({ id, name, subject, content, channel, variables, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/templates/:id', authenticateToken, requirePermission('MANAGE_TEMPLATES'), async (req, res) => {
  const { id } = req.params;
  const { name, subject, content, channel, variables, status, version } = req.body;

  try {
    await query(
      'UPDATE templates SET name = $1, subject = $2, content = $3, channel = $4, variables = $5, status = $6, version = $7 WHERE id = $8',
      [name, subject, content, channel, variables || [], status || 'published', version || 1, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/templates/:id', authenticateToken, requirePermission('MANAGE_TEMPLATES'), async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM templates WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates/ai-suggest', authenticateToken, requirePermission('MANAGE_TEMPLATES'), async (req, res) => {
  const { prompt, channel } = req.body;
  if (!prompt || !channel) {
    return res.status(400).json({ error: 'Prompt and channel are required' });
  }

  try {
    const suggestion = await generateAITemplate(prompt, channel);
    res.json(suggestion);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// NOTIFICATION LOGS & ANALYTICS ENDPOINTS
// ----------------------------------------------------
app.get('/api/logs', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM notification_logs ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/analytics', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  try {
    // Read all logs
    const logsResult = await query('SELECT * FROM notification_logs');
    const logs = logsResult.rows;

    const totalCount = logs.length;
    const sentCount = logs.filter((l: any) => l.status === 'sent').length;
    const failedCount = logs.filter((l: any) => l.status === 'failed').length;
    const pendingCount = logs.filter((l: any) => l.status === 'pending' || l.status === 'retrying').length;
    const deliveryRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

    // Channel Distribution
    const channelMap: Record<string, number> = {};
    // Top Templates Map
    const templateMap: Record<string, number> = {};
    // Daily Metrics map
    const dailyMap: Record<string, { sent: number, failed: number }> = {};

    // Seed last 7 days of daily analytics
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = { sent: 0, failed: 0 };
    }

    logs.forEach((log: any) => {
      // Channel
      channelMap[log.channel] = (channelMap[log.channel] || 0) + 1;
      
      // Top Templates
      templateMap[log.template_name] = (templateMap[log.template_name] || 0) + 1;

      // Daily grouping
      const dateStr = new Date(log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      if (dailyMap[dateStr]) {
        if (log.status === 'sent') dailyMap[dateStr].sent++;
        if (log.status === 'failed') dailyMap[dateStr].failed++;
      }
    });

    const channelDistribution = Object.keys(channelMap).map(key => ({
      channel: key.toUpperCase(),
      count: channelMap[key],
    }));

    const dailyMetrics = Object.keys(dailyMap).map(key => ({
      date: key,
      sent: dailyMap[key].sent,
      failed: dailyMap[key].failed,
    }));

    const topTemplates = Object.keys(templateMap)
      .map(key => ({ name: key, count: templateMap[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Read providers for status summary
    const provsResult = await query('SELECT * FROM providers');
    const providerHealth = provsResult.rows.map((p: any) => {
      const pLogs = logs.filter((l: any) => l.provider_used === p.name);
      const pSent = pLogs.filter((l: any) => l.status === 'sent').length;
      const successRate = pLogs.length > 0 ? Math.round((pSent / pLogs.length) * 100) : 100;
      return {
        provider: p.name,
        status: p.health_status,
        successRate
      };
    });

    res.json({
      totalCount,
      sentCount,
      failedCount,
      pendingCount,
      deliveryRate,
      channelDistribution,
      dailyMetrics,
      providerHealth,
      topTemplates,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Troubleshooting failed notification logs using Gemini
app.post('/api/logs/:id/troubleshoot', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query('SELECT * FROM notification_logs WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification log not found' });
    }

    const log = result.rows[0];
    if (log.status !== 'failed') {
      return res.status(400).json({ error: 'Can only troubleshoot failed notification events' });
    }

    const analysisMarkdown = await troubleshootFailureLog(
      log.error_message || 'Unknown network gateway timeout',
      log.provider_used || 'Active Provider Relay',
      log.channel
    );

    res.json({ troubleshooting: analysisMarkdown });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { exportData } from './server/export.js';
app.get('/api/export/:type/:format', authenticateToken, requirePermission('VIEW_DATA'), async (req, res) => {
  const { type, format } = req.params;
  try {
    let data: any[] = [];
    if (type === 'logs') {
      const result = await query('SELECT * FROM notification_logs ORDER BY created_at DESC');
      data = result.rows;
    } else if (type === 'analytics') {
      // Re-use logic or fetch simplified data
      const logsResult = await query('SELECT * FROM notification_logs');
      data = logsResult.rows; 
    } else {
      return res.status(400).json({ error: 'Unsupported type' });
    }
    await exportData(res, type, format, data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// NOTIFICATION DISPATCHING & QUEUE ORCHESTRATION ENGINE (SDK / CLIENT ENTRY)
// ----------------------------------------------------
app.post('/api/notifications/send', async (req, res) => {
  // Validate API Key authentication
  const apiKey = req.headers['x-api-key'] || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

  if (!apiKey) {
    return res.status(401).json({ error: 'API Key is required to send notifications. Include it in the X-API-Key header or Bearer Token.' });
  }

  try {
    // Lookup application
    const appResult = await query('SELECT * FROM applications WHERE api_key = $1', [apiKey]);
    if (appResult.rows.length === 0) {
      return res.status(401).json({ error: 'Forbidden: Invalid API Key.' });
    }
    const currentApp = appResult.rows[0];

    const { template: templateName, recipient, variables } = req.body;

    if (!templateName || !recipient) {
      return res.status(400).json({ error: 'Parameters "template" and "recipient" are required.' });
    }

    // Lookup template to find channel for backwards compatible response mapping
    const tempResult = await query('SELECT * FROM templates WHERE name = $1', [templateName]);
    if (tempResult.rows.length === 0) {
      return res.status(404).json({ error: `Template "${templateName}" not found.` });
    }
    const template = tempResult.rows[0];

    if (template.status !== 'published') {
      return res.status(400).json({ error: `Template "${templateName}" is in Draft status and cannot be dispatched.` });
    }

    // Lookup active provider for this channel to return correct metadata
    const provResult = await query('SELECT * FROM providers WHERE channel = $1 AND is_active = TRUE ORDER BY priority ASC LIMIT 1', [template.channel]);
    const activeProvider = provResult.rows[0] || { name: 'Active Provider Relay' };

    // Execute via microkernel Command Bus
    const commandBus = container.serviceDiscovery.resolve<any>('CommandBus');
    const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string;
    
    const result = await commandBus.execute(
      new SendNotificationCommand(currentApp.id, templateName, recipient, variables, idempotencyKey)
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      jobId: result.jobId,
      status: 'queued',
      channel: template.channel,
      provider: activeProvider.name,
      recipient
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
