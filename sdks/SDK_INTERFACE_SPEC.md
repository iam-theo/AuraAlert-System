# Aura SDK Shared Interface Specification

All AuraAlert SDKs MUST implement the following core capabilities to ensure a consistent developer experience:

## 1. Authentication
- Support for API Key via constructor or environment variables (`AURA_API_KEY`).
- Secure handling of keys.

## 2. Configuration
- `baseUrl`: Configurable base URL (default: `https://api.auraalert.io`).
- `timeout`: Configurable request timeout (default: 30s).
- `retryConfig`: Configurable retry strategy (exponential backoff).

## 3. Core Features
- `idempotencySupport`: Optional `idempotencyKey` parameter for POST/PUT requests.
- `correlationId`: Automated generation of unique request IDs if not provided, passed in `X-Aura-Correlation-ID`.
- `webhookVerification`: Helper method to verify `X-Aura-Signature` header.
- `pagination`: Automatic handling of `Link` headers or cursor-based responses for list operations.

## 4. Logging & Error Handling
- Consistent structured error responses (e.g., `AuraError` class with `code`, `message`, `requestId`).
- Hooks for custom logging integration.

## 5. Implementation Target
Each SDK implementation must be type-safe (or idiomatic for the language) and follow these patterns.
