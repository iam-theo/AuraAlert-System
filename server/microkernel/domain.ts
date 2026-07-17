/**
 * AuraAlert Event-Driven Microkernel Architecture
 * Domain Layer: Pure DDD entities, aggregate roots, domain events, and repository contracts.
 */

// ============================================================================
// 1. BASE BUILDING BLOCKS (DDD)
// ============================================================================

export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) return false;
    if (vo.props === undefined) return false;
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

export abstract class Entity<T> {
  public readonly id: string;
  protected readonly props: T;

  constructor(id: string, props: T) {
    this.id = id;
    this.props = props;
  }

  public equals(entity?: Entity<T>): boolean {
    if (entity === null || entity === undefined) return false;
    if (this === entity) return true;
    return this.id === entity.id;
  }
}

export interface IDomainEvent {
  occurredAt: Date;
  getEventData(): any;
}

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: IDomainEvent[] = [];

  get domainEvents(): IDomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(event: IDomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}

// ============================================================================
// 2. DOMAIN EVENTS DEFINITIONS
// ============================================================================

export class NotificationQueuedEvent implements IDomainEvent {
  public readonly occurredAt = new Date();
  constructor(
    public readonly notificationId: string,
    public readonly recipient: string,
    public readonly channel: string,
    public readonly templateName: string,
    public readonly priority: string
  ) {}

  getEventData() {
    return {
      notificationId: this.notificationId,
      recipient: this.recipient,
      channel: this.channel,
      templateName: this.templateName,
      priority: this.priority
    };
  }
}

export class ProviderDegradedEvent implements IDomainEvent {
  public readonly occurredAt = new Date();
  constructor(
    public readonly providerId: string,
    public readonly providerName: string,
    public readonly reason: string
  ) {}

  getEventData() {
    return { providerId: this.providerId, providerName: this.providerName, reason: this.reason };
  }
}

export class VaultSecretRotatedEvent implements IDomainEvent {
  public readonly occurredAt = new Date();
  constructor(public readonly secretKey: string, public readonly newVersion: number) {}

  getEventData() {
    return { secretKey: this.secretKey, newVersion: this.newVersion };
  }
}

export class CircuitBreakerTrippedEvent implements IDomainEvent {
  public readonly occurredAt = new Date();
  constructor(
    public readonly providerId: string,
    public readonly state: 'OPEN' | 'HALF-OPEN' | 'CLOSED',
    public readonly failureCount: number
  ) {}

  getEventData() {
    return { providerId: this.providerId, state: this.state, failureCount: this.failureCount };
  }
}

export class NotificationSentEvent implements IDomainEvent {
  public readonly occurredAt = new Date();
  constructor(
    public readonly notificationId: string,
    public readonly recipient: string,
    public readonly channel: string,
    public readonly templateName: string,
    public readonly providerUsed: string
  ) {}

  getEventData() {
    return {
      notificationId: this.notificationId,
      recipient: this.recipient,
      channel: this.channel,
      templateName: this.templateName,
      providerUsed: this.providerUsed
    };
  }
}

export class NotificationRetryEvent implements IDomainEvent {
  public readonly occurredAt = new Date();
  constructor(
    public readonly notificationId: string,
    public readonly recipient: string,
    public readonly channel: string,
    public readonly templateName: string,
    public readonly retryCount: number,
    public readonly errorMessage: string
  ) {}

  getEventData() {
    return {
      notificationId: this.notificationId,
      recipient: this.recipient,
      channel: this.channel,
      templateName: this.templateName,
      retryCount: this.retryCount,
      errorMessage: this.errorMessage
    };
  }
}

export class NotificationFailedEvent implements IDomainEvent {
  public readonly occurredAt = new Date();
  constructor(
    public readonly notificationId: string,
    public readonly recipient: string,
    public readonly channel: string,
    public readonly templateName: string,
    public readonly errorMessage: string
  ) {}

  getEventData() {
    return {
      notificationId: this.notificationId,
      recipient: this.recipient,
      channel: this.channel,
      templateName: this.templateName,
      errorMessage: this.errorMessage
    };
  }
}

// ============================================================================
// 3. AGGREGATES & ENTITIES
// ============================================================================

export interface UserProps {
  email: string;
  passwordHash: string;
  roleId: string;
}

export class UserAggregate extends AggregateRoot<UserProps> {
  get email(): string { return this.props.email; }
  get passwordHash(): string { return this.props.passwordHash; }
  get roleId(): string { return this.props.roleId; }

  public updatePassword(newHash: string): void {
    this.props.passwordHash = newHash;
  }
}

