import pg from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;

export async function initDatabase() {
  if (!dbUrl) {
    throw new Error('CRITICAL FAILURE: DATABASE_URL is not provided.');
  }

  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database successfully!');
    client.release();

    // Create tables dynamically
    await runSchemaMigrations();
  } catch (err: any) {
    console.error('❌ Failed to connect to PostgreSQL database.', err.message);
    throw err;
  }
}

async function runSchemaMigrations() {
  if (!pool) return;

  const queries = [
    // Roles Table
    `CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Permissions Table
    `CREATE TABLE IF NOT EXISTS permissions (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      code VARCHAR(255) NOT NULL UNIQUE,
      description TEXT
    )`,

    // Role Permissions Mapping
    `CREATE TABLE IF NOT EXISTS role_permissions (
      role_id VARCHAR(255) NOT NULL,
      permission_id VARCHAR(255) NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    )`,

    // Users Table
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Applications
    `CREATE TABLE IF NOT EXISTS applications (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      api_key VARCHAR(255) NOT NULL UNIQUE,
      environment VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Providers
    `CREATE TABLE IF NOT EXISTS providers (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      channel VARCHAR(50) NOT NULL,
      config JSONB NOT NULL,
      priority INT NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT FALSE,
      health_status VARCHAR(50) NOT NULL DEFAULT 'healthy',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Templates
    `CREATE TABLE IF NOT EXISTS templates (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      subject VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      channel VARCHAR(50) NOT NULL,
      variables TEXT[] NOT NULL DEFAULT '{}',
      status VARCHAR(50) NOT NULL DEFAULT 'published',
      version INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Notification Logs
    `CREATE TABLE IF NOT EXISTS notification_logs (
      id VARCHAR(255) PRIMARY KEY,
      recipient VARCHAR(255) NOT NULL,
      channel VARCHAR(50) NOT NULL,
      template_name VARCHAR(255) NOT NULL,
      variables_used JSONB NOT NULL DEFAULT '{}',
      status VARCHAR(50) NOT NULL,
      error_message TEXT,
      provider_used VARCHAR(255),
      retry_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Idempotency
    `CREATE TABLE IF NOT EXISTS idempotency_keys (
      key VARCHAR(255) PRIMARY KEY,
      result JSONB NOT NULL,
      expires_at BIGINT NOT NULL
    )`,
    // Distributed Locks
    `CREATE TABLE IF NOT EXISTS distributed_locks (
      key VARCHAR(255) PRIMARY KEY,
      owner VARCHAR(255) NOT NULL,
      expires_at BIGINT NOT NULL
    )`,
    // System Configs
    `CREATE TABLE IF NOT EXISTS system_configs (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Credential Vault
    `CREATE TABLE IF NOT EXISTS credential_vault (
      key VARCHAR(255) PRIMARY KEY,
      secret_value TEXT NOT NULL,
      description TEXT,
      version INT DEFAULT 1,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Event Registry
    `CREATE TABLE IF NOT EXISTS event_registry (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      app_id VARCHAR(255) NOT NULL,
      variables TEXT[] NOT NULL DEFAULT '{}',
      priority VARCHAR(50) DEFAULT 'normal',
      retry_policy JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,

    // Queue States
    `CREATE TABLE IF NOT EXISTS queue_states (
      name VARCHAR(50) PRIMARY KEY,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      waiting INT NOT NULL DEFAULT 0,
      active INT NOT NULL DEFAULT 0,
      completed INT NOT NULL DEFAULT 0,
      failed INT NOT NULL DEFAULT 0,
      delayed INT NOT NULL DEFAULT 0,
      processing_time_ms INT NOT NULL DEFAULT 0
    )`
  ];

  for (const query of queries) {
    await pool.query(query);
  }

  // Add columns if they don't exist
  const columnAdditions = [
    `ALTER TABLE applications ADD COLUMN IF NOT EXISTS rate_limit INT DEFAULT 100`,
    `ALTER TABLE applications ADD COLUMN IF NOT EXISTS webhook_url VARCHAR(255)`,
    `ALTER TABLE applications ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255)`,
    `ALTER TABLE applications ADD COLUMN IF NOT EXISTS webhook_active BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE applications ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'`,

    `ALTER TABLE providers ADD COLUMN IF NOT EXISTS uptime_pct INT DEFAULT 100`,
    `ALTER TABLE providers ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT 85`,
    `ALTER TABLE providers ADD COLUMN IF NOT EXISTS success_count INT DEFAULT 0`,
    `ALTER TABLE providers ADD COLUMN IF NOT EXISTS failure_count INT DEFAULT 0`,
    `ALTER TABLE providers ADD COLUMN IF NOT EXISTS active_connections INT DEFAULT 0`,

    `ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS latency_ms INT DEFAULT 0`,
    `ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(255)`,
    `ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS worker_picked_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS provider_accepted_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE`
  ];

  for (const query of columnAdditions) {
    try {
      await pool.query(query);
    } catch (e) {
      // Ignore errors if columns already exist or altering fails
    }
  }

  // Pre-seed default items if empty
  const appCheck = await pool.query('SELECT COUNT(*) FROM applications');
  if (parseInt(appCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding default applications table...');
    await pool.query(
      `INSERT INTO applications (id, name, api_key, environment) VALUES ($1, $2, $3, $4)`,
      ['demo-app-uuid-1111-2222', 'AuraAlert Demo App', 'aa_live_key_demo_9876543210', 'development']
    );
  }

  const provCheck = await pool.query('SELECT COUNT(*) FROM providers');
  if (parseInt(provCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding default providers table...');
    const defaultProviders = [
      ['prov-1', 'SMTP - Brevo Gateway', 'email', JSON.stringify({ host: 'smtp-relay.brevo.com', port: 587, sender: 'noreply@auraalert.com' }), 1, true, 'healthy'],
      ['prov-2', 'Twilio SMS Core', 'sms', JSON.stringify({ accountSid: 'ACxxxxx', fromNumber: '+123456789' }), 1, true, 'healthy'],
      ['prov-3', 'Twilio WhatsApp API', 'whatsapp', JSON.stringify({ accountSid: 'ACxxxxx', fromWhatsApp: 'whatsapp:+123456789' }), 1, true, 'healthy'],
      ['prov-4', 'AuraAlert In-App Hub', 'in_app', JSON.stringify({ maxHistory: 100 }), 1, true, 'healthy']
    ];
    for (const p of defaultProviders) {
      await pool.query(
        `INSERT INTO providers (id, name, channel, config, priority, is_active, health_status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        p
      );
    }
  }

  const tempCheck = await pool.query('SELECT COUNT(*) FROM templates');
  if (parseInt(tempCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding default notification templates...');
    const defaultTemplates = [
      ['temp-1', 'order.shipped', 'Great news! Your order #{{orderNumber}} has been shipped 🚚', 'Hi {{firstName}},\n\nYour order containing high-quality items has been processed and shipped. It is scheduled to arrive on {{deliveryDate}}.\n\nThank you for choosing AuraAlert!', 'email', ['firstName', 'orderNumber', 'deliveryDate'], 'published', 1],
      ['temp-2', 'otp.requested', 'Verification Code', 'Hello {{firstName}},\n\nYour AuraAlert verification code is: {{otpCode}}. This code will expire in 10 minutes. Please do not share it with anyone.', 'sms', ['firstName', 'otpCode'], 'published', 1],
      ['temp-3', 'task.assigned', 'New Task Assigned', 'Hi {{firstName}},\n\nYou have been assigned to the task: "{{taskTitle}}" in the project "{{projectName}}". Please review and update its status.\n\nBest, Team.', 'whatsapp', ['firstName', 'taskTitle', 'projectName'], 'published', 1]
    ];
    for (const t of defaultTemplates) {
      await pool.query(
        `INSERT INTO templates (id, name, subject, content, channel, variables, status, version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        t
      );
    }
  }

  const logsCheck = await pool.query('SELECT COUNT(*) FROM notification_logs');
  if (parseInt(logsCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding initial notification logs...');
    const demoLogs = [
      ['log-1', 'ceo@enterprise.com', 'email', 'order.shipped', JSON.stringify({ firstName: 'Alice', orderNumber: 'AA-4912', deliveryDate: 'July 20th, 2026' }), 'sent', 'SMTP - Brevo Gateway', 0, new Date(Date.now() - 3600000 * 2)],
      ['log-2', '+15550199', 'sms', 'otp.requested', JSON.stringify({ firstName: 'Bob', otpCode: '482910' }), 'sent', 'Twilio SMS Core', 0, new Date(Date.now() - 3600000 * 4)],
      ['log-3', 'developer@enterprise.com', 'email', 'order.shipped', JSON.stringify({ firstName: 'Charlie', orderNumber: 'AA-9911', deliveryDate: 'July 22nd, 2026' }), 'failed', 'SMTP - Brevo Gateway', 3, new Date(Date.now() - 3600000 * 5)],
      ['log-4', 'whatsapp:+15550222', 'whatsapp', 'task.assigned', JSON.stringify({ firstName: 'Diana', taskTitle: 'Implement Webhook Retries', projectName: 'AuraAlert v2' }), 'sent', 'Twilio WhatsApp API', 0, new Date(Date.now() - 3600000 * 12)],
      ['log-5', 'user@test.com', 'in_app', 'custom.alert', JSON.stringify({ title: 'System Maintenance', details: 'Scheduled maintenance tonight.' }), 'sent', 'AuraAlert In-App Hub', 0, new Date(Date.now() - 3600000 * 24)]
    ];
    for (const log of demoLogs) {
      await pool.query(
        `INSERT INTO notification_logs (id, recipient, channel, template_name, variables_used, status, provider_used, retry_count, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        log
      );
    }
  }

  const vaultCheck = await pool.query('SELECT COUNT(*) FROM credential_vault');
  if (parseInt(vaultCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding default credential vault items...');
    const defaultSecrets = [
      ['smtp_password', 'aa_vault_pwd_83901bc', 'Outbound relay SMTP gateway authentication password', 1],
      ['twilio_auth_token', 'aa_vault_token_48291f0a1c', 'Twilio API authorization handshake token', 2],
      ['database_url', dbUrl || '', 'Enterprise PostgreSQL single source of truth cluster URL', 1],
      ['redis_token', 'aa_vault_redis_99182ff03a', 'Redis memory cache & pub-sub transport key', 1],
      ['push_private_key', 'aa_vault_push_key_7718cc92', 'FCM Apple Push notification private PEM certificate key', 1]
    ];
    for (const s of defaultSecrets) {
      await pool.query(
        `INSERT INTO credential_vault (key, secret_value, description, version) VALUES ($1, $2, $3, $4)`,
        s
      );
    }
  }

  const eventCheck = await pool.query('SELECT COUNT(*) FROM event_registry');
  if (parseInt(eventCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding default events in event_registry...');
    const defaultEvents = [
      ['evt-1', 'order.shipped', 'demo-app-uuid-1111-2222', ['firstName', 'orderNumber', 'deliveryDate'], 'normal', JSON.stringify({ max_retries: 3, backoff_factor: 2 })],
      ['evt-2', 'otp.requested', 'demo-app-uuid-1111-2222', ['firstName', 'otpCode'], 'high', JSON.stringify({ max_retries: 5, backoff_factor: 1.5 })],
      ['evt-3', 'task.assigned', 'demo-app-uuid-1111-2222', ['firstName', 'taskTitle', 'projectName'], 'normal', JSON.stringify({ max_retries: 3, backoff_factor: 2 })]
    ];
    for (const e of defaultEvents) {
      await pool.query(
        `INSERT INTO event_registry (id, name, app_id, variables, priority, retry_policy) VALUES ($1, $2, $3, $4, $5, $6)`,
        e
      );
    }
  }

  const queueCheck = await pool.query('SELECT COUNT(*) FROM queue_states');
  if (parseInt(queueCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding default queues in queue_states...');
    const defaultQueues = [
      ['email', 'active', 0, 1, 4891, 24, 0, 120],
      ['sms', 'active', 0, 0, 3120, 12, 0, 85],
      ['whatsapp', 'active', 0, 0, 1894, 8, 0, 95],
      ['in_app', 'active', 0, 0, 12053, 2, 0, 15],
      ['retry', 'active', 1, 0, 450, 120, 2, 350],
      ['dlq', 'active', 14, 0, 0, 14, 0, 0]
    ];
    for (const q of defaultQueues) {
      await pool.query(
        `INSERT INTO queue_states (name, status, waiting, active, completed, failed, delayed, processing_time_ms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        q
      );
    }
  }

  // Pre-seed RBAC database tables
  const roleCheck = await pool.query('SELECT COUNT(*) FROM roles');
  if (parseInt(roleCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding roles...');
    await pool.query(`INSERT INTO roles (id, name, description) VALUES 
      ('role-admin', 'administrator', 'Full administrative access'),
      ('role-operator', 'operator', 'Operations management access'),
      ('role-viewer', 'viewer', 'Read-only access')`);
  }

  const permCheck = await pool.query('SELECT COUNT(*) FROM permissions');
  if (parseInt(permCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding permissions...');
    await pool.query(`INSERT INTO permissions (id, name, code, description) VALUES 
      ('perm-1', 'Manage Providers', 'MANAGE_PROVIDERS', 'Register, update, delete, toggle, and test providers'),
      ('perm-2', 'Manage Applications', 'MANAGE_APPLICATIONS', 'Create and delete applications'),
      ('perm-3', 'Manage Templates', 'MANAGE_TEMPLATES', 'Create, update, and publish templates'),
      ('perm-4', 'Manage Queues', 'MANAGE_QUEUES', 'Perform actions on message broker queues'),
      ('perm-5', 'Manage Vault', 'MANAGE_VAULT', 'View and rotate secrets in vault'),
      ('perm-6', 'Manage Events', 'MANAGE_EVENTS', 'Configure registry of message events'),
      ('perm-7', 'View Data', 'VIEW_DATA', 'Read-only telemetry dashboards and list listings')`);
  }

  const rolePermCheck = await pool.query('SELECT COUNT(*) FROM role_permissions');
  if (parseInt(rolePermCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding role_permissions mappings...');
    for (let i = 1; i <= 7; i++) {
      await pool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role-admin', 'perm-${i}')`);
    }
    const operatorPerms = ['perm-1', 'perm-3', 'perm-4', 'perm-6', 'perm-7'];
    for (const pId of operatorPerms) {
      await pool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role-operator', '${pId}')`);
    }
    await pool.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ('role-viewer', 'perm-7')`);
  }

  const userCheck = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(userCheck.rows[0].count) === 0) {
    console.log('🌱 Seeding users with secure bcrypt hashes...');
    await pool.query(`INSERT INTO users (id, email, password_hash, role_id) VALUES 
      ('user-1', 'TheoDesmon71@gmail.com', $1, 'role-admin'),
      ('user-2', 'operator@auraalert.com', $2, 'role-operator'),
      ('user-3', 'viewer@auraalert.com', $3, 'role-viewer')`, [
        bcrypt.hashSync('admin', 10),
        bcrypt.hashSync('operator', 10),
        bcrypt.hashSync('viewer', 10)
      ]);
  }
}

// Database Helpers
export async function query(text: string, params?: any[]) {
  if (!pool) {
    throw new Error('Database connection is not initialized');
  }
  return await pool.query(text, params);
}
