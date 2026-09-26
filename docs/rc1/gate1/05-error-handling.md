# RC1 Gate 1 — 05 Error Handling

**Scope:** API route error handling, error response schemas, Next.js error boundaries, unhandled promise rejections, and client-side error handling.  
**Files reviewed:** `apps/web/src/app/api/**/*route.ts`, `apps/web/src/lib/server/http.ts`, `apps/web/src/lib/core/platform-errors.ts`, `apps/web/src/components/ModulePortalPage.tsx`, `apps/web/src/components/ModuleShell.tsx`  
**Review date:** 2026-06-26

---

## Executive Summary

The codebase has two competing API response helpers and a structured-error foundation, but neither is used consistently. Many API routes have no `try/catch`, error response schemas vary by route, Next.js error boundaries are largely absent, and a large number of failures are silently swallowed with `.catch(() => undefined)`. The error-handling posture is inconsistent and insufficient for production.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 5 |
| Medium   | 4 |
| Low      | 2 |

---

## Findings

### EH-HIGH-01 — Many API routes have no `try/catch`
- **Priority:** High
- **Description:** 22 of 27 audited route files do not wrap the handler body in `try/catch`. Examples:
  - `apps/web/src/app/api/modules/clinical-content/assemble/route.ts`
  - `apps/web/src/app/api/modules/clinical-content/forms/route.ts`
  - `apps/web/src/app/api/modules/clinical-knowledge/audit/route.ts`
  - `apps/web/src/app/api/modules/informed-consents/forms/route.ts`
  - `apps/web/src/app/api/modules/informed-consents/imc-library/route.ts`
  - `apps/web/src/app/api/auth/logout/route.ts`
  - `apps/web/src/app/api/auth/password/signup/route.ts`
- **Risk:** Uncaught exceptions return Next.js default HTML error pages or generic 500 responses without trace IDs, breaking API contracts and leaking stack traces in edge cases.
- **Recommendation:** Wrap every route handler in `try/catch` returning `handleApiError(error)` or `handleRouteError(error)`. Consider a route-wrapper higher-order function.
- **Estimated effort:** 1–2 sprints

### EH-HIGH-02 — Two competing API error/response helpers
- **Priority:** High
- **Description:** `apps/web/src/lib/server/http.ts` exports `jsonSuccess / jsonError / handleApiError / logApiFailure` (uses `success`, `data`, `error`, `traceId`, `timestamp`), while `apps/web/src/lib/core/platform-errors.ts` exports `apiSuccess / apiError / handleRouteError` (uses `success`, `error.code`, `error.message`, `error.context`). Both are used inconsistently.
- **Risk:** Clients receive different JSON envelopes, breaking generic error parsing and retry logic.
- **Recommendation:** Consolidate on one helper; deprecate the other and migrate all routes.
- **Estimated effort:** 1 sprint

### EH-HIGH-03 — Inconsistent error response schemas across routes
- **Priority:** High
- **Description:**
  - Clinical routes return `{ ok: false, error: string }` (e.g., `clinical-content/assemble/route.ts` line 22, `clinical-knowledge/assembly/route.ts` line 24).
  - Auth routes return `{ ok: true, accessToken, redirectTo }` (login), `{ success: false, error }` (signup), or `jsonSuccess`/`jsonError` shapes.
  - Promissory-notes PDF returns `{ error: error.message }` (line 36).
- **Risk:** Client error handling is fragmented; generic interceptors cannot reliably parse codes/messages.
- **Recommendation:** Standardize on `{ success: boolean, data?, error?: { code, message, context? }, traceId, timestamp }` for every API response.
- **Estimated effort:** 1 sprint

### EH-HIGH-04 — Client-side error boundary coverage is minimal
- **Priority:** High
- **Description:** No `error.tsx` or `global-error.tsx` files were found under `apps/web/src/app`. Only `ModuleCardErrorBoundary` in `apps/web/src/components/ModulePortalPage.tsx` line 79 exists. `AppShell.tsx` line 192 listens to `window.error`/`unhandledrejection` but only calls `trackUiError`.
- **Risk:** React rendering crashes surface the Next.js default error overlay or blank screens; no recovery UI or fallback for server components.
- **Recommendation:** Add Next.js `error.tsx` files for critical route segments and a root `global-error.tsx` with a safe fallback and error-reporting integration.
- **Estimated effort:** 1–2 sprints

