/**
 * AuraAlert Event-Driven Microkernel Architecture
 * Bootstrap Container: Coordinates Dependency Injection, Registers Command & Query handlers,
 * binds core Event listeners, and boots horizontal worker scaling.
 */

import {
  SQLUserRepository,
  SQLApplicationRepository,
  SQLProviderRepository,
  SQLTemplateRepository,
  SQLNotificationRepository,
  SQLVaultRepository,
  SQLQueueStateRepository,
  MicrokernelEventBus,
  MicrokernelCommandBus,
  MicrokernelQueryBus,
  RedisStreamsSimulator,
  DistributedLockManager,
  ProviderFactory,
  ServiceDiscovery,
  ConfigurationService,
  SecretsService,
  AuditService,
  FeatureFlagService
} from './infrastructure.js';

import { TelemetryService } from './services.js';

import {
  IdempotencyStore,
  SendNotificationHandler,
  RunQueueWorkerHandler,
  RotateSecretHandler,
  ToggleProviderHandler,
  BulkDispatchProcessor,
  HorizontalWorkerScalingSystem,
  SendNotificationCommand,
  RotateSecretCommand,
  ToggleProviderCommand
} from './application.js';

class MicrokernelContainer {
  public readonly serviceDiscovery = new ServiceDiscovery();
  private broadcastCallback?: (type: string, data: any) => void;

  public onBroadcast(cb: (type: string, data: any) => void): void {
    this.broadcastCallback = cb;
  }

