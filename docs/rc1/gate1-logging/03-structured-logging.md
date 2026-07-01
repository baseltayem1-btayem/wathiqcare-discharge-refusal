# 03 — Structured Logging

## Objective

Every production log line must be machine-parseable, include operational context,
and never contain sensitive payloads.

## Implementation

### TypeScript / Next.js

Enhanced `apps/web/src/lib/server/runtime-observability.ts`:

- Added `trace` and `debug` to the `RuntimeSeverity` union.
- Added new incident types:
  - `AUTHORIZATION_FAILURE`
  - `EXTERNAL_SERVICE_FAILURE`
  - `TIMEOUT`
  - `CIRCUIT_BREAKER_OPEN`
  - `UNHANDLED_EXCEPTION`
- Every `logRuntimeEvent` output now includes:
  - `timestamp` (ISO-8601)
  - `service` (`wathiqcare-web`)
  - `module`
  - `operation`
  - `severity`
  - `event`
  - `requestId`
  - `runtimeCorrelationId`
  - `userId` (hashed or null)
  - `tenantId` (hashed or null)
  - `durationMs` (optional)
  - `details` (redacted)

### Redaction rules

Sensitive-key patterns (always redacted):

- `password`, `secret`, `token`, `api_key`, `auth`, `authorization`, `cookie`,
  `session`, `otp`, `code`, `signature`, `private_key`, `connection_string`,
  `database_url`, etc.

PHI-key patterns (value redacted):

- `patient_name`, `full_name`, `first_name`, `last_name`, `mrn`, `national_id`,
  `iqama`, `id_number`, `email`, `phone`, `mobile`, `address`, `dob`, `diagnosis`,
  `clinical_notes`, `medical_history`, `allergies`, `medication`, `procedure`,
  `physician_name`, `signer_name`, `witness_name`, etc.

Identifier handling:

- `user_id` / `userid` / `sub` → hashed with `u_` prefix.
- `tenant_id` / `tenantid` → hashed with `t_` prefix.
- Email → masked (`ab****@do****.com`).
- Phone/mobile → masked (`050****67`).
- Long strings → truncated at 1000 characters.

### Python / FastAPI

Updated `apps/api/backend/core/logging_config.py`:

- Added `_RedactionFilter` attached to the root handler.
- Same key patterns as TypeScript, with equivalent email/phone masking and
  identifier hashing.
- All `get_logger()` loggers inherit the filter automatically.
- Added public helper `redact_log_payload(payload)` for explicit redaction.

### Files changed

- `apps/web/src/lib/server/runtime-observability.ts`
- `apps/web/src/lib/server/runtime-observability.test.ts`
- `apps/api/backend/core/logging_config.py`
- `apps/web/src/lib/server/http.ts`
- `apps/web/src/lib/server/auth.ts`
- `apps/web/src/lib/server/public-signing-service.ts`
- `apps/web/src/lib/server/informed-consents-final-pdf-payload.ts`
- `apps/web/src/lib/server/consent-library-service.ts`
- `apps/web/src/lib/server/integrations/taqniat-sms-adapter.ts`
- `apps/web/src/lib/server/acknowledgment-telemetry.ts`
- `apps/web/src/lib/environment/audit-logging.ts`
- `apps/web/src/lib/core/platform-errors.ts`
- `apps/web/src/lib/server/secure-links.ts`
- `apps/web/src/lib/server/module-secure-signing-service.ts`
- `apps/web/src/lib/server/magic-link-route-flow.ts`

## Example output

```json
{
  "timestamp": "2026-06-27T16:24:11.818Z",
  "service": "wathiqcare-web",
  "module": "api",
  "operation": "api_request",
  "severity": "warn",
  "event": "api_failure",
  "requestId": "9e32ca57-a9b3-4a44-acbe-c71638682c5b",
  "runtimeCorrelationId": "617d5aea-e4b7-4b20-bc56-8222e08bb32b",
  "userId": null,
  "tenantId": null,
  "durationMs": null,
  "details": {
    "traceId": "403802f5-834c-45b4-9455-b358aff8933c",
    "status": 403,
    "message": "Tenant is inactive",
    "code": null,
    "errorName": "Error",
    "errorMessage": "Tenant is inactive"
  }
}
```

## Notes

- The structured logger is additive: existing call sites were migrated; no
  consumer interfaces were removed.
- Sensitive value detection is conservative; if a key is ambiguous, it is
  redacted.
