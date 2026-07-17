# Operations and Observability

## Infrastructure
Kubernetes manifests for deployment, autoscaling, and OpenTelemetry collector are located in `/k8s`.

## Observability
- OpenTelemetry is instrumented in `/server/telemetry.ts`.
- Metrics are exposed at `/api/metrics` in Prometheus format.

## Testing Strategy
- **Contract Tests**: Scaffolding in `/tests/contract`.
- **E2E Tests**: Scaffolding in `/tests/e2e`.
- **Load Tests**: Scaffolding in `/tests/load`.
