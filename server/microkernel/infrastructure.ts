/**
 * AuraAlert Event-Driven Microkernel Architecture
 * Infrastructure Layer: Implements Repository interfaces, Command/Query/Event Buses,
 * Redis Streams emulators, Distributed Locks, Circuit Breakers, and Auxiliary microservices.
 */

import { query } from '../db.js';
import {
  UserAggregate, IUserRepository,
  ApplicationAggregate, IApplicationRepository,
  ProviderAggregate, IProviderRepository,
  TemplateAggregate, ITemplateRepository,
  NotificationLogAggregate, INotificationRepository,
  SecretAggregate, IVaultRepository,
  QueueStateAggregate, IQueueStateRepository,
  IEventBus, IDomainEvent,
  ICommand, ICommandBus,
  IQuery, IQueryBus,
  IUnitOfWork
} from './domain.js';

// ============================================================================
// 1. REPOSITORIES IMPLEMENTATIONS
// ============================================================================

export class SQLUserRepository implements IUserRepository {
  async findById(id: string): Promise<UserAggregate | null> {
    const res = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new UserAggregate(r.id, { email: r.email, passwordHash: r.password_hash, roleId: r.role_id });
  }

  async findByEmail(email: string): Promise<UserAggregate | null> {
    const res = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new UserAggregate(r.id, { email: r.email, passwordHash: r.password_hash, roleId: r.role_id });
  }

  async save(user: UserAggregate): Promise<void> {
    const exist = await this.findById(user.id);
    if (exist) {
      await query('UPDATE users SET email = $1, password_hash = $2, role_id = $3 WHERE id = $4', [
        user.email, user.passwordHash, user.roleId, user.id
      ]);
    } else {
      await query('INSERT INTO users (id, email, password_hash, role_id) VALUES ($1, $2, $3, $4)', [
        user.id, user.email, user.passwordHash, user.roleId
      ]);
    }
  }

  async listAll(): Promise<UserAggregate[]> {
    const res = await query('SELECT * FROM users ORDER BY email ASC');
    return res.rows.map(r => new UserAggregate(r.id, { email: r.email, passwordHash: r.password_hash, roleId: r.role_id }));
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM users WHERE id = $1', [id]);
  }
}

export class SQLApplicationRepository implements IApplicationRepository {
  async findById(id: string): Promise<ApplicationAggregate | null> {
    const res = await query('SELECT * FROM applications WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new ApplicationAggregate(r.id, {
      name: r.name,
      apiKey: r.api_key,
      environment: r.environment,
      rateLimit: r.rate_limit,
      webhookUrl: r.webhook_url,
      webhookSecret: r.webhook_secret,
      webhookActive: r.webhook_active,
      branding: r.branding || {}
    });
  }

  async findByApiKey(apiKey: string): Promise<ApplicationAggregate | null> {
    const res = await query('SELECT * FROM applications WHERE api_key = $1', [apiKey]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new ApplicationAggregate(r.id, {
      name: r.name,
      apiKey: r.api_key,
      environment: r.environment,
      rateLimit: r.rate_limit,
      webhookUrl: r.webhook_url,
      webhookSecret: r.webhook_secret,
      webhookActive: r.webhook_active,
      branding: r.branding || {}
    });
  }

  async save(app: ApplicationAggregate): Promise<void> {
    const exist = await this.findById(app.id);
    if (exist) {
      await query(
        'UPDATE applications SET name = $1, api_key = $2, environment = $3, rate_limit = $4, webhook_url = $5, webhook_secret = $6, webhook_active = $7, branding = $8 WHERE id = $9',
        [app.name, app.apiKey, app.environment, app.rateLimit, app.webhookUrl, app.webhookSecret, app.webhookActive, JSON.stringify(app.branding), app.id]
      );
    } else {
      await query(
        'INSERT INTO applications (id, name, api_key, environment, rate_limit, webhook_url, webhook_secret, webhook_active, branding) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [app.id, app.name, app.apiKey, app.environment, app.rateLimit, app.webhookUrl, app.webhookSecret, app.webhookActive, JSON.stringify(app.branding)]
      );
    }
  }

  async listAll(): Promise<ApplicationAggregate[]> {
    const res = await query('SELECT * FROM applications ORDER BY name ASC');
    return res.rows.map(r => new ApplicationAggregate(r.id, {
      name: r.name,
      apiKey: r.api_key,
      environment: r.environment,
      rateLimit: r.rate_limit,
      webhookUrl: r.webhook_url,
      webhookSecret: r.webhook_secret,
      webhookActive: r.webhook_active,
      branding: r.branding || {}
    }));
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM applications WHERE id = $1', [id]);
  }
}