export interface ApplicationProps {
  name: string;
  apiKey: string;
  environment: string;
  rateLimit: number;
  webhookUrl: string | null;
  webhookSecret: string | null;
  webhookActive: boolean;
  branding: any;
}

export class ApplicationAggregate extends AggregateRoot<ApplicationProps> {
  get name(): string { return this.props.name; }
  get apiKey(): string { return this.props.apiKey; }
  get environment(): string { return this.props.environment; }
  get rateLimit(): number { return this.props.rateLimit; }
  get webhookUrl(): string | null { return this.props.webhookUrl; }
  get webhookSecret(): string | null { return this.props.webhookSecret; }
  get webhookActive(): boolean { return this.props.webhookActive; }
  get branding(): any { return this.props.branding; }

  public updateSettings(settings: Partial<ApplicationProps>): void {
    Object.assign(this.props, settings);
  }
}

export interface ProviderProps {
  name: string;
  channel: string;
  config: any;
  priority: number;
  isActive: boolean;
  healthStatus: string;
}

export class ProviderAggregate extends AggregateRoot<ProviderProps> {
  get name(): string { return this.props.name; }
  get channel(): string { return this.props.channel; }
  get config(): any { return this.props.config; }
  get priority(): number { return this.props.priority; }
  get isActive(): boolean { return this.props.isActive; }
  get healthStatus(): string { return this.props.healthStatus; }

  public toggle(active: boolean): void {
    this.props.isActive = active;
  }

  public updateHealth(status: string): void {
    this.props.healthStatus = status;
    if (status === 'degraded' || status === 'unhealthy') {
      this.addDomainEvent(new ProviderDegradedEvent(this.id, this.name, `System self-check updated health to: ${status}`));
    }
  }

  public updateConfig(config: any): void {
    this.props.config = { ...this.props.config, ...config };
  }
}

export interface TemplateProps {
  name: string;
  subject: string;
  content: string;
  channel: string;
  variables: string[];
  status: string;
  version: number;
}

export class TemplateAggregate extends AggregateRoot<TemplateProps> {
  get name(): string { return this.props.name; }
  get subject(): string { return this.props.subject; }
  get content(): string { return this.props.content; }
  get channel(): string { return this.props.channel; }
  get variables(): string[] { return this.props.variables; }
  get status(): string { return this.props.status; }
  get version(): number { return this.props.version; }

  public updateTemplate(subject: string, content: string, variables: string[]): void {
    this.props.subject = subject;
    this.props.content = content;
    this.props.variables = variables;
    this.props.version += 1;
  }
}

export interface NotificationLogProps {
  recipient: string;
  channel: string;
  templateName: string;
  variablesUsed: any;
  status: 'queued' | 'sent' | 'failed' | 'retry';
  providerUsed: string | null;
  retryCount: number;
  createdAt: Date;
  errorMessage?: string | null;
}

export class NotificationLogAggregate extends AggregateRoot<NotificationLogProps> {
  get recipient(): string { return this.props.recipient; }
  get channel(): string { return this.props.channel; }
  get templateName(): string { return this.props.templateName; }
  get variablesUsed(): any { return this.props.variablesUsed; }
  get status(): string { return this.props.status; }
  get providerUsed(): string | null { return this.props.providerUsed; }
  get retryCount(): number { return this.props.retryCount; }
  get createdAt(): Date { return this.props.createdAt; }
  get errorMessage(): string | null | undefined { return this.props.errorMessage; }

  public markSent(provider: string): void {
    this.props.status = 'sent';
    this.props.providerUsed = provider;
    this.addDomainEvent(new NotificationSentEvent(this.id, this.recipient, this.channel, this.templateName, provider));
  }

  public incrementRetry(reason: string): void {
    this.props.status = 'retry';
    this.props.retryCount += 1;
    this.props.errorMessage = reason;
    this.addDomainEvent(new NotificationRetryEvent(this.id, this.recipient, this.channel, this.templateName, this.props.retryCount, reason));
  }

  public markFailed(reason: string): void {
    this.props.status = 'failed';
    this.props.errorMessage = reason;
    this.addDomainEvent(new NotificationFailedEvent(this.id, this.recipient, this.channel, this.templateName, reason));
  }
}

export interface SecretProps {
  secretValue: string;
  description: string;
  version: number;
  updatedAt: string;
}

export class SecretAggregate extends AggregateRoot<SecretProps> {
  get secretValue(): string { return this.props.secretValue; }
  get description(): string { return this.props.description; }
  get version(): number { return this.props.version; }
  get updatedAt(): string { return this.props.updatedAt; }

