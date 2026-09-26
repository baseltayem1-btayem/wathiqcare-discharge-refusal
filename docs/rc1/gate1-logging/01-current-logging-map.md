# 01 — Current Logging Map

## Scope

This map covers the two primary runtimes:

- `apps/web` — Next.js 16 / TypeScript server-side code.
- `apps/api` — Python FastAPI backend.

## apps/web / TypeScript

### Central logging utility

| File | Purpose |
|------|---------|
| `apps/web/src/lib/server/runtime-observability.ts` | Structured `RUNTIME_EVENT` logger, runtime metrics store, correlation/request ID helpers. |
| `apps/web/src/lib/core/platform-errors.ts` | `PlatformError` taxonomy, `handleRouteError`, `logPlatformError` DB writer. |
| `apps/web/src/lib/environment/audit-logging.ts` | Environment/test-account audit helpers. |
| `apps/web/src/lib/server/audit-foundation.ts` / `audit-chain-service.ts` | Hash-chained compliance audit events. |
| `apps/web/src/utils/api.ts` | Client `apiFetch` that injects `x-request-id`. |

### Log-level inventory (server-side `.ts` files under `src/lib/server`)

| Level | Count | Main emitters |
|-------|-------|---------------|
| `console.warn` | 16 | PDF renderers, tenant bootstrap, auth policy, secure links, integrations |
| `console.error` | 3 | Auth audit writes, security policy writes, PDF fallback |
| `console.info` | 2 | Legal-case PDF lifecycle |
| `console.debug` | 1 | n/a |
| `RUNTIME_EVENT` (structured) | many | auth, api, public signing, PDF renderer, consent library, etc. |

### Key files with direct `console.*` calls

- `apps/web/src/lib/server/legal-case-pdf-service.ts` — `console.info` for PDF binary writes.
- `apps/web/src/lib/server/auth-domain-policy.ts` — `console.warn` for auth policy failures.
- `apps/web/src/lib/server/promissory-note-pdf-render-service.ts` — Puppeteer launch warnings.
- `apps/web/src/lib/server/promissory-note-pdf.ts` — font-load warnings.
- `apps/web/src/lib/server/privacy-service.ts` — data residency bypass warning.
- `apps/web/src/lib/server/security-policy-service.ts` — privileged access log write error.
- `apps/web/src/lib/server/platform-tenant.ts` — platform tenant bootstrap warnings/errors.
- `apps/web/src/lib/server/tenant-admin.ts` — departments/RBAC table missing warnings.
- `apps/web/src/lib/server/tenantBrandingStore.ts` — branding table missing warning.
- `apps/web/src/lib/server/integrations/pdf-filler-adapter.ts` — stub-mode warnings.

## apps/api / Python

### Central logging utility

| File | Purpose |
|------|---------|
| `apps/api/backend/core/logging_config.py` | JSON formatter, root logger setup, `get_logger()` factory. |
| `apps/api/backend/audit/audit_logger.py` | Immutable hash-chained business audit logger. |

### Log-level inventory

| Source | Count | Notes |
|--------|-------|-------|
| `get_logger(__name__)` usage | ~19 imports | Structured JSON logger available. |
| `logger.<level>` calls | ~140 | Operational logs across services/routers. |
| `print(...)` | 7 | Ad-hoc output, mostly seed/debug scripts. |

### Key files

- `apps/api/backend/core/discharge_workflow_service.py`
- `apps/api/backend/services/secure_link_service.py`
- `apps/api/backend/notifications/orchestrator.py`
- `apps/api/backend/services/workflow_engine.py`
- `apps/api/backend/legal/legal_artifact_service.py`
- `apps/api/backend/api/routers/*.py`

## Classification Summary

| Severity | Where used |
|----------|------------|
| **TRACE / DEBUG** | Not currently used in production paths; some `console.debug` exists in runtime-observability switch. |
| **INFO** | Successful operations: PDF writes, legal artifact generation, secure-link events. |
| **WARN** | Non-fatal issues: stub modes, missing tables, font loading failures, policy bypasses. |
| **ERROR** | Operational failures: PDF renderer fallback, audit/log write failures, auth errors. |
| **CRITICAL** | Reserved for incidents via `logRuntimeIncident`. |

## Gaps

- No dedicated `/api/health` endpoint in the Next.js app (Python API has `/health` and `/ready`).
- Several modules still emit plain `console.warn`/`console.error` instead of structured `RUNTIME_EVENT` logs.
- Correlation ID propagation is present but uses two different header names (`x-correlation-id` vs `x-runtime-correlation-id`).
- Python logger had no automatic redaction filter before this remediation.