export class SQLProviderRepository implements IProviderRepository {
  async findById(id: string): Promise<ProviderAggregate | null> {
    const res = await query('SELECT * FROM providers WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new ProviderAggregate(r.id, {
      name: r.name,
      channel: r.channel,
      config: r.config || {},
      priority: r.priority || 1,
      isActive: r.is_active,
      healthStatus: r.health_status || 'healthy'
    });
  }

  async save(provider: ProviderAggregate): Promise<void> {
    const exist = await this.findById(provider.id);
    if (exist) {
      await query(
        'UPDATE providers SET name = $1, channel = $2, config = $3, priority = $4, is_active = $5, health_status = $6 WHERE id = $7',
        [provider.name, provider.channel, JSON.stringify(provider.config), provider.priority, provider.isActive, provider.healthStatus, provider.id]
      );
    } else {
      await query(
        'INSERT INTO providers (id, name, channel, config, priority, is_active, health_status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [provider.id, provider.name, provider.channel, JSON.stringify(provider.config), provider.priority, provider.isActive, provider.healthStatus]
      );
    }
  }

  async listAll(): Promise<ProviderAggregate[]> {
    const res = await query('SELECT * FROM providers ORDER BY priority ASC, name ASC');
    return res.rows.map(r => new ProviderAggregate(r.id, {
      name: r.name,
      channel: r.channel,
      config: r.config || {},
      priority: r.priority || 1,
      isActive: r.is_active,
      healthStatus: r.health_status || 'healthy'
    }));
  }

  async listActiveByChannel(channel: string): Promise<ProviderAggregate[]> {
    const res = await query('SELECT * FROM providers WHERE channel = $1 AND is_active = true ORDER BY priority ASC', [channel]);
    return res.rows.map(r => new ProviderAggregate(r.id, {
      name: r.name,
      channel: r.channel,
      config: r.config || {},
      priority: r.priority || 1,
      isActive: r.is_active,
      healthStatus: r.health_status || 'healthy'
    }));
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM providers WHERE id = $1', [id]);
  }
}

export class SQLTemplateRepository implements ITemplateRepository {
  async findById(id: string): Promise<TemplateAggregate | null> {
    const res = await query('SELECT * FROM templates WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new TemplateAggregate(r.id, {
      name: r.name,
      subject: r.subject,
      content: r.content,
      channel: r.channel,
      variables: r.variables || [],
      status: r.status || 'published',
      version: r.version || 1
    });
  }

  async findByName(name: string): Promise<TemplateAggregate | null> {
    const res = await query('SELECT * FROM templates WHERE name = $1', [name]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new TemplateAggregate(r.id, {
      name: r.name,
      subject: r.subject,
      content: r.content,
      channel: r.channel,
      variables: r.variables || [],
      status: r.status || 'published',
      version: r.version || 1
    });
  }

  async save(template: TemplateAggregate): Promise<void> {
    const exist = await this.findById(template.id);
    if (exist) {
      await query(
        'UPDATE templates SET name = $1, subject = $2, content = $3, channel = $4, variables = $5, status = $6, version = $7 WHERE id = $8',
        [template.name, template.subject, template.content, template.channel, template.variables, template.status, template.version, template.id]
      );
    } else {
      await query(
        'INSERT INTO templates (id, name, subject, content, channel, variables, status, version) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [template.id, template.name, template.subject, template.content, template.channel, template.variables, template.status, template.version]
      );
    }
  }

  async listAll(): Promise<TemplateAggregate[]> {
    const res = await query('SELECT * FROM templates ORDER BY name ASC');
    return res.rows.map(r => new TemplateAggregate(r.id, {
      name: r.name,
      subject: r.subject,
      content: r.content,
      channel: r.channel,
      variables: r.variables || [],
      status: r.status || 'published',
      version: r.version || 1
    }));
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM templates WHERE id = $1', [id]);
  }
}