  public rotate(newValue: string): void {
    this.props.secretValue = newValue;
    this.props.version += 1;
    this.props.updatedAt = new Date().toISOString();
    this.addDomainEvent(new VaultSecretRotatedEvent(this.id, this.version));
  }
}

export interface QueueStateProps {
  status: 'active' | 'paused';
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  processingTimeMs: number;
}

export class QueueStateAggregate extends AggregateRoot<QueueStateProps> {
  get name(): string { return this.id; }
  get status(): string { return this.props.status; }
  get waiting(): number { return this.props.waiting; }
  get active(): number { return this.props.active; }
  get completed(): number { return this.props.completed; }
  get failed(): number { return this.props.failed; }
  get delayed(): number { return this.props.delayed; }
  get processingTimeMs(): number { return this.props.processingTimeMs; }

  public pause(): void { this.props.status = 'paused'; }
  public resume(): void { this.props.status = 'active'; }
  public clear(): void {
    this.props.waiting = 0;
    this.props.active = 0;
  }
  public incrementWaiting(count: number = 1): void { this.props.waiting += count; }
  public processJob(executionTimeMs: number): void {
    if (this.props.waiting > 0) this.props.waiting -= 1;
    this.props.completed += 1;
    this.props.processingTimeMs = Math.round((this.props.processingTimeMs * 9 + executionTimeMs) / 10);
  }
  public failJob(): void {
    if (this.props.waiting > 0) this.props.waiting -= 1;
    this.props.failed += 1;
  }
}

// ============================================================================
// 4. CORE REPOSITORY CONTRACTS
// ============================================================================

export interface IUserRepository {
  findById(id: string): Promise<UserAggregate | null>;
  findByEmail(email: string): Promise<UserAggregate | null>;
  save(user: UserAggregate): Promise<void>;
  listAll(): Promise<UserAggregate[]>;
  delete(id: string): Promise<void>;
}

export interface IApplicationRepository {
  findById(id: string): Promise<ApplicationAggregate | null>;
  findByApiKey(apiKey: string): Promise<ApplicationAggregate | null>;
  save(app: ApplicationAggregate): Promise<void>;
  listAll(): Promise<ApplicationAggregate[]>;
  delete(id: string): Promise<void>;
}

export interface IProviderRepository {
  findById(id: string): Promise<ProviderAggregate | null>;
  save(provider: ProviderAggregate): Promise<void>;
  listAll(): Promise<ProviderAggregate[]>;
  listActiveByChannel(channel: string): Promise<ProviderAggregate[]>;
  delete(id: string): Promise<void>;
}

export interface ITemplateRepository {
  findById(id: string): Promise<TemplateAggregate | null>;
  findByName(name: string): Promise<TemplateAggregate | null>;
  save(template: TemplateAggregate): Promise<void>;
  listAll(): Promise<TemplateAggregate[]>;
  delete(id: string): Promise<void>;
}

export interface INotificationRepository {
  findById(id: string): Promise<NotificationLogAggregate | null>;
  save(log: NotificationLogAggregate): Promise<void>;
  listLogs(limit?: number): Promise<NotificationLogAggregate[]>;
}

export interface IVaultRepository {
  findByKey(key: string): Promise<SecretAggregate | null>;
  save(secret: SecretAggregate): Promise<void>;
  listAll(): Promise<SecretAggregate[]>;
}

export interface IQueueStateRepository {
  findByName(name: string): Promise<QueueStateAggregate | null>;
  save(queue: QueueStateAggregate): Promise<void>;
  listAll(): Promise<QueueStateAggregate[]>;
}

// ============================================================================
// 5. EVENT, COMMAND, AND QUERY MESSAGING BUS CONTRACTS (MICROKERNEL CORE)
// ============================================================================

export interface IEventBus {
  publish(event: IDomainEvent): void;
  subscribe(eventType: string, handler: (event: IDomainEvent) => void): void;
}

export interface ICommand {
  readonly commandType: string;
  readonly correlationId?: string;
}

export interface ICommandBus {
  registerHandler<T extends ICommand>(commandType: string, handler: (command: T) => Promise<any>): void;
  execute<T extends ICommand, R = any>(command: T): Promise<R>;
}

export interface IQuery {
  readonly queryType: string;
}

export interface IQueryBus {
  registerHandler<T extends IQuery>(queryType: string, handler: (query: T) => Promise<any>): void;
  ask<T extends IQuery, R = any>(query: T): Promise<R>;
}

// ============================================================================
// 6. UNIT OF WORK
// ============================================================================

export interface IUnitOfWork {
  startTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  executeWithTransaction<T>(work: () => Promise<T>): Promise<T>;
}
