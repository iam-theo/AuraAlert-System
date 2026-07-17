/**
 * AuraAlert Event-Driven Microkernel Architecture
 * Application Layer: Command & Query handlers, horizontal worker engines, rate limiters,
 * idempotency checks, and batch dispatcher orchestration.
 */

import { RateLimiter, TelemetryService } from './services.js';
import {
  ICommand, IQuery, IEventBus, ICommandBus, IQueryBus,
  IApplicationRepository, IProviderRepository, ITemplateRepository,
  INotificationRepository, IQueueStateRepository, IVaultRepository,
  NotificationLogAggregate, QueueStateAggregate,
  NotificationQueuedEvent, CircuitBreakerTrippedEvent
} from './domain.js';

import {
  RedisStreamsSimulator,
  DistributedLockManager,
  CircuitBreaker,
  ProviderFactory,
  FeatureFlagService,
  AuditService,
  ConfigurationService
} from './infrastructure.js';

import crypto from 'crypto';

// ============================================================================
// 1. COMMAND & QUERY OBJECT DEFINITIONS
// ============================================================================

export class SendNotificationCommand implements ICommand {
  public readonly commandType = 'SendNotificationCommand';
  constructor(
    public readonly appId: string,
    public readonly templateName: string,
    public readonly recipient: string,
    public readonly variables: any,
    public readonly idempotencyKey?: string,
    public readonly correlationId?: string
  ) {}
}

export class RunQueueWorkerCommand implements ICommand {
  public readonly commandType = 'RunQueueWorkerCommand';
  constructor(public readonly workerId: string, public readonly correlationId?: string) {}
}

export class RotateSecretCommand implements ICommand {
  public readonly commandType = 'RotateSecretCommand';
  constructor(
    public readonly actor: string,
    public readonly secretKey: string,
    public readonly newValue?: string
  ) {}
}

export class ToggleProviderCommand implements ICommand {
  public readonly commandType = 'ToggleProviderCommand';
  constructor(
    public readonly actor: string,
    public readonly providerId: string,
    public readonly isActive: boolean
  ) {}
}

export class GetQueueMetricsQuery implements IQuery {
  public readonly queryType = 'GetQueueMetricsQuery';
}

export class GetAnalyticsQuery implements IQuery {
  public readonly queryType = 'GetAnalyticsQuery';
}

// ============================================================================
// 2. IDEMPOTENCY & EXACTLY-ONCE PROCESSING STORE
// ============================================================================

export class IdempotencyStore {
  private cache = new Map<string, { result: any; expiresAt: number }>();

  public get(key: string): any | null {
    const record = this.cache.get(key);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return record.result;
  }

  public set(key: string, result: any, ttlMs = 600000): void {
    this.cache.set(key, { result, expiresAt: Date.now() + ttlMs });
  }
}

// ============================================================================
// 3. APPLICATION LAYER HANDLERS
// ============================================================================

export class SendNotificationHandler {
  private rateLimiter = new RateLimiter();

  constructor(
    private readonly appRepo: IApplicationRepository,
    private readonly templateRepo: ITemplateRepository,
    private readonly notificationRepo: INotificationRepository,
    private readonly queueStateRepo: IQueueStateRepository,
    private readonly streamSimulator: RedisStreamsSimulator,
    private readonly idempotencyStore: IdempotencyStore,
    private readonly eventBus: IEventBus,
    private readonly featureFlags: FeatureFlagService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigurationService,
    private readonly telemetry: TelemetryService
  ) {}

