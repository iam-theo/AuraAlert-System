# AuraAlert Enterprise Notification Orchestrator
## Product & Architectural Documentation

AuraAlert is an enterprise-grade notification orchestration gateway and telemetry dashboard designed to unify and rate-limit multi-channel client notification flows. It acts as an intelligent router between internal microservices and external notification brokers (SMTP, Twilio SMS, Apple/FCM Push, WhatsApp), providing complete visibility into queue backlogs, delivery failure rates, and sensitive provider credentials.

---

## 1. System Architecture & Traffic Workflow

AuraAlert organizes traffic through a distinct layered workflow, moving from programmatic client ingress to secure carrier dispatch:

```
                  ┌──────────────────────────────────────────────┐
                  │          Programmatic Ingress Client         │
                  └───────────────────────┬──────────────────────┘
                                          │
                        REST API POST / API-Key handshakes
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │             Event Ingestion Bus              │
                  │   (Validates priorities, payload schemas)    │
                  └───────────────────────┬──────────────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │           Intelligent Router &               │
                  │         Gemini Template Engine           │
                  └───────────────────────┬──────────────────────┘
                                          │
                     JSON variables & templates are merged
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │             Broker Queue Pipeline            │
                  │      (Active, Paused, Retry, or DLQ)         │
                  └───────────────────────┬──────────────────────┘
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │           Secure Credential Vault            │
                  │     (Privilege-Gated Access & Rotation)      │
                  └───────────────────────┬──────────────────────┘
                                          │
                      Access Token or SMTP Authentication handshake
                                          │
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │          Outbound Carrier Gateways           │
                  │     (SMTP Server, Twilio SMS, Firebase)      │
                  └──────────────────────────────────────────────┘
```

### Architectural Workflow Diagram
Below is the system architecture blueprint of AuraAlert:

![AuraAlert Architectural Blueprint](/src/assets/images/auraalert_architecture_1784243349454.jpg)

---

## 2. Core Operational Modules

### 2.1 Authentication & Role-Based Access Control (RBAC)
AuraAlert secures its operational boundaries using a industry-standard Role-Based Access Control (RBAC) mechanism:
* **Password Verification**: Raw user passwords are securely hashed and evaluated using **bcrypt** (`bcryptjs`) with a cost factor of 10 during registration and validation. For backward compatibility, the verification middleware retains a secure fallback to legacy SHA-256 digests.
* **Token Handshake**: Upon successful authentication, a stateless **JSON Web Token (JWT)** is signed containing the user ID, email, role, and precise permission scopes.
* **Role Gateways**:
  * `role-admin` (Administrator): Fully authorized to modify routes, clear queues, view and rotate API keys, and manage carrier relays.
  * `role-operator` (Operator): Empowered to trigger manual tests, pause/resume background brokers, and adjust template structures. Restricted from rotating enterprise secret keys.
  * `role-viewer` (Viewer): Granted read-only telemetry and route overview access. Blocked from invoking write endpoints or revealing raw vault secrets.
* **Granular Privilege Gates**: Tested server-side before execution:
  * `MANAGE_QUEUES`: Allows pausing, resuming, clearing, or flushing queue pipes.
  * `VIEW_SECRET_KEYS`: Governs decrypting or revealing masked credential secrets in the vault.
  * `ROTATE_SECRET_KEYS`: Governs trigger actions to cycle or update master handshake parameters.
  * `MANAGE_PROVIDERS`: Controls registration and de-registration of active delivery channels.

### 2.2 Dual-Storage Fallback Engine (PostgreSQL & In-Memory Store)
The system operates with an automated connection fallback.
* **Primary SQL Storage**: Uses the `pg` client to connect to a relational **PostgreSQL** instance to store tenant configuration data, system events, audit logs, and credential state.
* **Automatic In-Memory Fallback**: In the event that database configuration parameters (e.g. `DATABASE_URL`) are missing, invalid, or experience operational timeouts, the system automatically fallbacks to a thread-safe, hot-reloading Local In-Memory database.
* **Schema Schema Synchronization**: The local fallback schema accurately mimics the production database tables:
  * `users`: Identifiers, emails, bcrypt hashes, and associated role identifiers.
  * `applications`: Registered client tenants with rate limit thresholds and secure webhook fields.
  * `providers`: Carrier dispatch configuration records (active flag, priority indexes, configuration blobs).
  * `templates`: Notification content files with placeholder support.
  * `logs`: Exhaustive delivery logs containing timestamps, latency calculations, channel codes, and error trace messages.