export class SQLNotificationRepository implements INotificationRepository {
  async findById(id: string): Promise<NotificationLogAggregate | null> {
    const res = await query('SELECT * FROM notification_logs WHERE id = $1', [id]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new NotificationLogAggregate(r.id, {
      recipient: r.recipient,
      channel: r.channel,
      templateName: r.template_name,
      variablesUsed: r.variables_used || {},
      status: r.status,
      providerUsed: r.provider_used,
      retryCount: r.retry_count || 0,
      createdAt: new Date(r.created_at),
      errorMessage: r.error_message
    });
  }

  async save(log: NotificationLogAggregate): Promise<void> {
    const exist = await this.findById(log.id);
    if (exist) {
      await query(
        'UPDATE notification_logs SET recipient = $1, channel = $2, template_name = $3, variables_used = $4, status = $5, provider_used = $6, retry_count = $7, created_at = $8, error_message = $9 WHERE id = $10',
        [log.recipient, log.channel, log.templateName, JSON.stringify(log.variablesUsed), log.status, log.providerUsed, log.retryCount, log.createdAt.toISOString(), log.errorMessage, log.id]
      );
    } else {
      await query(
        'INSERT INTO notification_logs (id, recipient, channel, template_name, variables_used, status, provider_used, retry_count, created_at, error_message) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [log.id, log.recipient, log.channel, log.templateName, JSON.stringify(log.variablesUsed), log.status, log.providerUsed, log.retryCount, log.createdAt.toISOString(), log.errorMessage]
      );
    }
  }

  async listLogs(limit = 100): Promise<NotificationLogAggregate[]> {
    const res = await query('SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows.map(r => new NotificationLogAggregate(r.id, {
      recipient: r.recipient,
      channel: r.channel,
      templateName: r.template_name,
      variablesUsed: r.variables_used || {},
      status: r.status,
      providerUsed: r.provider_used,
      retryCount: r.retry_count || 0,
      createdAt: new Date(r.created_at),
      errorMessage: r.error_message
    }));
  }
}

export class SQLVaultRepository implements IVaultRepository {
  async findByKey(key: string): Promise<SecretAggregate | null> {
    const res = await query('SELECT * FROM credential_vault WHERE key = $1', [key]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new SecretAggregate(r.key, {
      secretValue: r.secret_value,
      description: r.description || '',
      version: r.version || 1,
      updatedAt: r.updated_at || new Date().toISOString()
    });
  }

  async save(secret: SecretAggregate): Promise<void> {
    const exist = await this.findByKey(secret.id);
    if (exist) {
      await query(
        'UPDATE credential_vault SET secret_value = $1, description = $2, version = $3, updated_at = $4 WHERE key = $5',
        [secret.secretValue, secret.description, secret.version, secret.updatedAt, secret.id]
      );
    } else {
      await query(
        'INSERT INTO credential_vault (key, secret_value, description, version, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [secret.id, secret.secretValue, secret.description, secret.version, secret.updatedAt]
      );
    }
  }

  async listAll(): Promise<SecretAggregate[]> {
    const res = await query('SELECT * FROM credential_vault ORDER BY key ASC');
    return res.rows.map(r => new SecretAggregate(r.key, {
      secretValue: r.secret_value,
      description: r.description || '',
      version: r.version || 1,
      updatedAt: r.updated_at || new Date().toISOString()
    }));
  }
}

export class SQLQueueStateRepository implements IQueueStateRepository {
  async findByName(name: string): Promise<QueueStateAggregate | null> {
    const res = await query('SELECT * FROM queue_states WHERE name = $1', [name]);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return new QueueStateAggregate(r.name, {
      status: r.status || 'active',
      waiting: r.waiting || 0,
      active: r.active || 0,
      completed: r.completed || 0,
      failed: r.failed || 0,
      delayed: r.delayed || 0,
      processingTimeMs: r.processing_time_ms || 100
    });
  }