  public async handle(command: SendNotificationCommand): Promise<{ success: boolean; jobId: string; error?: string }> {
    const { appId, templateName, recipient, variables, idempotencyKey, correlationId } = command;
    const traceId = correlationId || this.telemetry.createCorrelationId();

    this.telemetry.log('info', 'Handling SendNotificationCommand', { traceId, appId, templateName, recipient });

    // 1. Idempotency Checking (Exactly-Once Process Filter)
    if (idempotencyKey) {
      const existingResult = this.idempotencyStore.get(idempotencyKey);
      if (existingResult) {
        this.auditService.log('SYSTEM', 'DUPLICATE_TRIGGER_DROPPED', 'idempotency_key', { idempotencyKey });
        return { ...existingResult, jobId: existingResult.jobId + '_deduped' };
      }
    }

    // 2. Resolve Client Tenant Application
    const app = await this.appRepo.findById(appId);
    if (!app) {
      return { success: false, jobId: '', error: 'Unauthorized or unregistered client application ID.' };
    }

    // 3. Rate Limiting Check
    if (this.featureFlags.isEnabled('rate_limiting_active')) {
      const isAllowed = this.rateLimiter.isAllowed(appId, app.rateLimit);
      if (!isAllowed) {
        this.auditService.log('RATE_LIMITER', 'LIMIT_EXCEEDED', 'applications', { appId, limit: app.rateLimit });
        return { success: false, jobId: '', error: `Client API rate limit threshold reached (${app.rateLimit}req/min). Please back off.` };
      }
    }

    // 4. Resolve Template Registry
    const template = await this.templateRepo.findByName(templateName);
    if (!template) {
      return { success: false, jobId: '', error: `Template matching reference name "${templateName}" not found.` };
    }

    // 5. Partitioning Strategy: Route into specific transport queue partition (e.g. email, sms, push, whatsapp)
    const channel = template.channel;
    const jobId = `job-${crypto.randomBytes(4).toString('hex')}`;

    // Create Notification Log Aggregate
    const notification = new NotificationLogAggregate(jobId, {
      recipient,
      channel,
      templateName,
      variablesUsed: variables,
      status: 'queued',
      providerUsed: null,
      retryCount: 0,
      createdAt: new Date()
    });

    // 6. Save State and Publish Domain Event
    await this.notificationRepo.save(notification);

    // Queue State update
    const queueState = await this.queueStateRepo.findByName(channel);
    if (queueState) {
      queueState.incrementWaiting(1);
      await this.queueStateRepo.save(queueState);
    }

    // Append job to Redis Streams Emulator
    await this.streamSimulator.xadd(`stream:${channel}`, { jobId, recipient, variables, templateName });

    const result = { success: true, jobId };

    if (idempotencyKey) {
      this.idempotencyStore.set(idempotencyKey, result);
    }

    // Dispatch Domain Event
    this.eventBus.publish(new NotificationQueuedEvent(jobId, recipient, channel, templateName, 'normal'));
    this.auditService.log(app.name, 'QUEUE_NOTIFICATION', 'notification_logs', { jobId, channel, templateName });

    return result;
  }
}

export class RunQueueWorkerHandler {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(
    private readonly notificationRepo: INotificationRepository,
    private readonly providerRepo: IProviderRepository,
    private readonly queueStateRepo: IQueueStateRepository,
    private readonly streamSimulator: RedisStreamsSimulator,
    private readonly lockManager: DistributedLockManager,
    private readonly providerFactory: ProviderFactory,
    private readonly eventBus: IEventBus,
    private readonly featureFlags: FeatureFlagService,
    private readonly auditService: AuditService
  ) {}

