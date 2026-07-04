# RC1 Gate 1.3 — 05 Logging Review

**Scope:** Review logging for PHI/PII leakage, secret leakage, structured logging, error severity, correlation IDs, and request tracing.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

Logging is **mixed**. The Python backend has a structured JSON logger and good masking helpers for emails and phones. The Next.js web tier has `runtime-observability.ts` with redaction and hashing, but it is inconsistently used; many routes and components still use raw `console.*` calls that leak PII/PHI. Several Python routers also log full request payloads, email addresses, and Graph API response bodies. There is no unified correlation/request ID propagated across the HTTP boundary.

---

## 1. PHI / PII Leakage Findings

### LOG-01 — Next.js login route logs plaintext email and user identity

| Field | Details |
|---|---|
| **Description** | `apps/web/src/app/api/auth/password/login/route.ts` logs `email`, `userId`, `role`, `tenantId`, and `redirectTo` in multiple log lines (lines 276, 448, 489–506, 523, 551, 568). |
| **Risk** | Direct PII in application logs accessible to operators and log aggregators. |
| **Legal Impact** | Violates PDPL and HIPAA minimum-necessary principles. |
| **Clinical Impact** | Clinician/patient identity exposed in logs. |
| **Recommendation** | Route all logging through `logRuntimeEvent`/`logRuntimeIncident`, which hashes `userId` and redacts `email`/`name` keys. |
| **Priority** | Critical |
| **Estimated Effort** | 2–3 days |

### LOG-02 — Consent builder logs patient PHI/PHI in browser/SSR console

| Field | Details |
|---|---|
| **Description** | `apps/web/src/components/informed-consents/_legacy-rejected/final-ui-rejected-20260608/ConsentBuilder.tsx` logs `draftPayload` containing `patientName`, `patientMrn`, `patientMobile`, `patientEmail`, `encounterDiagnosis`, `encounterProcedure` (lines 415, 452, 461, 502, 517, 561). |
| **Risk** | PHI/PII leak to browser devtools and SSR stdout. |
| **Legal Impact** | Highest severity — clinical diagnosis and patient identifiers exposed. |
| **Clinical Impact** | Patient privacy breach. |
| **Recommendation** | Remove all debug `console.log` from this component; use `logRuntimeEvent` with explicit non-PHI allow-list if telemetry is required. |
| **Priority** | Critical |
| **Estimated Effort** | 1 day |

### LOG-03 — Taqniat SMS adapter logs phone number in stub mode

| Field | Details |
|---|---|
| **Description** | `apps/web/src/lib/server/integrations/taqniat-sms-adapter.ts:42` logs `message.to` when in stub mode. |
| **Risk** | PII leak (mobile number). |
| **Legal Impact** | Violates minimum-necessary logging. |
| **Clinical Impact** | Patient contact data exposed. |
| **Recommendation** | Mask recipient before logging, e.g., `+9665****89`. |
| **Priority** | High |
| **Estimated Effort** | 2–4 h |

### LOG-04 — Python email router logs full request payloads

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/api/routers/emails.py` logs `payload.model_dump()` for `/send`, `/send-demo-request`, and test routes (lines 72–79, 267–274, 306–310, 461–491). Includes `to`, `cc`, `subject`, `html_body`, `text_body`, `patient_id`, `case_id`, `contact_name`, `contact_email`, `contact_phone`, `contact_address`. |
| **Risk** | PHI/PII leak. Email bodies may contain clinical details; demo request payload is explicit PII. |
| **Legal Impact** | Critical — full message bodies and contact details in logs. |
| **Clinical Impact** | Patient clinical context and contact data exposed. |
| **Recommendation** | Log only metadata (recipient count, subject length, case_id); mask emails; never log `model_dump()` of bodies. |
| **Priority** | Critical |
| **Estimated Effort** | 1–2 days |

### LOG-05 — Python secure-link service/router logs recipient email

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/services/secure_link_service.py:301-307` and `api/routers/secure_links.py:205-207` log `recipient_email`. |
| **Risk** | PII leak (patient/representative email). |
| **Legal Impact** | Violates minimum-necessary logging. |
| **Clinical Impact** | Patient contact data exposed. |
| **Recommendation** | Replace with masked email or omit; store plaintext only in DB. |
| **Priority** | High |
| **Estimated Effort** | 2–4 h |

### LOG-06 — Python workflow router logs patient email

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/api/routers/workflow.py:279-290` logs `payload.email` and `payload.language`. |
| **Risk** | PII leak. |
| **Legal Impact** | Violates minimum-necessary logging. |
| **Clinical Impact** | Patient contact data exposed. |
| **Recommendation** | Remove or mask email; log only notification type and language. |
| **Priority** | High |
| **Estimated Effort** | 2–4 h |

### LOG-07 — Python notification service logs recipient email and message title

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/services/notification_service.py:61-69, 102-110, 114-122` logs `recipient_email` and `title`. |
| **Risk** | PII leak; title may contain clinical context. |
| **Legal Impact** | Violates minimum-necessary logging. |
| **Clinical Impact** | Patient data exposed. |
| **Recommendation** | Log only hashed recipient reference and notification type; never log title/body. |
| **Priority** | High |
| **Estimated Effort** | 2–4 h |