  async save(queueState: QueueStateAggregate): Promise<void> {
    const exist = await this.findByName(queueState.id);
    if (exist) {
      await query(
        'UPDATE queue_states SET status = $1, waiting = $2, active = $3, completed = $4, failed = $5, delayed = $6, processing_time_ms = $7 WHERE name = $8',
        [queueState.status, queueState.waiting, queueState.active, queueState.completed, queueState.failed, queueState.delayed, queueState.processingTimeMs, queueState.id]
      );
    } else {
      await query(
        'INSERT INTO queue_states (name, status, waiting, active, completed, failed, delayed, processing_time_ms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [queueState.id, queueState.status, queueState.waiting, queueState.active, queueState.completed, queueState.failed, queueState.delayed, queueState.processingTimeMs]
      );
    }
  }

  async listAll(): Promise<QueueStateAggregate[]> {
    const res = await query('SELECT * FROM queue_states ORDER BY name ASC');
    return res.rows.map(r => new QueueStateAggregate(r.name, {
      status: r.status || 'active',
      waiting: r.waiting || 0,
      active: r.active || 0,
      completed: r.completed || 0,
      failed: r.failed || 0,
      delayed: r.delayed || 0,
      processingTimeMs: r.processing_time_ms || 100
    }));
  }
}

// ============================================================================
// 2. IN-MEMORY SYNCHRONOUS AND ASYNCHRONOUS MESSAGING BUSES
// ============================================================================

export class MicrokernelEventBus implements IEventBus {
  private subscribers = new Map<string, Array<(event: IDomainEvent) => void>>();

  publish(event: IDomainEvent): void {
    const typeName = event.constructor.name;
    const handlers = this.subscribers.get(typeName) || [];
    // Dispatch async to keep thread execution atomic
    setTimeout(() => {
      handlers.forEach(h => {
        try {
          h(event);
        } catch (err) {
          console.error(`[EventBus] Error handling event ${typeName}:`, err);
        }
      });
    }, 0);
  }

  subscribe(eventType: string, handler: (event: IDomainEvent) => void): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }
    this.subscribers.get(eventType)!.push(handler);
  }
}

export class MicrokernelCommandBus implements ICommandBus {
  private handlers = new Map<string, (command: any) => Promise<any>>();

  registerHandler<T extends ICommand>(commandType: string, handler: (command: T) => Promise<any>): void {
    this.handlers.set(commandType, handler);
  }

  async execute<T extends ICommand, R = any>(command: T): Promise<R> {
    const handler = this.handlers.get(command.commandType);
    if (!handler) {
      throw new Error(`No Command Handler registered for: ${command.commandType}`);
    }
    return await handler(command) as R;
  }
}

export class MicrokernelQueryBus implements IQueryBus {
  private handlers = new Map<string, (query: any) => Promise<any>>();

  registerHandler<T extends IQuery>(queryType: string, handler: (query: T) => Promise<any>): void {
    this.handlers.set(queryType, handler);
  }

  async ask<T extends IQuery, R = any>(query: T): Promise<R> {
    const handler = this.handlers.get(query.queryType);
    if (!handler) {
      throw new Error(`No Query Handler registered for: ${query.queryType}`);
    }
    return await handler(query) as R;
  }
}

// ============================================================================
// 3. SECURE REDIS STREAMS EMULATOR (WITH CONSUMER GROUPS)
// ============================================================================