  public async handle(command: RunQueueWorkerCommand): Promise<{ jobsProcessed: number }> {
    const { workerId } = command;
    let totalProcessed = 0;

    // Loop over partitions
    const partitions = ['email', 'sms', 'push', 'whatsapp'];

    for (const channel of partitions) {
      const queueState = await this.queueStateRepo.findByName(channel);
      if (queueState && queueState.status === 'paused') {
        continue; // Queue is paused dynamically
      }

      // Read a batch from Redis Streams Simulator (simulating a background dequeue)
      const streamKey = `stream:${channel}`;
      const messages = await this.streamSimulator.xread(streamKey, 2);

      for (const msg of messages) {
        const { jobId, recipient, variables, templateName } = msg.payload;

        // 1. Acquire Distributed Lock (Guarantees Exactly-Once & concurrency scaling control)
        const lockKey = `lock:job:${jobId}`;
        const hasLock = await this.lockManager.acquire(lockKey, workerId, 6000);
        if (!hasLock) {
          // Locked by another horizontal worker node, skip to next
          continue;
        }

        try {
          const log = await this.notificationRepo.findById(jobId);
          if (!log || log.status === 'sent') {
            await this.streamSimulator.xack(streamKey, msg.id);
            await this.lockManager.release(lockKey, workerId);
            continue;
          }

          // 2. Resolve highest priority carrier routing provider for this channel
          const activeProviders = await this.providerRepo.listActiveByChannel(channel);
          if (activeProviders.length === 0) {
            throw new Error(`No active carrier routing gateway resolved for "${channel}" dispatch.`);
          }
          const provider = activeProviders[0];

          // Initialize/get circuit breaker
          let cb = this.circuitBreakers.get(provider.id);
          if (!cb) {
            cb = new CircuitBreaker(provider.id, (state, fails) => {
              this.auditService.log('CIRCUIT_BREAKER', 'STATE_CHANGE', 'providers', { providerId: provider.id, state, fails });
              this.eventBus.publish(new CircuitBreakerTrippedEvent(provider.id, state, fails));
            });
            this.circuitBreakers.set(provider.id, cb);
          }

          // 3. Provider Throttling: Enforce rate limits on providers
          const delayMs = channel === 'sms' ? 200 : 50; // smooth SMS traffic
          await new Promise(r => setTimeout(r, delayMs));

          // 4. Executing with Circuit Breaker protections
          const dispatcher = this.providerFactory.createDispatcher(provider.name, channel);
          
          await cb.execute(async () => {
            const dispatchResult = await dispatcher.send(recipient, 'Alert', `Notification for ${recipient}`);
            if (!dispatchResult.success) {
              throw new Error(dispatchResult.error);
            }
            
            // Success
            log.markSent(provider.name);
            await this.notificationRepo.save(log);
            log.domainEvents.forEach(e => this.eventBus.publish(e));
            log.clearEvents();

            const qState = await this.queueStateRepo.findByName(channel);
            if (qState) {
              qState.processJob(dispatchResult.latencyMs);
              await this.queueStateRepo.save(qState);
            }
          });

          // Acknowledge the stream log
          await this.streamSimulator.xack(streamKey, msg.id);
          totalProcessed++;

        } catch (err: any) {
          console.error(`[Worker ${workerId}] Job processing exception on ${jobId}:`, err.message);
          
          // Retry logic (Unit of Work fail operations)
          const log = await this.notificationRepo.findById(jobId);
          if (log) {
            if (log.retryCount < 3) {
              log.incrementRetry(err.message);
              // re-trigger queue state metrics
              const qState = await this.queueStateRepo.findByName('retry');
              if (qState) {
                qState.incrementWaiting(1);
                await this.queueStateRepo.save(qState);
              }
            } else {
              // Move to Dead Letter Queue (DLQ)
              log.markFailed(`Exceeded retries. Final Cause: ${err.message}`);
              const qState = await this.queueStateRepo.findByName('dlq');
              if (qState) {
                qState.incrementWaiting(1);
                await this.queueStateRepo.save(qState);
              }
              await this.streamSimulator.xack(streamKey, msg.id); // discard from active stream
            }
            await this.notificationRepo.save(log);
            log.domainEvents.forEach(e => this.eventBus.publish(e));
            log.clearEvents();
          }

          const qState = await this.queueStateRepo.findByName(channel);
          if (qState) {
            qState.failJob();
            await this.queueStateRepo.save(qState);
          }

        } finally {
          // Release lock
          await this.lockManager.release(lockKey, workerId);
        }
      }
    }

    return { jobsProcessed: totalProcessed };
  }
}

