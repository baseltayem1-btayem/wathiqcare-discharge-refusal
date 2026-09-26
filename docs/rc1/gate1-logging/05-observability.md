# 05 — Observability

## Current Endpoints

### Python FastAPI

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /health` | Liveness probe | Exists |
| `GET /ready` | Readiness probe (startup complete / no startup error) | Exists |
| `GET /api/integrations/{connector}/health` | Integration connector health | Exists |

### Next.js (apps/web)

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/health` | Service health + runtime metrics | **Added in this gate** |

## Added: `/api/health`

Created `apps/web/src/app/api/health/route.ts`.

Response shape:

```json
{
  "status": "ok",
  "service": "wathiqcare-web",
  "timestamp": "2026-06-27T16:25:00.000Z",
  "version": "unknown",
  "checks": { "runtime": true },
  "metrics": {
    "counters": {
      "response_time_ms": 0,
      "db_latency_ms": 0,
      "pdf_generation_duration_ms": 0,
      "session_validation_duration_ms": 0
    },
    "latestMs": {},
    "updatedAt": "2026-06-27T16:25:00.000Z"
  }
}
```

The endpoint is public, dynamic, and safe to use as a Kubernetes/ALB health
probe.

## Runtime Metrics Store

`runtime-observability.ts` maintains an in-memory metrics store:

- `response_time_ms`
- `db_latency_ms`
- `pdf_generation_duration_ms`
- `session_validation_duration_ms`

These counters are exposed via `/api/health` and `getRuntimeMetricsSnapshot()`.

## Recommended Dashboards

### Application monitoring

- Request rate, error rate, latency (P50/P95/P99) by module/operation.
- 5xx/4xx counts from `api_failure` events.
- Auth failure rate from `AUTH_FAILURE` events.

### Performance metrics

- `pdf_generation_duration_ms` latest/average.
- `session_validation_duration_ms` latest/average.
- Route render times (Next.js built-in where available).

### Health endpoints

- Probe status from `/health` and `/ready` (Python) and `/api/health` (Next.js).
- Uptime and startup error flags.

### Audit dashboards

- Audit event volume by tenant, entity type, action.
- Audit chain verification failures.
- Evidence integrity verification failures.

### Error dashboards

- `UNHANDLED_EXCEPTION`, `PDF_FAILURE`, `OTP_FAILURE`, `AUTH_FAILURE`,
  `AUTHORIZATION_FAILURE`, `EXTERNAL_SERVICE_FAILURE`, `TIMEOUT`,
  `CIRCUIT_BREAKER_OPEN` counts.
- Group by module and error name.

### Operational dashboards

- Stub-mode usage (`taqniat_stub_mode`, PDF filler stub) to detect missing
  production credentials.
- Background job execution volume.
- Data residency bypass events.

## Gaps and Recommendations

| Gap | Priority | Recommendation |
|-----|----------|----------------|
| No `/api/health/ready` with DB check | Medium | Add a readiness route that validates Prisma connectivity without exposing DB details. |
| Metrics are in-memory only | Medium | Export metrics to Prometheus/OpenTelemetry or at least log them periodically. |
| No centralized log shipping documented | Medium | Document vector/Fluent Bit/CloudWatch agent configuration. |
| No alerting thresholds | Medium | Define SLO thresholds for auth failures, PDF errors, and OTP failures. |
| No distributed tracing | Low | Adopt OpenTelemetry or W3C trace context across internal calls. |
