import pg from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let isInMemoryFallback = false;

// In-Memory fallback store
const memoryDb = {
  applications: [] as any[],
  providers: [] as any[],
  templates: [] as any[],
  notification_logs: [] as any[],
  system_configs: [] as any[],
  credential_vault: [] as any[],
  event_registry: [] as any[],
  queue_states: [] as any[],
  users: [] as any[],
  roles: [] as any[],
  permissions: [] as any[],
  role_permissions: [] as any[],
};

// Seed initial in-memory data
const seedInMemoryData = () => {
  const defaultApp = {
    id: 'demo-app-uuid-1111-2222',
    name: 'AuraAlert Demo App',
    api_key: 'aa_live_key_demo_9876543210',
    environment: 'development',
    created_at: new Date().toISOString(),
    rate_limit: 150,
    webhook_url: 'https://api.enterprise.com/v1/webhooks/aura',
    webhook_secret: 'whsec_demo_9876543210abc',
    webhook_active: true,
    branding: {
      primaryColor: '#6366f1',
      senderName: 'AuraAlert Enterprise Relay'
    }
  };
  memoryDb.applications.push(defaultApp);

  const defaultProviders = [
    {
      id: 'prov-1',
      name: 'SMTP - Brevo Gateway',
      channel: 'email',
      config: { host: 'smtp-relay.brevo.com', port: 587, sender: 'noreply@auraalert.com' },
      priority: 1,
      is_active: true,
      health_status: 'healthy',
      created_at: new Date().toISOString(),
      uptime_pct: 99,
      latency_ms: 120,
      success_count: 4891,
      failure_count: 24,
      active_connections: 5
    },
    {
      id: 'prov-2',
      name: 'Twilio SMS Core',
      channel: 'sms',
      config: { accountSid: 'ACxxxxx', fromNumber: '+123456789' },
      priority: 1,
      is_active: true,
      health_status: 'healthy',
      created_at: new Date().toISOString(),
      uptime_pct: 100,
      latency_ms: 85,
      success_count: 3120,
      failure_count: 12,
      active_connections: 8
    },
    {
      id: 'prov-3',
      name: 'Twilio WhatsApp API',
      channel: 'whatsapp',
      config: { accountSid: 'ACxxxxx', fromWhatsApp: 'whatsapp:+123456789' },
      priority: 1,
      is_active: true,
      health_status: 'healthy',
      created_at: new Date().toISOString(),
      uptime_pct: 98,
      latency_ms: 95,
      success_count: 1894,
      failure_count: 8,
      active_connections: 3
    },
    {
      id: 'prov-4',
      name: 'AuraAlert In-App Hub',
      channel: 'in_app',
      config: { maxHistory: 100 },
      priority: 1,
      is_active: true,
      health_status: 'healthy',
      created_at: new Date().toISOString(),
      uptime_pct: 100,
      latency_ms: 15,
      success_count: 12053,
      failure_count: 2,
      active_connections: 45
    }
  ];
  memoryDb.providers.push(...defaultProviders);

  const defaultTemplates = [
    {
      id: 'temp-1',
      name: 'order.shipped',
      subject: 'Great news! Your order #{{orderNumber}} has been shipped 🚚',
      content: 'Hi {{firstName}},\n\nYour order containing high-quality items has been processed and shipped. It is scheduled to arrive on {{deliveryDate}}.\n\nThank you for choosing AuraAlert!',
      channel: 'email',
      variables: ['firstName', 'orderNumber', 'deliveryDate'],
      status: 'published',
      version: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'temp-2',
      name: 'otp.requested',
      subject: 'Verification Code',
      content: 'Hello {{firstName}},\n\nYour AuraAlert verification code is: {{otpCode}}. This code will expire in 10 minutes. Please do not share it with anyone.',
      channel: 'sms',
      variables: ['firstName', 'otpCode'],
      status: 'published',
      version: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'temp-3',
      name: 'task.assigned',
      subject: 'New Task Assigned',
      content: 'Hi {{firstName}},\n\nYou have been assigned to the task: "{{taskTitle}}" in the project "{{projectName}}". Please review and update its status.\n\nBest, Team.',
      channel: 'whatsapp',
      variables: ['firstName', 'taskTitle', 'projectName'],
      status: 'published',
      version: 1,
      created_at: new Date().toISOString(),
    }
  ];
  memoryDb.templates.push(...defaultTemplates);

  // Default metrics logs
  const logs = [
    {
      id: 'log-1',
      recipient: 'ceo@enterprise.com',
      channel: 'email',
      template_name: 'order.shipped',
      variables_used: { firstName: 'Alice', orderNumber: 'AA-4912', deliveryDate: 'July 20th, 2026' },
      status: 'sent',
      provider_used: 'SMTP - Brevo Gateway',
      retry_count: 0,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      latency_ms: 120,
      correlation_id: 'corr_829a1b2c3d4e5f',
      queued_at: new Date(Date.now() - 3600000 * 2 - 120).toISOString(),
      worker_picked_at: new Date(Date.now() - 3600000 * 2 - 110).toISOString(),
      provider_accepted_at: new Date(Date.now() - 3600000 * 2 - 90).toISOString(),
      delivered_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'log-2',
      recipient: '+15550199',
      channel: 'sms',
      template_name: 'otp.requested',
      variables_used: { firstName: 'Bob', otpCode: '482910' },
      status: 'sent',
      provider_used: 'Twilio SMS Core',
      retry_count: 0,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      latency_ms: 85,
      correlation_id: 'corr_912f2a3b4c5d6e',
      queued_at: new Date(Date.now() - 3600000 * 4 - 85).toISOString(),
      worker_picked_at: new Date(Date.now() - 3600000 * 4 - 80).toISOString(),
      provider_accepted_at: new Date(Date.now() - 3600000 * 4 - 60).toISOString(),
      delivered_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'log-3',
      recipient: 'developer@enterprise.com',
      channel: 'email',
      template_name: 'order.shipped',
      variables_used: { firstName: 'Charlie', orderNumber: 'AA-9911', deliveryDate: 'July 22nd, 2026' },
      status: 'failed',
      error_message: 'SMTP Timeout: Connection closed by remote peer',
      provider_used: 'SMTP - Brevo Gateway',
      retry_count: 3,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      latency_ms: 5000,
      correlation_id: 'corr_102e3b4c5d6e7f',
      queued_at: new Date(Date.now() - 3600000 * 5 - 5000).toISOString(),
      worker_picked_at: new Date(Date.now() - 3600000 * 5 - 4990).toISOString(),
      provider_accepted_at: null,
      delivered_at: null
    },
    {
      id: 'log-4',
      recipient: 'whatsapp:+15550222',
      channel: 'whatsapp',
      template_name: 'task.assigned',
      variables_used: { firstName: 'Diana', taskTitle: 'Implement Webhook Retries', projectName: 'AuraAlert v2' },
      status: 'sent',
      provider_used: 'Twilio WhatsApp API',
      retry_count: 0,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      latency_ms: 95,
      correlation_id: 'corr_203f4a5b6c7d8e',
      queued_at: new Date(Date.now() - 3600000 * 12 - 95).toISOString(),
      worker_picked_at: new Date(Date.now() - 3600000 * 12 - 90).toISOString(),
      provider_accepted_at: new Date(Date.now() - 3600000 * 12 - 70).toISOString(),
      delivered_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 'log-5',
      recipient: 'user@test.com',
      channel: 'in_app',
      template_name: 'custom.alert',
      variables_used: { title: 'System Maintenance', details: 'Scheduled maintenance tonight at 02:00 UTC.' },
      status: 'sent',
      provider_used: 'AuraAlert In-App Hub',
      retry_count: 0,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      latency_ms: 15,
      correlation_id: 'corr_304e5b6c7d8e9f',
      queued_at: new Date(Date.now() - 3600000 * 24 - 15).toISOString(),
      worker_picked_at: new Date(Date.now() - 3600000 * 24 - 12).toISOString(),
      provider_accepted_at: new Date(Date.now() - 3600000 * 24 - 5).toISOString(),
      delivered_at: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];
  memoryDb.notification_logs.push(...logs);

  const defaultSecrets = [
    { key: 'smtp_password', secret_value: 'aa_vault_pwd_83901bc', description: 'Outbound relay SMTP gateway authentication password', version: 1, updated_at: new Date().toISOString() },
    { key: 'twilio_auth_token', secret_value: 'aa_vault_token_48291f0a1c', description: 'Twilio API authorization handshake token', version: 2, updated_at: new Date().toISOString() },
    { key: 'database_url', secret_value: dbUrl || 'postgresql://postgres:password@localhost:5432/auraalert', description: 'Enterprise PostgreSQL single source of truth cluster URL', version: 1, updated_at: new Date().toISOString() },
    { key: 'redis_token', secret_value: 'aa_vault_redis_99182ff03a', description: 'Redis memory cache & pub-sub transport key', version: 1, updated_at: new Date().toISOString() },
    { key: 'push_private_key', secret_value: 'aa_vault_push_key_7718cc92', description: 'FCM Apple Push notification private PEM certificate key', version: 1, updated_at: new Date().toISOString() },
    { key: 'gemini_api_key', secret_value: process.env.GEMINI_API_KEY || 'dummy-gemini-key-12345', description: 'Google Gemini Studio cognitive service client API Key', version: 1, updated_at: new Date().toISOString() }
  ];
  memoryDb.credential_vault.push(...defaultSecrets);

  const defaultEvents = [
    { id: 'evt-1', name: 'order.shipped', app_id: 'demo-app-uuid-1111-2222', variables: ['firstName', 'orderNumber', 'deliveryDate'], priority: 'normal', retry_policy: { max_retries: 3, backoff_factor: 2 }, created_at: new Date().toISOString() },
    { id: 'evt-2', name: 'otp.requested', app_id: 'demo-app-uuid-1111-2222', variables: ['firstName', 'otpCode'], priority: 'high', retry_policy: { max_retries: 5, backoff_factor: 1.5 }, created_at: new Date().toISOString() },
    { id: 'evt-3', name: 'task.assigned', app_id: 'demo-app-uuid-1111-2222', variables: ['firstName', 'taskTitle', 'projectName'], priority: 'normal', retry_policy: { max_retries: 3, backoff_factor: 2 }, created_at: new Date().toISOString() }
  ];
  memoryDb.event_registry.push(...defaultEvents);

  const defaultQueues = [
    { name: 'email', status: 'active', waiting: 0, active: 1, completed: 4891, failed: 24, delayed: 0, processing_time_ms: 120 },
    { name: 'sms', status: 'active', waiting: 0, active: 0, completed: 3120, failed: 12, delayed: 0, processing_time_ms: 85 },
    { name: 'whatsapp', status: 'active', waiting: 0, active: 0, completed: 1894, failed: 8, delayed: 0, processing_time_ms: 95 },
    { name: 'in_app', status: 'active', waiting: 0, active: 0, completed: 12053, failed: 2, delayed: 0, processing_time_ms: 15 },
    { name: 'retry', status: 'active', waiting: 1, active: 0, completed: 450, failed: 120, delayed: 2, processing_time_ms: 350 },
    { name: 'dlq', status: 'active', waiting: 14, active: 0, completed: 0, failed: 14, delayed: 0, processing_time_ms: 0 }
  ];
  memoryDb.queue_states.push(...defaultQueues);

  // Seed RBAC fallback data
  memoryDb.roles.push(
    { id: 'role-admin', name: 'administrator', description: 'Full administrative access' },
    { id: 'role-operator', name: 'operator', description: 'Operations management access' },
    { id: 'role-viewer', name: 'viewer', description: 'Read-only access' }
  );

  memoryDb.permissions.push(
    { id: 'perm-1', name: 'Manage Providers', code: 'MANAGE_PROVIDERS', description: 'Register, update, delete, toggle, and test providers' },
    { id: 'perm-2', name: 'Manage Applications', code: 'MANAGE_APPLICATIONS', description: 'Create and delete applications' },
    { id: 'perm-3', name: 'Manage Templates', code: 'MANAGE_TEMPLATES', description: 'Create, update, and publish templates' },
    { id: 'perm-4', name: 'Manage Queues', code: 'MANAGE_QUEUES', description: 'Perform actions on message broker queues' },
    { id: 'perm-5', name: 'Manage Vault', code: 'MANAGE_VAULT', description: 'View and rotate secrets in vault' },
    { id: 'perm-6', name: 'Manage Events', code: 'MANAGE_EVENTS', description: 'Configure registry of message events' },
    { id: 'perm-7', name: 'View Data', code: 'VIEW_DATA', description: 'Read-only telemetry dashboards and list listings' }
  );

  for (let i = 1; i <= 7; i++) {
    memoryDb.role_permissions.push({ role_id: 'role-admin', permission_id: `perm-${i}` });
  }
  ['perm-1', 'perm-3', 'perm-4', 'perm-6', 'perm-7'].forEach(pId => {
    memoryDb.role_permissions.push({ role_id: 'role-operator', permission_id: pId });
  });
  memoryDb.role_permissions.push({ role_id: 'role-viewer', permission_id: 'perm-7' });

  memoryDb.users.push(
    { id: 'user-1', email: 'TheoDesmon71@gmail.com', password_hash: bcrypt.hashSync('admin', 10), role_id: 'role-admin' },
    { id: 'user-2', email: 'operator@auraalert.com', password_hash: bcrypt.hashSync('operator', 10), role_id: 'role-operator' },
    { id: 'user-3', email: 'viewer@auraalert.com', password_hash: bcrypt.hashSync('viewer', 10), role_id: 'role-viewer' }
  );
};

// Start seeding
seedInMemoryData();

export async function initDatabase() {
  if (!dbUrl) {
    console.warn('⚠️ DATABASE_URL is not provided. Falling back to robust in-memory database storage.');
    isInMemoryFallback = true;
    return;
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
    console.error('❌ Failed to connect to PostgreSQL database. Falling back to in-memory database store.', err.message);
    isInMemoryFallback = true;
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
  if (isInMemoryFallback || !pool) {
    // Handle memory query
    return executeInMemoryQuery(text, params);
  }
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('Database query error, reverting to in-memory action:', err);
    return executeInMemoryQuery(text, params);
  }
}

// Helper to simulate basic SQL queries in Memory for complete robustness
function executeInMemoryQuery(text: string, params?: any[]): any {
  const norm = text.toLowerCase().trim();

  // MOCK USER AUTH / JOIN / PERMISSIONS
  if (norm.includes('from users u') && norm.includes('join roles r')) {
    const emailParam = params?.[0];
    const user = memoryDb.users.find(u => u.email === emailParam);
    if (user) {
      const role = memoryDb.roles.find(r => r.id === user.role_id);
      return { rows: [{ ...user, role_name: role ? role.name : 'viewer' }] };
    }
    return { rows: [] };
  }
  if (norm.includes('from role_permissions rp') && norm.includes('join permissions p')) {
    const roleIdParam = params?.[0];
    const rpMatches = memoryDb.role_permissions.filter(rp => rp.role_id === roleIdParam || (roleIdParam === 'role-admin' && rp.role_id === 'role-admin') || (roleIdParam === 'role-operator' && rp.role_id === 'role-operator') || (roleIdParam === 'role-viewer' && rp.role_id === 'role-viewer'));
    const rows = rpMatches.map(rp => {
      const perm = memoryDb.permissions.find(p => p.id === rp.permission_id);
      return { code: perm ? perm.code : '' };
    }).filter(r => r.code !== '');
    return { rows };
  }
  if (norm.includes('from roles') || norm.startsWith('select * from roles')) {
    return { rows: memoryDb.roles };
  }
  if (norm.includes('from permissions') || norm.startsWith('select * from permissions')) {
    return { rows: memoryDb.permissions };
  }
  if (norm.includes('from users') || norm.startsWith('select * from users')) {
    const rows = memoryDb.users.map(u => {
      const role = memoryDb.roles.find(r => r.id === u.role_id);
      return { ...u, role_name: role ? role.name : 'viewer' };
    });
    return { rows };
  }
  if (norm.startsWith('insert into users')) {
    const id = params?.[0] || `user-${Date.now()}`;
    const email = params?.[1];
    const password_hash = params?.[2];
    const role_id = params?.[3];
    const u = { id, email, password_hash, role_id, created_at: new Date().toISOString() };
    memoryDb.users.push(u);
    return { rows: [u] };
  }
  if (norm.startsWith('delete from users')) {
    const id = params?.[0];
    memoryDb.users = memoryDb.users.filter(u => u.id !== id);
    return { rows: [] };
  }

  // MOCK APPLICATIONS TABLE
  if (norm.startsWith('select count(*) from applications')) {
    return { rows: [{ count: memoryDb.applications.length.toString() }] };
  }
  if (norm.startsWith('select * from applications') || norm.includes('from applications')) {
    if (params && params[0] && norm.includes('api_key =')) {
      const app = memoryDb.applications.find(a => a.api_key === params[0]);
      return { rows: app ? [app] : [] };
    }
    return { rows: memoryDb.applications };
  }
  if (norm.startsWith('insert into applications')) {
    const app = {
      id: params ? params[0] : `app-${Date.now()}`,
      name: params ? params[1] : 'New Application',
      api_key: params ? params[2] : `aa_key_${Date.now()}`,
      environment: params ? params[3] : 'development',
      created_at: new Date().toISOString()
    };
    memoryDb.applications.push(app);
    return { rows: [app] };
  }
  if (norm.startsWith('delete from applications')) {
    const id = params ? params[0] : '';
    memoryDb.applications = memoryDb.applications.filter(a => a.id !== id);
    return { rows: [] };
  }

  // MOCK PROVIDERS TABLE
  if (norm.startsWith('select count(*) from providers')) {
    return { rows: [{ count: memoryDb.providers.length.toString() }] };
  }
  if (norm.includes('from providers')) {
    if (params && params[0] && norm.includes('id =')) {
      const prov = memoryDb.providers.find(p => p.id === params[0]);
      return { rows: prov ? [prov] : [] };
    }
    if (params && params[0] && norm.includes('channel =') && norm.includes('is_active =')) {
      const provs = memoryDb.providers.filter(p => p.channel === params[0] && p.is_active === params[1]);
      return { rows: provs };
    }
    return { rows: [...memoryDb.providers].sort((a, b) => a.priority - b.priority) };
  }
  if (norm.startsWith('insert into providers') || norm.includes('insert into providers')) {
    const p = {
      id: params ? params[0] : `prov-${Date.now()}`,
      name: params ? params[1] : 'Provider',
      channel: params ? params[2] : 'email',
      config: params ? (typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3]) : {},
      priority: params ? params[4] : 1,
      is_active: params ? params[5] : false,
      health_status: params ? params[6] : 'healthy',
      created_at: new Date().toISOString()
    };
    memoryDb.providers.push(p);
    return { rows: [p] };
  }
  if (norm.includes('update providers set')) {
    // Basic update parser
    if (norm.includes('is_active =') && norm.includes('id =')) {
      const active = params ? params[0] : false;
      const id = params ? params[1] : '';
      const p = memoryDb.providers.find(x => x.id === id);
      if (p) p.is_active = active;
      return { rows: p ? [p] : [] };
    }
    if (norm.includes('name =') && norm.includes('channel =')) {
      // Update full config
      const name = params?.[0];
      const channel = params?.[1];
      const configObj = params?.[2];
      const priority = params?.[3];
      const active = params?.[4];
      const health = params?.[5];
      const id = params?.[6];
      const p = memoryDb.providers.find(x => x.id === id);
      if (p) {
        p.name = name;
        p.channel = channel;
        p.config = typeof configObj === 'string' ? JSON.parse(configObj) : configObj;
        p.priority = priority;
        p.is_active = active;
        p.health_status = health;
      }
      return { rows: p ? [p] : [] };
    }
  }
  if (norm.startsWith('delete from providers')) {
    const id = params ? params[0] : '';
    memoryDb.providers = memoryDb.providers.filter(p => p.id !== id);
    return { rows: [] };
  }

  // MOCK TEMPLATES TABLE
  if (norm.startsWith('select count(*) from templates')) {
    return { rows: [{ count: memoryDb.templates.length.toString() }] };
  }
  if (norm.includes('from templates')) {
    if (params && params[0] && norm.includes('name =')) {
      const t = memoryDb.templates.find(x => x.name === params[0]);
      return { rows: t ? [t] : [] };
    }
    if (params && params[0] && norm.includes('id =')) {
      const t = memoryDb.templates.find(x => x.id === params[0]);
      return { rows: t ? [t] : [] };
    }
    return { rows: memoryDb.templates };
  }
  if (norm.startsWith('insert into templates')) {
    const t = {
      id: params ? params[0] : `temp-${Date.now()}`,
      name: params ? params[1] : 'Template',
      subject: params ? params[2] : 'Subject',
      content: params ? params[3] : 'Content',
      channel: params ? params[4] : 'email',
      variables: params ? params[5] : [],
      status: params ? params[6] : 'published',
      version: params ? params[7] : 1,
      created_at: new Date().toISOString()
    };
    memoryDb.templates.push(t);
    return { rows: [t] };
  }
  if (norm.includes('update templates set')) {
    const name = params?.[0];
    const subject = params?.[1];
    const content = params?.[2];
    const channel = params?.[3];
    const variables = params?.[4];
    const status = params?.[5];
    const version = params?.[6];
    const id = params?.[7];
    const t = memoryDb.templates.find(x => x.id === id);
    if (t) {
      t.name = name;
      t.subject = subject;
      t.content = content;
      t.channel = channel;
      t.variables = variables;
      t.status = status;
      t.version = version;
    }
    return { rows: t ? [t] : [] };
  }
  if (norm.startsWith('delete from templates')) {
    const id = params ? params[0] : '';
    memoryDb.templates = memoryDb.templates.filter(t => t.id !== id);
    return { rows: [] };
  }

  // MOCK LOGS TABLE
  if (norm.startsWith('select count(*) from notification_logs')) {
    return { rows: [{ count: memoryDb.notification_logs.length.toString() }] };
  }
  if (norm.includes('from notification_logs')) {
    // Return logs ordered by created_at desc
    const sorted = [...memoryDb.notification_logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rows: sorted };
  }
  if (norm.startsWith('insert into notification_logs') || norm.includes('insert into notification_logs')) {
    const log = {
      id: params ? params[0] : `log-${Date.now()}`,
      recipient: params ? params[1] : 'Recipient',
      channel: params ? params[2] : 'email',
      template_name: params ? params[3] : 'Template',
      variables_used: params ? (typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4]) : {},
      status: params ? params[5] : 'sent',
      error_message: params ? params[6] : null,
      provider_used: params ? params[7] : null,
      retry_count: params ? params[8] : 0,
      created_at: params ? (params[9] instanceof Date ? params[9].toISOString() : params[9]) : new Date().toISOString()
    };
    memoryDb.notification_logs.push(log);
    return { rows: [log] };
  }

  // MOCK SYSTEM CONFIGS
  if (norm.includes('from system_configs')) {
    return { rows: memoryDb.system_configs };
  }

  // MOCK CREDENTIAL VAULT
  if (norm.includes('from credential_vault')) {
    if (params && params[0] && norm.includes('key =')) {
      const sec = memoryDb.credential_vault.find(s => s.key === params[0]);
      return { rows: sec ? [sec] : [] };
    }
    return { rows: memoryDb.credential_vault };
  }
  if (norm.startsWith('insert into credential_vault') || norm.includes('insert into credential_vault')) {
    const key = params?.[0];
    const val = params?.[1];
    const desc = params?.[2];
    const ver = params?.[3] || 1;
    const existing = memoryDb.credential_vault.find(s => s.key === key);
    if (existing) {
      existing.secret_value = val;
      existing.description = desc;
      existing.version = existing.version + 1;
      existing.updated_at = new Date().toISOString();
      return { rows: [existing] };
    } else {
      const s = { key, secret_value: val, description: desc, version: ver, updated_at: new Date().toISOString() };
      memoryDb.credential_vault.push(s);
      return { rows: [s] };
    }
  }

  // MOCK EVENT REGISTRY
  if (norm.includes('from event_registry')) {
    return { rows: memoryDb.event_registry };
  }
  if (norm.startsWith('insert into event_registry') || norm.includes('insert into event_registry')) {
    const id = params?.[0] || `evt-${Date.now()}`;
    const name = params?.[1];
    const appId = params?.[2];
    const vars = params?.[3] || [];
    const priority = params?.[4] || 'normal';
    const retryPolicy = params?.[5] || { max_retries: 3, backoff_factor: 2 };
    const e = { id, name, app_id: appId, variables: vars, priority, retry_policy: retryPolicy, created_at: new Date().toISOString() };
    memoryDb.event_registry.push(e);
    return { rows: [e] };
  }

  // MOCK QUEUE STATES
  if (norm.includes('from queue_states')) {
    return { rows: memoryDb.queue_states };
  }
  if (norm.includes('update queue_states set')) {
    const name = params?.[1]; // Usually name is at the end of update where condition, let's look for name
    const status = params?.[0];
    const q = memoryDb.queue_states.find(x => x.name === name || x.name === params?.[0]);
    if (q) {
      if (norm.includes('status =')) {
        q.status = status;
      }
    }
    return { rows: q ? [q] : [] };
  }

  // MOCK UPDATES TO APPLICATIONS (Branding / Webhooks)
  if (norm.includes('update applications set')) {
    // Basic branding and webhook update simulation
    // Let's find application ID or API key to apply
    const app = memoryDb.applications[0]; // Apply to first one for mock stability
    if (app && params) {
      // If we are updating branding, we might have multiple fields
      if (norm.includes('branding =') || norm.includes('rate_limit =')) {
        app.rate_limit = params[0];
        app.webhook_url = params[1];
        app.webhook_active = params[2];
        app.branding = typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3];
      }
    }
    return { rows: app ? [app] : [] };
  }

  return { rows: [] };
}