export class RotateSecretHandler {
  constructor(
    private readonly vaultRepo: IVaultRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: IEventBus
  ) {}

  public async handle(command: RotateSecretCommand): Promise<void> {
    const { actor, secretKey, newValue } = command;
    const secret = await this.vaultRepo.findByKey(secretKey);
    if (!secret) {
      throw new Error(`Secret key "${secretKey}" does not exist in vault registry.`);
    }

    const rotatedValue = newValue || `aa_vault_rotated_${crypto.randomBytes(4).toString('hex')}`;
    secret.rotate(rotatedValue);
    await this.vaultRepo.save(secret);

    this.auditService.log(actor, 'ROTATE_SECRET_KEY', 'credential_vault', { key: secretKey, version: secret.version });
    // Domain events are automatically collected in Aggregate Root, we publish them
    secret.domainEvents.forEach(e => this.eventBus.publish(e));
    secret.clearEvents();
  }
}

export class ToggleProviderHandler {
  constructor(
    private readonly providerRepo: IProviderRepository,
    private readonly auditService: AuditService
  ) {}

  public async handle(command: ToggleProviderCommand): Promise<void> {
    const { actor, providerId, isActive } = command;
    const provider = await this.providerRepo.findById(providerId);
    if (!provider) {
      throw new Error(`Carrier provider mapping "${providerId}" not found.`);
    }

    provider.toggle(isActive);
    await this.providerRepo.save(provider);
    this.auditService.log(actor, 'TOGGLE_CARRIER_GATEWAY', 'providers', { providerId, isActive });
  }
}

// ============================================================================
// 4. BATCH & BULK DISPATCH PROCESSOR
// ============================================================================

export class BulkDispatchProcessor {
  constructor(private readonly sendNotificationHandler: SendNotificationHandler) {}

  async processBatch(requests: Array<{ template: string; recipient: string; variables: any }>, appId: string): Promise<any[]> {
    const batchPromises = requests.map(req => {
      const command = new SendNotificationCommand(
        appId,
        req.template,
        req.recipient,
        req.variables,
        `bulk-${appId}-${Date.now()}-${Math.random()}`
      );
      return this.sendNotificationHandler.handle(command);
    });

    return await Promise.all(batchPromises);
  }
}

// ============================================================================
// 5. HORIZONTAL WORKER SCALING MANAGER
// ============================================================================

export class HorizontalWorkerScalingSystem {
  private workers: string[] = [];
  private workerIntervals: NodeJS.Timeout[] = [];

  constructor(
    private readonly runQueueWorkerHandler: RunQueueWorkerHandler,
    private readonly configService: ConfigurationService
  ) {}

  public scaleTo(count: number): void {
    const currentCount = this.workers.length;
    console.log(`[Microkernel Worker Control] Scaling workers from ${currentCount} to ${count}...`);

    if (count > currentCount) {
      // Scale Up
      for (let i = currentCount; i < count; i++) {
        const workerId = `worker-node-${i + 1}`;
        this.workers.push(workerId);
        
        const intervalMs = this.configService.get<number>('worker_interval_ms') || 2000;
        const interval = setInterval(async () => {
          try {
            await this.runQueueWorkerHandler.handle(new RunQueueWorkerCommand(workerId));
          } catch (err) {
            // silent worker crashes
          }
        }, intervalMs);

        this.workerIntervals.push(interval);
      }
    } else if (count < currentCount) {
      // Scale Down
      const diff = currentCount - count;
      for (let i = 0; i < diff; i++) {
        const interval = this.workerIntervals.pop();
        if (interval) clearInterval(interval);
        this.workers.pop();
      }
    }
  }

  public getActiveWorkerCount(): number {
    return this.workers.length;
  }

  public getWorkersList(): string[] {
    return this.workers;
  }

  public shutdown(): void {
    this.workerIntervals.forEach(clearInterval);
    this.workerIntervals = [];
    this.workers = [];
  }
}
