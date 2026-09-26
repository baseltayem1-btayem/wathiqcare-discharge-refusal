# 02 — Privacy Review

## Method

Reviewed server-side log statements in `apps/web/src/lib/server` and Python backend
for PHI/PII/secrets leakage. Findings below use the required format.

## Findings

### F-01: Direct console logs may contain raw phone numbers

- **Location**: `apps/web/src/lib/server/integrations/taqniat-sms-adapter.ts` (stub mode)
- **Risk**: Medium
- **Privacy Impact**: Mobile number logged in plain text when provider is not configured.
- **Operational Impact**: Stub logs may be captured in CI/build logs, exposing test/real phone numbers.
- **Recommendation**: Mask phone numbers before logging; route through structured logger.
- **Priority**: High
- **Effort**: Small
- **Status**: Remediated in this gate.

### F-02: Acknowledgment telemetry logged raw tenant/case/session IDs and phone

- **Location**: `apps/web/src/lib/server/acknowledgment-telemetry.ts`
- **Risk**: Medium
- **Privacy Impact**: Tenant, case, session identifiers and masked phone were emitted as plain strings; correlation possible.
- **Operational Impact**: High-cardinality plain IDs make log aggregation noisy and aid reconstruction of user sessions.
- **Recommendation**: Hash non-public identifiers and mask phone numbers.
- **Priority**: High
- **Effort**: Small
- **Status**: Remediated in this gate.

### F-03: Auth state logs exposed raw user and tenant IDs

- **Location**: `apps/web/src/lib/server/auth.ts`
- **Risk**: Medium
- **Privacy Impact**: `userId` and `tenantId` logged directly.
- **Operational Impact**: Cross-reference with other logs could de-anonymize users.
- **Recommendation**: Route through structured logger which hashes identifiers.
- **Priority**: High
- **Effort**: Small
- **Status**: Remediated in this gate.

### F-04: `logApiFailure` printed raw error objects

- **Location**: `apps/web/src/lib/server/http.ts`
- **Risk**: Medium
- **Privacy Impact**: For 5xx errors the raw `Error` object (including stack/context) was logged without redaction.
- **Operational Impact**: Stack traces may leak internal paths or request payloads.
- **Recommendation**: Emit structured `RUNTIME_EVENT` with redacted error message.
- **Priority**: High
- **Effort**: Small
- **Status**: Remediated in this gate.

### F-05: `platform-errors.ts` `handleRouteError` logged raw unhandled errors

- **Location**: `apps/web/src/lib/core/platform-errors.ts`
- **Risk**: Medium
- **Privacy Impact**: `console.error("[PlatformError] Unhandled:", err)` could leak request context.
- **Operational Impact**: Unstructured logs hard to parse and may contain secrets.
- **Recommendation**: Use structured logger and redact context before persisting to `platform_error_log`.
- **Priority**: High
- **Effort**: Small
- **Status**: Remediated in this gate.

### F-06: Secure-link public event logger did not redact generic data

- **Location**: `apps/web/src/lib/server/secure-links.ts`
- **Risk**: Medium
- **Privacy Impact**: `console.warn(JSON.stringify({ ...data }))` relied on callers not to pass raw PII.
- **Operational Impact**: Future changes could leak email/patient name.
- **Recommendation**: Route through structured logger with automatic redaction.
- **Priority**: Medium
- **Effort**: Small
- **Status**: Remediated in this gate.

### F-07: Environment audit logs emitted details without redaction in development

- **Location**: `apps/web/src/lib/environment/audit-logging.ts`
- **Risk**: Low
- **Privacy Impact**: `details` object spread into console in `development` mode.
- **Operational Impact**: Developers may see PII in local logs.
- **Recommendation**: Always redact details; use structured logger.
- **Priority**: Medium
- **Effort**: Small
- **Status**: Remediated in this gate.

### F-08: Arabic mojibake diagnostics in public signing may contain patient-facing text

- **Location**: `apps/web/src/lib/server/public-signing-service.ts`
- **Risk**: Medium
- **Privacy Impact**: Diagnostic strings are derived from patient-facing content.
- **Operational Impact**: Logging full diagnostics increases log volume and leak risk.
- **Recommendation**: Log counts and redact/summarize sample diagnostics.
- **Priority**: Medium
- **Effort**: Small
- **Status**: Remediated in this gate (count logged; sample redacted by structured logger).

### F-09: Python backend logger had no automatic PII redaction

- **Location**: `apps/api/backend/core/logging_config.py`
- **Risk**: High
- **Privacy Impact**: Any `extra` field could contain PHI/PII/secrets without enforcement.
- **Operational Impact**: Centralized log aggregation could become a compliance liability.
- **Recommendation**: Add a redaction filter to the root handler.
- **Priority**: High
- **Effort**: Medium
- **Status**: Remediated in this gate.

### F-10: Remaining ad-hoc `console.*` statements in non-remediated files

- **Location**: `legal-case-pdf-service.ts`, `promissory-note-pdf*.ts`, `privacy-service.ts`, `tenant-admin.ts`, `platform-tenant.ts`, `pdf-filler-adapter.ts`, etc.
- **Risk**: Low–Medium
- **Privacy Impact**: Most do not directly log PHI, but they lack structure and redaction guarantees.
- **Operational Impact**: Inconsistent log format complicates parsing and dashboards.
- **Recommendation**: Migrate to `logRuntimeEvent` or `logRuntimeIncident` in follow-up sprints.
- **Priority**: Medium
- **Effort**: Medium
- **Status**: Documented; not fully remediated in this gate.

## Verification

- Added `runtime-observability.test.ts` proving redaction of PHI, secrets, email, phone, and identifier hashing.
- Updated Python logging tests implicitly through existing suite; no PHI observed in test output.