  public async bootstrap(): Promise<void> {
    console.log('🚀 [Microkernel Container] Bootstrapping AuraAlert Clean microkernel...');

    // 1. Register Core Messaging Buses
    const eventBus = new MicrokernelEventBus();
    const commandBus = new MicrokernelCommandBus();
    const queryBus = new MicrokernelQueryBus();

    this.serviceDiscovery.register('EventBus', eventBus);
    this.serviceDiscovery.register('CommandBus', commandBus);
    this.serviceDiscovery.register('QueryBus', queryBus);

    // 2. Register Repositories
    const userRepo = new SQLUserRepository();
    const appRepo = new SQLApplicationRepository();
    const providerRepo = new SQLProviderRepository();
    const templateRepo = new SQLTemplateRepository();
    const notificationRepo = new SQLNotificationRepository();
    const vaultRepo = new SQLVaultRepository();
    const queueStateRepo = new SQLQueueStateRepository();

    this.serviceDiscovery.register('UserRepository', userRepo);
    this.serviceDiscovery.register('ApplicationRepository', appRepo);
    this.serviceDiscovery.register('ProviderRepository', providerRepo);
    this.serviceDiscovery.register('TemplateRepository', templateRepo);
    this.serviceDiscovery.register('NotificationRepository', notificationRepo);
    this.serviceDiscovery.register('VaultRepository', vaultRepo);
    this.serviceDiscovery.register('QueueStateRepository', queueStateRepo);

    // 3. Register Core Engines & Utilities
    const streamSimulator = new RedisStreamsSimulator();
    const lockManager = new DistributedLockManager();
    const providerFactory = new ProviderFactory();
    const idempotencyStore = new IdempotencyStore();

    this.serviceDiscovery.register('RedisStreams', streamSimulator);
    this.serviceDiscovery.register('LockManager', lockManager);
    this.serviceDiscovery.register('ProviderFactory', providerFactory);
    this.serviceDiscovery.register('IdempotencyStore', idempotencyStore);

    // 4. Register Auxiliary Microkernel Chassis Services
    const configService = new ConfigurationService();
    const secretsService = new SecretsService(vaultRepo);
    const auditService = new AuditService();
    const featureFlags = new FeatureFlagService();
    const telemetryService = new TelemetryService();

    this.serviceDiscovery.register('ConfigurationService', configService);
    this.serviceDiscovery.register('SecretsService', secretsService);
    this.serviceDiscovery.register('AuditService', auditService);
    this.serviceDiscovery.register('FeatureFlagService', featureFlags);
    this.serviceDiscovery.register('TelemetryService', telemetryService);

    // 5. Wire Up Command and Query Handlers
    const sendNotificationHandler = new SendNotificationHandler(
      appRepo,
      templateRepo,
      notificationRepo,
      queueStateRepo,
      streamSimulator,
      idempotencyStore,
      eventBus,
      featureFlags,
      auditService,
      configService,
      telemetryService
    );

    const runQueueWorkerHandler = new RunQueueWorkerHandler(
      notificationRepo,
      providerRepo,
      queueStateRepo,
      streamSimulator,
      lockManager,
      providerFactory,
      eventBus,
      featureFlags,
      auditService
    );

    const rotateSecretHandler = new RotateSecretHandler(
      vaultRepo,
      auditService,
      eventBus
    );

    const toggleProviderHandler = new ToggleProviderHandler(
      providerRepo,
      auditService
    );

    const bulkDispatchProcessor = new BulkDispatchProcessor(sendNotificationHandler);

    this.serviceDiscovery.register('SendNotificationHandler', sendNotificationHandler);
    this.serviceDiscovery.register('RunQueueWorkerHandler', runQueueWorkerHandler);
    this.serviceDiscovery.register('RotateSecretHandler', rotateSecretHandler);
    this.serviceDiscovery.register('ToggleProviderHandler', toggleProviderHandler);
    this.serviceDiscovery.register('BulkDispatchProcessor', bulkDispatchProcessor);

    // 6. Register Command Bus Executable Handlers
    commandBus.registerHandler('SendNotificationCommand', async (cmd: SendNotificationCommand) => {
      return await sendNotificationHandler.handle(cmd);
    });

    commandBus.registerHandler('RotateSecretCommand', async (cmd: RotateSecretCommand) => {
      return await rotateSecretHandler.handle(cmd);
    });

    commandBus.registerHandler('ToggleProviderCommand', async (cmd: ToggleProviderCommand) => {
      return await toggleProviderHandler.handle(cmd);
    });

    // 7. Wire Up and Spin Horizontal Workers scaling loops
    const horizontalWorkers = new HorizontalWorkerScalingSystem(runQueueWorkerHandler, configService);
    this.serviceDiscovery.register('HorizontalWorkerScalingSystem', horizontalWorkers);

    // Scale up to 3 worker threads by default to support parallel queue partitioning
    await horizontalWorkers.scaleTo(3);

    // 8. Wire Up Domain Event Subscriptions (Chassis level listeners)
    eventBus.subscribe('NotificationQueuedEvent', (evt) => {
      const data = evt.getEventData();
      console.log(`🔊 [Domain Event] NotificationQueuedEvent handled for job: ${data.notificationId} on channel [${data.channel}]`);
      if (this.broadcastCallback) {
        this.broadcastCallback('insert_log', {
          id: data.notificationId,
          recipient: data.recipient,
          channel: data.channel,
          template_name: data.templateName,
          variables_used: {},
          status: 'queued',
          provider_used: null,
          retry_count: 0,
          created_at: new Date().toISOString()
        });
      }
    });

    eventBus.subscribe('NotificationSentEvent', (evt) => {
      const data = evt.getEventData();
      console.log(`🔊 [Domain Event] NotificationSentEvent handled for job: ${data.notificationId}`);
      if (this.broadcastCallback) {
        this.broadcastCallback('update_log', {
          id: data.notificationId,
          status: 'sent',
          provider_used: data.providerUsed
        });
      }
    });

    eventBus.subscribe('NotificationRetryEvent', (evt) => {
      const data = evt.getEventData();
      console.log(`🔊 [Domain Event] NotificationRetryEvent handled for job: ${data.notificationId} (Retry #${data.retryCount})`);
      if (this.broadcastCallback) {
        this.broadcastCallback('update_log', {
          id: data.notificationId,
          status: 'retrying',
          retry_count: data.retryCount,
          error_message: data.errorMessage
        });
      }
    });

    eventBus.subscribe('NotificationFailedEvent', (evt) => {
      const data = evt.getEventData();
      console.log(`🔊 [Domain Event] NotificationFailedEvent handled for job: ${data.notificationId}`);
      if (this.broadcastCallback) {
        this.broadcastCallback('update_log', {
          id: data.notificationId,
          status: 'failed',
          error_message: data.errorMessage,
          retry_count: 3
        });
      }
    });

    eventBus.subscribe('CircuitBreakerTrippedEvent', (evt) => {
      const data = evt.getEventData();
      console.warn(`🛑 [Domain Event] CircuitBreakerTrippedEvent: Provider ${data.providerId} transitioned to ${data.state}.`);
    });

    eventBus.subscribe('VaultSecretRotatedEvent', (evt) => {
      const data = evt.getEventData();
      console.log(`🔑 [Domain Event] VaultSecretRotatedEvent: Secret key "${data.secretKey}" cycled to version: ${data.newVersion}`);
    });

    console.log('✨ [Microkernel Container] Bootstrap successful!');
  }
}

export const container = new MicrokernelContainer();
container.bootstrap().catch(console.error);
export default container;