### EH-HIGH-05 — Large number of `.catch(() => undefined)` swallow failures
- **Priority:** High
- **Description:** 40+ instances across audit writes, cleanup, DB writes, and Prisma operations. Representative files:
  - `case-compliance-service.ts` lines 161, 244, 269, 502, 648, 662
  - `public-signing-service.ts` lines 711, 1562, 2032, 2138, 2218, 2459, 2596
  - `legal-case-pdf-service.ts` lines 1180, 1454, 1519, 1705, 1727, 1776, 1826
  - `secure-links.ts` lines 330, 628, 715
- **Risk:** Silent data loss, missed audit events, unreported DB degradation, and masking of bugs.
- **Recommendation:** Replace with `.catch(logAndContinue)` that at minimum calls the structured logger with error name, operation, and trace ID. For audit writes, make failures observable or fail-safe.
- **Estimated effort:** 2–3 sprints

### EH-MED-01 — Direct `error.message` exposure in routes
- **Priority:** Medium
- **Description:** `apps/web/src/app/api/modules/promissory-notes/[id]/pdf/route.ts` line 36 and `debtor-signing/start/route.ts` line 31 return `error.message` directly for `ApiError`.
- **Risk:** Internal or third-party error text may leak to clients.
- **Recommendation:** Return a generic message for 500s and only safe `ApiError.message` for 4xx.
- **Estimated effort:** 2–3 days

### EH-MED-02 — `assembleConsent` is called without `await`
- **Priority:** Medium
- **Description:** `apps/web/src/app/api/modules/clinical-content/assemble/route.ts` line 50 calls `assembleConsent(...)` without `await`, yet returns the result synchronously.
- **Risk:** If `assembleConsent` is async, the response will not contain the assembly; broken API contract.
- **Recommendation:** Add `await` or confirm the function is synchronous and type it accordingly.
- **Estimated effort:** 1 day

### EH-MED-03 — `signup` route is a stub with no validation or audit
- **Priority:** Medium
- **Description:** `apps/web/src/app/api/auth/password/signup/route.ts` only checks an env flag and returns `{ success: true }`.
- **Risk:** If enabled accidentally, it provides no validation, no audit, and no rate limiting.
- **Recommendation:** Remove or fully implement with validation, audit, rate limiting, and admin approval workflow.
- **Estimated effort:** 3–5 days

### EH-MED-04 — Incident response service does not alert
- **Priority:** Medium
- **Description:** `apps/web/src/lib/server/incident-response-service.ts` line 101 creates `securityIncident` records with SLA deadlines, but there is no notification/alert mechanism for overdue client/regulator notifications.
- **Risk:** Missed regulatory notification deadlines (PDPL/SDAIA/NHRA).
- **Recommendation:** Add a scheduled job or webhook that alerts when `clientNotificationDueAt` / `regulatorNotificationDueAt` are approaching/overdue.
- **Estimated effort:** 1–2 sprints

### EH-LOW-01 — `logout` route lacks audit and error handling
- **Priority:** Low
- **Description:** `apps/web/src/app/api/auth/logout/route.ts` clears the cookie but does not write an audit event or handle serialization errors.
- **Risk:** Session termination events are missing from the compliance trail.
- **Recommendation:** Add `writeAuditLog` for `logout` and wrap in `try/catch`.
- **Estimated effort:** 2–3 days

### EH-LOW-02 — Legacy rejected UI directory contains raw error logging
- **Priority:** Low
- **Description:** `apps/web/src/components/informed-consents/_legacy-rejected/final-ui-rejected-20260608/` contains raw `console.error` calls and unhandled error patterns.
- **Risk:** Dead/legacy code still executes if imported; noise in logs.
- **Recommendation:** Delete the `_legacy-rejected` tree if truly unused.
- **Estimated effort:** 1–2 days

---

## Positive Observations

1. **Structured error primitives exist.** `PlatformError`, `ApiError`, `handleApiError`, and `handleRouteError` provide a foundation for consistent error handling.
2. **Trace IDs are part of the `http.ts` response helper**, which is a good starting point for correlation.
3. **`ModuleCardErrorBoundary` demonstrates client-side boundary awareness**, even though coverage is limited.

---

## Gate 1 Exit Criteria for Error Handling

1. Add `try/catch` + `handleApiError` to every API route.
2. Consolidate on a single API response envelope and migrate all routes.
3. Add Next.js `error.tsx` / `global-error.tsx` boundaries.
4. Stop silently swallowing failures with `.catch(() => undefined)`.
5. Remove direct `error.message` exposure for 5xx errors.
6. Resolve the `signup` stub and `assembleConsent` await issues.

Error handling does not currently satisfy RC1 Gate 1.