export interface StreamMessage {
  id: string; // ID format: timestamps-index (e.g. 17842433-0)
  payload: any;
  acked: boolean;
  consumedBy?: string;
}

export class RedisStreamsSimulator {
  private streams = new Map<string, StreamMessage[]>();
  private offsets = new Map<string, string>(); // streamKey: lastDeliveredId

  async xadd(stream: string, payload: any): Promise<string> {
    if (!this.streams.has(stream)) {
      this.streams.set(stream, []);
    }
    const list = this.streams.get(stream)!;
    const msgId = `${Date.now()}-${list.length}`;
    const message: StreamMessage = { id: msgId, payload, acked: false };
    list.push(message);
    return msgId;
  }

  async xread(stream: string, count = 10): Promise<StreamMessage[]> {
    const list = this.streams.get(stream) || [];
    const lastId = this.offsets.get(stream) || '0-0';
    
    const unread = list.filter(m => m.id > lastId);
    const slice = unread.slice(0, count);
    if (slice.length > 0) {
      this.offsets.set(stream, slice[slice.length - 1].id);
    }
    return slice;
  }

  async xack(stream: string, messageId: string): Promise<boolean> {
    const list = this.streams.get(stream) || [];
    const found = list.find(m => m.id === messageId);
    if (found) {
      found.acked = true;
      return true;
    }
    return false;
  }

  getPending(stream: string): StreamMessage[] {
    return (this.streams.get(stream) || []).filter(m => !m.acked);
  }
}

// ============================================================================
// 4. DISTRIBUTED LOCK ENGINE
// ============================================================================

export class DistributedLockManager {
  private locks = new Map<string, { owner: string; expiresAt: number }>();

  async acquire(key: string, owner: string, ttlMs = 5000): Promise<boolean> {
    const now = Date.now();
    const existing = this.locks.get(key);
    
    if (existing && existing.expiresAt > now) {
      if (existing.owner === owner) {
        // Re-entrant lock
        existing.expiresAt = now + ttlMs;
        return true;
      }
      return false; // locked
    }
    
    this.locks.set(key, { owner, expiresAt: now + ttlMs });
    return true;
  }

  async release(key: string, owner: string): Promise<boolean> {
    const existing = this.locks.get(key);
    if (existing && existing.owner === owner) {
      this.locks.delete(key);
      return true;
    }
    return false;
  }
}

// ============================================================================
// 5. RESILIENT CIRCUIT BREAKER SYSTEM (FOR DISPATCH OUTLET PROTECTION)
// ============================================================================

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF-OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastStateChange: number = Date.now();
  private readonly threshold = 3;
  private readonly cooldownMs = 10000; // 10s cooldown before self-healing

  constructor(
    public readonly providerId: string,
    private readonly onStateChange?: (state: 'CLOSED' | 'OPEN' | 'HALF-OPEN', failures: number) => void
  ) {}

  public execute<T>(action: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastStateChange > this.cooldownMs) {
        this.transitionTo('HALF-OPEN');
      } else {
        throw new Error(`[CircuitBreaker] Provider ${this.providerId} interface is offline (OPEN). Dropping packet to prevent worker exhaustion.`);
      }
    }

    return action()
      .then(res => {
        if (this.state === 'HALF-OPEN' || this.state === 'OPEN') {
          this.transitionTo('CLOSED');
        }
        return res;
      })
      .catch(err => {
        this.failureCount++;
        if (this.failureCount >= this.threshold && this.state !== 'OPEN') {
          this.transitionTo('OPEN');
        }
        throw err;
      });
  }

  private transitionTo(newState: 'CLOSED' | 'OPEN' | 'HALF-OPEN'): void {
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === 'CLOSED') {
      this.failureCount = 0;
    }
    if (this.onStateChange) {
      this.onStateChange(newState, this.failureCount);
    }
  }

  public getState() {
    return this.state;
  }
}

// ============================================================================
// 6. PROGRAMMATIC PROVIDER FACTORY (MOCK DISPATCH CONDUIT)
// ============================================================================