### 2.3 Outbound Carrier Routing Gateways
Users can manage delivery gateways under the **Providers** control tab:
* **Active Channels**: Accommodates Email (SMTP relay), SMS (Twilio service), Push (FCM/Apple push notifications), and WhatsApp.
* **Prioritization & Routing**: Programmatically selects the highest priority active gateway for a specified communication channel.
* **Connection Diagnostics**: Administrators can dispatch a live ping diagnostic pack to evaluate SMTP handshakes, network delay times, and TLS configuration.
* **Operational Toggling**: Role-gated toggles permit instant enablement or disablement of individual carrier pipelines.

### 2.4 Broker Queue Management & Telemetry
Notification broker workers run continuously to process queued payloads:
* **Monitored Channels**: Keeps distinct telemetry queues for `email`, `sms`, `push`, `whatsapp`, and the `dlq` (Dead Letter Queue).
* **Broker Commands**:
  * **Pause/Resume**: Instantly freeze processing on a channel to resolve carrier issues without dropping active incoming client packets.
  * **Clear**: Purge pending backlogs during testing or operational incidents.
  * **Flush (DLQ)**: Retries and flushes failed payloads inside the Dead Letter Queue back into active workers.

### 2.5 Secure Credential Vault
Manages third-party authorization settings (e.g., SMTP server keys, Twilio handshakes) securely:
* **Masked Display**: Values are displayed as cryptographic mask strings (e.g., `••••••••••••`) unless unmasked by a user possessing `VIEW_SECRET_KEYS` privileges.
* **Key Rotation**: Cryptographically signs updated variables during key lifecycle updates, capturing modification logs.

### 2.6 Gemini AI & Markdown Template Engine
* **Templating Layouts**: Content templates support Markdown styling and flexible JSON object variables.
* **Gemini LLM Assistant**: Integrates with the official `@google/genai` library to allow operators to prompt Gemini models to generate formatted Markdown structures for specific alert use cases (e.g. system warnings, customer notifications).
* **Live Render Preview**: Real-time evaluation of placeholder rendering before template commit.

### 2.7 AuraAlert V2: Event-Driven Microkernel Architecture
AuraAlert has been fully refactored into a high-performance **Event-Driven Microkernel Architecture**. This modular blueprint decouples our API routers from core domain state transitions, ensuring massive scalability, resilience, and operational trace logs.

#### 2.7.1 Clean Architectural Layers
* **Domain Layer** (`/server/microkernel/domain.ts`): Houses pure domain aggregates (`UserAggregate`, `ApplicationAggregate`, `ProviderAggregate`, `TemplateAggregate`, `NotificationLogAggregate`, `SecretAggregate`, `QueueStateAggregate`), value objects, pure repository contracts, and core messaging bus contracts.
* **Infrastructure Layer** (`/server/microkernel/infrastructure.ts`): Implements SQL-backed repositories, in-memory messaging buses, a stateful Redis Streams emulator, a distributed locking manager, a circuit breaker system, a provider factory, and auxiliary services.
* **Application Layer** (`/server/microkernel/application.ts`): Coordinates command/query handlers, bulk/batch dispatchers, idempotency stores, and our horizontal background worker scale control system.
* **Bootstrap Container** (`/server/microkernel/container.ts`): Orchestrates Dependency Injection, registers messaging bus commands/queries, binds domain event handlers, and boots the microkernel.

#### 2.7.2 Event-Driven Messaging Core
The kernel communicates via decoupled synchronous and asynchronous buses:
* **Command Bus**: Directs write operations via typed commands (`SendNotificationCommand`, `RotateSecretCommand`, `ToggleProviderCommand`) to dedicated handlers.
* **Event Bus**: Coordinates domain events. When aggregate roots shift states, they accumulate typed domain events (`NotificationQueuedEvent`, `NotificationSentEvent`, `NotificationRetryEvent`, `NotificationFailedEvent`, `CircuitBreakerTrippedEvent`, `VaultSecretRotatedEvent`) that are dispatched asynchronously.
* **Query Bus**: Resolves system queries without side-effects.