### LOG-08 — Microsoft Graph email client logs response bodies

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/core/email_service.py:152-168, 170-188` logs full `body` of Graph API responses. |
| **Risk** | Potential secret/PII/PHI leak. Responses may contain message IDs, recipient metadata, echoed payloads, or tokens. |
| **Legal Impact** | High risk of data leakage. |
| **Clinical Impact** | Patient data and tokens may be exposed. |
| **Recommendation** | Log only status codes, retry attempt, and sanitized error codes. Never log full HTTP bodies. |
| **Priority** | High |
| **Estimated Effort** | 2–4 h |

### LOG-09 — Seed/utility scripts print PII

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/seed_data.py:33, 57, 65` prints `User created: {email}`. |
| **Risk** | PII in CI/terminal output. |
| **Legal Impact** | Violates minimum-necessary logging. |
| **Clinical Impact** | Low — development/utility script. |
| **Recommendation** | Replace with masked email or generic message. |
| **Priority** | Medium |
| **Estimated Effort** | 1–2 h |

### LOG-10 — Evidence bundle verifier prints full verification JSON

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/legal/evidence_bundle_verifier.py:303` prints `json.dumps(verification)`. |
| **Risk** | Potential PHI/PII if verification object contains case/patient metadata. |
| **Legal Impact** | Medium risk. |
| **Clinical Impact** | Possible patient data exposure. |
| **Recommendation** | Use structured logger and print only safe summary fields. |
| **Priority** | Medium |
| **Estimated Effort** | 2–4 h |

---

## 2. Secret Leakage Findings

### LOG-11 — No direct JWT/key logging found

| Field | Details |
|---|---|
| **Description** | No log statement outputs `JWT_SECRET_KEY`, `PUBLIC_LINK_TOKEN_PEPPER`, passwords, OTP codes, raw bearer tokens, or Graph `client_secret`. |
| **Risk** | Low. |
| **Legal Impact** | Supports secret confidentiality. |
| **Clinical Impact** | Protects authentication integrity. |
| **Recommendation** | Maintain; add lint rule to prevent secret logging. |
| **Priority** | — |
| **Estimated Effort** | None |

### LOG-12 — Graph API response body may echo tokens

| Field | Details |
|---|---|
| **Description** | Although no direct secret logging was found, logging full Graph API response bodies (LOG-08) creates a latent token/secret leak risk. |
| **Risk** | Medium — depends on Graph API response content. |
| **Legal Impact** | Potential compromise of service credentials. |
| **Clinical Impact** | Could enable unauthorized access. |
| **Recommendation** | Stop logging full response bodies. |
| **Priority** | High |
| **Estimated Effort** | 2–4 h |

---

## 3. Structured Logging

### LOG-13 — Python structured JSON logger is implemented

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/core/logging_config.py` emits one-line JSON with `timestamp`, `level`, `logger`, `message`, and extra fields. |
| **Risk** | Low. |
| **Legal Impact** | Supports log aggregation and forensics. |
| **Clinical Impact** | Supports operational monitoring. |
| **Recommendation** | Maintain and extend to all Python services. |
| **Priority** | — |
| **Estimated Effort** | None |

### LOG-14 — Next.js `runtime-observability.ts` is structured but underused

| Field | Details |
|---|---|
| **Description** | `apps/web/src/lib/server/runtime-observability.ts` hashes `userId`/`tenantId`, redacts keys containing `patient`, `mrn`, `name`, `email`, and emits JSON with `requestId`/`runtimeCorrelationId`. However, many files still use raw `console.*`. |
| **Risk** | Inconsistent redaction and structure. |
| **Legal Impact** | PII may leak through uninstrumented log paths. |
| **Clinical Impact** | Inconsistent observability. |
| **Recommendation** | Replace direct `console.*` calls with `logRuntimeEvent`/`logRuntimeIncident`; add lint rule banning `console.*` in production code. |
| **Priority** | High |
| **Estimated Effort** | 1–2 sprints |

### LOG-15 — ~70+ raw `console.*` calls in web tier

| Field | Details |
|---|---|
| **Description** | Direct `console.log/error/warn/info` calls exist throughout `apps/web/src/`, especially in route handlers and utilities. |
| **Risk** | Unstructured, unredacted, no severity, no logger name. |
| **Legal Impact** | PII/PHI leakage risk; poor forensic value. |
| **Clinical Impact** | Operational noise; missed incidents. |
| **Recommendation** | Systematically migrate to structured logger with redaction. |
| **Priority** | High |
| **Estimated Effort** | 1–2 sprints |

### LOG-16 — Development-only audit logging uses `console.log`