export interface IDispatcher {
  send(recipient: string, subject: string, content: string): Promise<{ success: boolean; latencyMs: number; error?: string }>;
}

export class ProviderFactory {
  createDispatcher(providerName: string, channel: string): IDispatcher {
    return {
      send: async (recipient: string, subject: string, content: string) => {
        const latencyMs = Math.floor(Math.random() * 200) + 40;
        await new Promise(resolve => setTimeout(resolve, latencyMs));
        
        // Simulating highly descriptive, probabilistic network transport layer outcomes
        const isSuccess = Math.random() > 0.10; // 90% success rate
        if (isSuccess) {
          return { success: true, latencyMs };
        } else {
          return { success: false, latencyMs, error: `Handshake packet timed out on ${providerName} transit carrier node.` };
        }
      }
    };
  }
}

// ============================================================================
// 7. CORE AUXILIARY MICROKERNEL SERVICES (MICROKERNEL CHASSIS)
// ============================================================================

export class ServiceDiscovery {
  private services = new Map<string, any>();

  register(serviceName: string, instance: any): void {
    this.services.set(serviceName, instance);
  }

  resolve<T>(serviceName: string): T {
    const s = this.services.get(serviceName);
    if (!s) throw new Error(`ServiceDiscovery failed to resolve service: ${serviceName}`);
    return s as T;
  }
}

export class ConfigurationService {
  private config = new Map<string, any>([
    ['worker_interval_ms', 2000],
    ['max_bulk_batch_size', 50],
    ['rate_limit_window_seconds', 60],
    ['default_max_retries', 3],
    ['backoff_factor', 2]
  ]);

  get<T>(key: string): T {
    return this.config.get(key) as T;
  }

  set(key: string, value: any): void {
    this.config.set(key, value);
  }
}

export class SecretsService {
  constructor(private readonly vaultRepo: IVaultRepository) {}

  async getSecret(key: string): Promise<string> {
    const sec = await this.vaultRepo.findByKey(key);
    if (!sec) throw new Error(`Secret key "${key}" not found in Credential Vault.`);
    return sec.secretValue;
  }

  async rotateSecret(key: string, newValue: string): Promise<void> {
    const sec = await this.vaultRepo.findByKey(key);
    if (sec) {
      sec.rotate(newValue);
      await this.vaultRepo.save(sec);
    }
  }
}

export class AuditService {
  private audits: any[] = [];

  log(actor: string, action: string, resource: string, details: any): void {
    const audit = {
      timestamp: new Date().toISOString(),
      actor,
      action,
      resource,
      details
    };
    this.audits.push(audit);
    console.log(`[AuditLog] [${audit.timestamp}] Actor: ${actor} | Action: ${action} | Resource: ${resource}`);
  }

  listLogs(): any[] {
    return this.audits;
  }
}

export class FeatureFlagService {
  private flags = new Map<string, boolean>([
    ['is_ai_suggestions_enabled', true],
    ['is_dlq_retries_enabled', true],
    ['rate_limiting_active', true],
    ['circuit_breaker_active', true],
    ['distributed_lock_enforced', true]
  ]);

  isEnabled(flag: string): boolean {
    return this.flags.get(flag) ?? false;
  }

  setFlag(flag: string, value: boolean): void {
    this.flags.set(flag, value);
  }
}

// ============================================================================
// 8. SQL UNIT OF WORK IMPLEMENTATION
// ============================================================================

export class SQLUnitOfWork implements IUnitOfWork {
  async startTransaction(): Promise<void> {
    await query('BEGIN');
  }

  async commit(): Promise<void> {
    await query('COMMIT');
  }

  async rollback(): Promise<void> {
    await query('ROLLBACK');
  }

  async executeWithTransaction<T>(work: () => Promise<T>): Promise<T> {
    await this.startTransaction();
    try {
      const res = await work();
      await this.commit();
      return res;
    } catch (err) {
      await this.rollback();
      throw err;
    }
  }
}