#### 2.7.3 Resiliency & Advanced Flow Engines
* **Redis Streams Simulator**: Emulates high-throughput streaming. Ingestion commands append records to separate transport stream logs (`stream:email`, `stream:sms`, etc.) supporting offset markers and stream acknowledgement (`XACK`).
* **Distributed Locking Engine**: Prevents concurrency conflicts across multiple workers via atomic lock keys with strict Lease TTL expirations.
* **Idempotency & Exactly-Once Filters**: Protects against double-send actions. A rapid-access idempotency cache verifies inbound key signatures, returning duplicate responses without processing the pipelines again.
* **Resilient Outbound Circuit Breakers**: Protects against third-party API outages. If consecutive failures exceed three within a sliding window, the provider's circuit trips to `OPEN`, dropping subsequent requests until a cooldown (10s) passes, at which point it self-heals via `HALF-OPEN` trials.
* **Provider Throttling & Partitioning**: Distributes tasks across dedicated queues (`email`, `sms`, `push`, `whatsapp`), smoothing out bursts with channel-specific throttling delays.
* **Horizontal Worker Scaling System**: A programmatically scaled manager that orchestrates background threads (`worker-node-1`, `worker-node-2`, etc.) running on a strict interval. Under-the-hood, these workers pull tasks concurrently from Redis Streams, coordinating lock leases to process jobs exactly once.

---

## 3. Published OpenAPI Endpoint Specification

The application features an interactive, self-documenting **Swagger UI console** running at `/api-docs`. The specification implements the following routes:

### 3.1 Authentication
* `POST /api/auth/login`
  * **Purpose**: Establish user session.
  * **Validation**: Verifies bcrypt credentials. Returns signed JWT access token.

### 3.2 Applications
* `GET /api/applications`
  * **Purpose**: List registered tenant credentials.
* `POST /api/applications`
  * **Purpose**: Register a new API client system.
* `DELETE /api/applications/{id}`
  * **Purpose**: De-register client applications.
* `POST /api/applications/{id}/settings`
  * **Purpose**: Configure rate limits, webhooks, and custom tenant branding.

### 3.3 Carrier Providers
* `GET /api/providers`
  * **Purpose**: List all system gateways.
* `POST /api/providers`
  * **Purpose**: Create a new carrier route.
* `PUT /api/providers/{id}`
  * **Purpose**: Update specific routing credentials.
* `DELETE /api/providers/{id}`
  * **Purpose**: Remove provider from systems.
* `POST /api/providers/{id}/toggle`
  * **Purpose**: Activate/Deactivate specific gateway pipelines.
* `POST /api/providers/{id}/test`
  * **Purpose**: Dispatch test round-trip connection packets.
* `POST /api/providers/{id}/diagnostics`
  * **Purpose**: Evaluate transport layer health metrics.

### 3.4 Queue Telemetry & Action Control
* `GET /api/queues/status`
  * **Purpose**: Fetch current queue levels and worker loop indicators.
* `POST /api/queues/{name}/action`
  * **Purpose**: Pause, resume, clear, or flush queue pipelines.

### 3.5 Security Vault
* `GET /api/vault/secrets`
  * **Purpose**: List secure keys (masked by privilege gate).
* `POST /api/vault/secrets/rotate`
  * **Purpose**: Securely replace and cycle api key configurations.

### 3.6 Event Registry
* `GET /api/events/registry`
  * **Purpose**: List system events.
* `POST /api/events/registry/register`
  * **Purpose**: Create an ingestible system event template.

### 3.7 Templates
* `GET /api/templates`
  * **Purpose**: Fetch list of notification templates.
* `POST /api/templates`
  * **Purpose**: Create notification layouts.
* `PUT /api/templates/{id}`
  * **Purpose**: Edit markdown and tags.
* `DELETE /api/templates/{id}`
  * **Purpose**: Remove template from system.
* `POST /api/templates/ai-suggest`
  * **Purpose**: Generate layout models using Gemini's LLM engine.

### 3.8 Logs & Analytics
* `GET /api/logs`
  * **Purpose**: Access detailed system logs and audit history.
* `GET /api/analytics`
  * **Purpose**: Retrieve overall delivery aggregates and channel splits.
* `GET /api/analytics/costs`
  * **Purpose**: Access cost projections based on provider fees.
* `GET /api/analytics/sla`
  * **Purpose**: View delivery speed performance and latency statistics.

### 3.9 Programmatic Dispatch Ingress
* `POST /api/notifications/send`
  * **Purpose**: Trigger a live system alert programmatically.
  * **Authorization**: Handshakes with a client API Key.

---

## 4. Local Development and Verification

### 4.1 Running Linter
To verify TypeScript compilation and syntax guidelines:
```bash
npm run lint
```

### 4.2 Building For Production
To compile client and server systems:
```bash
npm run build
```

The interactive API sandbox can be fully accessed through the in-app **ApiDocs** tab, complete with single-click links to navigate directly to the Swagger-UI system.