| Field | Details |
|---|---|
| **Description** | `apps/web/src/lib/environment/audit-logging.ts:38-50` logs audit events to console in development mode. |
| **Risk** | Audit `details` may contain PII; env flag can be misconfigured. |
| **Legal Impact** | Potential audit PII leak. |
| **Clinical Impact** | Audit events exposed in logs. |
| **Recommendation** | Remove console audit logging; send audit events only to immutable audit chain/database. |
| **Priority** | Medium |
| **Estimated Effort** | 2–4 h |

---

## 4. Error Severity

### LOG-17 — Python logging uses severity levels consistently

| Field | Details |
|---|---|
| **Description** | Python routers/services use `logger.info`, `logger.warning`, `logger.error`, `logger.exception` appropriately. |
| **Risk** | Low. |
| **Legal Impact** | Supports incident classification. |
| **Clinical Impact** | Supports operational response. |
| **Recommendation** | Maintain. |
| **Priority** | — |
| **Estimated Effort** | None |

### LOG-18 — Next.js `console.error` used for all severities

| Field | Details |
|---|---|
| **Description** | Many Next.js files use `console.error` for warnings and informational messages, or `console.log` for errors. |
| **Risk** | Severity classification is lost. |
| **Legal Impact** | Hard to distinguish critical incidents from noise. |
| **Clinical Impact** | Delayed incident response. |
| **Recommendation** | Adopt `runtime-observability` severity levels (`debug`, `info`, `warning`, `error`, `critical`). |
| **Priority** | Medium |
| **Estimated Effort** | 1–2 sprints |

---

## 5. Correlation IDs / Request Tracing

### LOG-19 — No Next.js middleware for correlation/request IDs

| Field | Details |
|---|---|
| **Description** | `apps/web/src/middleware.ts` does not exist. `runtime-observability.ts` generates IDs per call but does not propagate them automatically across requests. |
| **Risk** | No end-to-end tracing between browser, Next.js, and Python backend. |
| **Legal Impact** | Cannot correlate events across systems for forensic review. |
| **Clinical Impact** | Incident investigation is slow/error-prone. |
| **Recommendation** | Add root `middleware.ts` that injects/reads `x-request-id` and `x-runtime-correlation-id` headers. |
| **Priority** | High |
| **Estimated Effort** | 2–3 days |

### LOG-20 — Python middleware does not propagate correlation IDs

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/main.py` request-hardening middleware logs method/path/status but does not read or set correlation IDs. |
| **Risk** | Breaks trace continuity when Next.js calls Python API. |
| **Legal Impact** | Cannot correlate frontend and backend events. |
| **Clinical Impact** | Troubleshooting across stack is difficult. |
| **Recommendation** | Read correlation headers and attach to all log records via `logging.Filter` or `extra`. |
| **Priority** | High |
| **Estimated Effort** | 2–3 days |

### LOG-21 — Login redirect logs may capture PII in query strings

| Field | Details |
|---|---|
| **Description** | `apps/web/src/utils/api.ts:80` logs `next=${current || "/"}`, which may contain PII query parameters. |
| **Risk** | PII in logs. |
| **Legal Impact** | Minimum-necessary violation. |
| **Clinical Impact** | Patient IDs exposed. |
| **Recommendation** | Strip query string or redact known PII query keys. |
| **Priority** | Low-Medium |
| **Estimated Effort** | 2–4 h |

---

## 6. Positive Findings

| Finding | File | Why it is good |
|---|---|---|
| Structured JSON logger for Python | `apps/api/backend/core/logging_config.py` | One-line JSON with timestamp, level, logger, message, extra fields |
| Email masking helper | `apps/api/backend/api/routers/auth.py` | `_masked_email()` reduces email to `us***@domain.com` |
| Phone masking helper | `apps/api/backend/services/notifications/taqnyat_provider.py` | `_mask_recipient()` masks phone numbers |
| Patient reference masking | `apps/api/backend/legal/evidence_bundle.py` | `_mask_patient_reference()` hides MRNs |
| Structured observability helper in Next.js | `apps/web/src/lib/server/runtime-observability.ts` | Hashes IDs, redacts PII keys, emits JSON with request/correlation IDs |
| Token hashing in secure-link logs | `apps/web/src/lib/server/secure-links.ts` | Logs token hash, not raw token |
| No direct JWT/password logging | — | Secrets are not emitted |

---

## 7. Recommendations Summary

1. Refactor Next.js login route to use masked/hashed logging.
2. Remove all debug `console.log` from `ConsentBuilder.tsx` and other components.
3. Mask phone numbers in `taqniat-sms-adapter.ts`.
4. Stop logging full email payloads in Python `emails.py`; log metadata only.
5. Mask/omit recipient emails in secure-link and notification logs.
6. Stop logging full Graph API response bodies.
7. Add Next.js middleware to inject/propagate correlation IDs.
8. Add Python logging filter to attach correlation IDs to all records.
9. Replace raw `console.*` in web tier with structured, redacted logger.
10. Remove development-only console audit logging.
11. Add lint rules banning `console.*` and unredacted PII in logs.
12. Consider adopting `pino` or `winston` in the web tier with redaction config.
