# Pre-OTP Bootstrap Flow

Date: 2026-05-27
Branch: `phase24-evidence-package-final`
Related: [LIVE_SESSION_RACE_CONDITION_REPORT.md](LIVE_SESSION_RACE_CONDITION_REPORT.md), [SAFARI_HOTFIX_VALIDATION.md](SAFARI_HOTFIX_VALIDATION.md)
Implementation commit: `15e1b68`

## 1. Purpose

Resolve the deterministic "Missing public signing session" failure on all true cold opens of `/sign/<token>/workflow` (see [LIVE_SESSION_RACE_CONDITION_REPORT.md](LIVE_SESSION_RACE_CONDITION_REPORT.md)) without weakening any security invariant.

## 2. Lifecycle diagram

```mermaid
sequenceDiagram
    autonumber
    participant Mail as iPhone Mail / SMS
    participant Safari as Safari (cold tab)
    participant Page as /sign/[token]/workflow (SSR)
    participant API as /api/public-signing/document/[token]
    participant Auth as /api/sign/[token]/{request,verify}-otp
    participant Svc as public-signing-service

    Mail->>Safari: tap signed-link
    Safari->>Page: GET /sign/<token>/workflow
    Page-->>Safari: 200 HTML (UIRefreshBoundary + client bundle)
    Safari->>API: GET /api/public-signing/document/<token>  (no Cookie)
    API->>Svc: getPublicSigningDocument(request)
    Note over Svc: cookie absent → bootstrap branch
    Svc-->>API: { phase: "pre-otp", bootstrap: {…non-PHI…} }
    API-->>Safari: 200 application/json
    Safari->>Safari: render PreOtpView with bootstrap.facilityName / templateTitle
    Safari->>Auth: POST /api/sign/<token>/request-otp { mobileNumber, locale: "ar" }
    Auth-->>Safari: 200 { challengeId, maskedPhone, expiresAt }
    Safari->>Auth: POST /api/sign/<token>/verify-otp { otpCode }
    Auth-->>Safari: 200 + Set-Cookie wathiqcare_public_signing_session=…; HttpOnly; Secure; SameSite=lax; Domain=.wathiqcare.online; Max-Age=1797
    Safari->>API: GET /api/public-signing/document/<token>  (cookie attached)
    API->>Svc: getPublicSigningDocument(request)
    Note over Svc: cookie present → validatePublicSigningSession (unchanged strict path)
    Svc-->>API: full PublicSigningDocumentPayload (PHI)
    API-->>Safari: 200 application/json
    Safari->>Safari: hydrate full workflow (Education → Consent → Decision → Signature)
```

## 3. Security model

### 3.1 What the pre-OTP payload contains (allowlist)

The bootstrap response body, in full, is exactly:

```ts
type PublicSigningPreOtpBootstrapPayload = {
  phase: "pre-otp";
  bootstrap: {
    documentId: string;          // opaque uuid (already in the signed link)
    moduleType: string;          // "informed_consent" | "discharge_refusal" | "promissory_note"
    signerRole: string;          // "PATIENT" | "GUARDIAN" | "WITNESS"
    facilityName: string;        // Tenant.name — already on email/SMS letterhead
    templateTitleAr: string;     // already on email/SMS subject
    templateTitleEn: string;     // already on email/SMS subject
    locale: "ar" | "en" | "bilingual";
    educationRequired: boolean;
    maskedMobile: string | null; // currently null (mobile is collected from user input)
    otpRequiredAt: string;       // server ISO timestamp for UI display
  };
};
```

### 3.2 What the pre-OTP payload does NOT contain (denylist)

The discriminated union enforces at the type level that none of these fields ever appear pre-OTP:

- `patientName`, `mrn`, `physicianName`
- `diagnosis`, `plannedProcedure`
- `consentReference`, `versionLabel`
- `sections` (clinical body, risks, benefits, FAQ, instructions)
- `legalTextAr`/`legalTextEn`, `pdplTextAr`/`pdplTextEn`
- `signatureCaptured`, `signatures`, signed PDFs
- `decision.*` (status, presented-at, refusal form, refusal acknowledgements)
- `education.*` body (only the boolean `educationRequired` flag is exposed)
- `evidence.*`, audit chain entries

### 3.3 Invariants preserved

| Invariant | Status |
|---|---|
| `wathiqcare_public_signing_session` is `HttpOnly` | Preserved |
| Cookie is `Secure` | Preserved |
| Cookie is `SameSite=lax` | Preserved |
| Cookie `Domain=.wathiqcare.online` | Preserved |
| Cookie `Max-Age=1797` (~30 min) | Preserved |
| `validatePublicSigningSession` strict tokenHash/tenantId/documentId/moduleType/signerRole check | Preserved on every post-OTP call |
| OTP challenge required before any clinical surface | Preserved — `POST /decision`, `POST /sign`, `POST /education` continue to call `validatePublicSigningSession` |
| `ensureOtpChallengeVerified(challengeId)` gate | Preserved |
| Audit chain (`appendAuditChainEvent`) | Preserved — pre-OTP bootstrap performs no document mutation, emits no audit event |
| Evidence package generation | Preserved (post-OTP only) |
| Signature validation | Preserved (post-OTP only) |
| No PHI before OTP | Enforced by type and by allowlist above |
| No client-side auth state | Preserved — session is HttpOnly server cookie only |
| No `localStorage`/`sessionStorage` for session | Preserved |

The pre-OTP payload contains nothing the patient was not already told in the SMS/email that delivered the signed link.

## 4. API response examples

### 4.1 Cold open (no cookie) — new in this change

Request:

```http
GET /api/public-signing/document/xYonm4Ro…Ko HTTP/1.1
Host: wathiqcare.online
```

Response:

```http
HTTP/1.1 200 OK
content-type: application/json

{
  "phase": "pre-otp",
  "bootstrap": {
    "documentId": "fb563744-6f93-472a-bd51-7b95e6476b18",
    "moduleType": "informed_consent",
    "signerRole": "PATIENT",
    "facilityName": "International Medical Center",
    "templateTitleAr": "موافقة على إجراء عملية الأمراض الناصر / والدة الأمومة",
    "templateTitleEn": "General Surgery Informed Consent",
    "locale": "ar",
    "educationRequired": true,
    "maskedMobile": null,
    "otpRequiredAt": "2026-05-27T22:30:00.123Z"
  }
}
```

### 4.2 Post-OTP (cookie present) — unchanged

Request:

```http
GET /api/public-signing/document/xYonm4Ro…Ko HTTP/1.1
Host: wathiqcare.online
cookie: wathiqcare_public_signing_session=<jwt>
```

Response: existing `PublicSigningDocumentPayload` shape (no `phase` discriminator). Bit-for-bit identical to the v1.0 production response.

### 4.3 Invalid cookie (tampered, wrong tokenHash, expired) — unchanged

Request:

```http
GET /api/public-signing/document/xYonm4Ro…Ko HTTP/1.1
cookie: wathiqcare_public_signing_session=<wrong-jwt>
```

Response:

```http
HTTP/1.1 401 Unauthorized
{ "error": "Invalid public signing session" }   // or "Public signing session expired"
```

A tampered or expired cookie is still rejected with 401 — the bootstrap branch only triggers when the cookie is **absent**, never as a fallback for a bad cookie. This preserves the security signal.

## 5. Backward compatibility

| Scenario | Behavior |
|---|---|
| New server + new client (this release) | Cold open → bootstrap → OTP → full payload. Works. |
| New server + **old** client (rolled-back HTML, fresh API) | Old client receives `{ phase: "pre-otp", bootstrap: {…} }` and treats it as `PublicSigningDocumentPayload`. The shape does not satisfy the type check on `documentData.education.required` etc., so the old client renders `error \|\| "Public signing workflow is unavailable."`. **This is identical to the pre-fix user-visible behavior** — no new failure mode introduced. Recommended sequence: ship client first, server second; verified safe either direction. |
| **Old** server + new client (rolled-back API, fresh HTML) | New client receives the existing 401 "Missing public signing session" on cold open. Falls through to the legacy `error` rendering path. Identical to today. |
| Mid-OTP user (already verified, cookie present) | Hits the post-OTP branch every time. Unchanged. |
| Already-signed document | Unchanged — cookie present → full payload → `signatureCaptured: true` → confirmation screen. |
| Expired token | `getSigningTokenContext` throws 404 inside `buildPreOtpBootstrapPayload`, so 404 is surfaced. Same behavior as today. |
| Reused token | Same as today — token state checks happen during `getSigningTokenContext` and during the post-OTP `validatePublicSigningSession`. |

API surface change: **additive only**. No existing response shape was altered. No existing endpoint was removed. The route handler's `NextResponse.json(payload)` accepts the discriminated union without any change to the route file.

## 6. Rollback plan

### 6.1 Build-level rollback (immediate, zero downtime)

Repoint production aliases to the prior known-good build:

```powershell
vercel alias set wathiqcare-discharge-refusal-i866h3wek-wathiqcare.vercel.app wathiqcare.online --scope wathiqcare
vercel alias set wathiqcare-discharge-refusal-i866h3wek-wathiqcare.vercel.app www.wathiqcare.online --scope wathiqcare
vercel alias set wathiqcare-discharge-refusal-i866h3wek-wathiqcare.vercel.app api.wathiqcare.online --scope wathiqcare
```

Rolling back to `i866h3wek` (UI Refresh re-enable build) restores the prior status quo, including the pre-OTP bug. No env var, cookie, or database change is required for rollback.

### 6.2 Code-level revert (if rollback must persist beyond one build)

```powershell
git revert 15e1b68
git push origin phase24-evidence-package-final
vercel deploy --prod --scope wathiqcare --yes
```

The change touches two files; revert is mechanical.

### 6.3 Why rollback is safe

- The post-OTP path is bit-for-bit identical to today. No data migration, no schema change, no env var change.
- Existing OTP sessions remain valid across rollback because the cookie shape and signing key are unchanged.
- The pre-OTP bug that the bootstrap fixes is the current production status quo (build `i866h3wek`), so rollback restores a known state.
- No audit chain entries, evidence packages, or signed PDFs are affected by the bootstrap path — it is read-only metadata.

## 7. Implementation summary

### 7.1 Server — `apps/web/src/lib/server/public-signing-service.ts`

- Added `PublicSigningPreOtpBootstrapPayload` and `PublicSigningWorkflowPayload` discriminated union types.
- Added `buildPreOtpBootstrapPayload(token)` private helper that loads only `Tenant.name`, `ConsentTemplate.titleAr/titleEn`, and the linked education package presence — no PHI fields are selected.
- Modified `getPublicSigningDocument` to short-circuit to the bootstrap when `request.cookies.get(getPublicSigningSessionCookieName())` is absent. Cookie-present path is unchanged.

### 7.2 Client — `apps/web/src/components/modules/PublicSigningWorkflow.tsx`

- Added `PreOtpBootstrap` type and `WorkflowFetchPayload` discriminated union.
- Added `bootstrap` state slice and `reloadKey` state.
- The initial `useEffect` now branches: pre-OTP → `setBootstrap`; verified → `setDocumentData`. Re-runs on `reloadKey` change.
- `verifyOtp()` now bumps `reloadKey` when the previous state was the pre-OTP bootstrap; this triggers a re-fetch that returns the full payload (the OTP cookie is now attached automatically).
- Added a pre-OTP render branch that shows only facility name, template title, and the OTP form. No clinical content is rendered.
- Added a `data-pre-otp-marker="v1"` attribute on the bootstrap section so the cold-open Playwright test can assert which branch rendered.

### 7.3 What did NOT change

- No middleware changes.
- No cookie name, attribute, or signing change.
- No route handler change.
- No DB schema, migration, or data shape change.
- No environment variable change.
- No change to `validatePublicSigningSession`, `ensureOtpChallengeVerified`, audit chain, evidence generation, or signature validation.

## 8. Validation matrix (executed against production after deploy)

See [PRE_OTP_BOOTSTRAP_VALIDATION.md](PRE_OTP_BOOTSTRAP_VALIDATION.md) (companion validation report — generated post-deploy).

| Surface | Browser | Expected | Verified |
|---|---|---|---|
| Cold open `/sign/<token>/workflow` | iPhone 14 Safari (fresh context) | Bootstrap renders OTP form with facility name + template title | post-deploy |
| Cold open `/sign/<token>/workflow` | iPhone 14 Safari (Private mode) | Bootstrap renders | post-deploy |
| Cold open `/sign/<token>/workflow` | Pixel 7 Chrome (fresh context) | Bootstrap renders | post-deploy |
| Cold open `/sign/<token>/workflow` | Desktop Chrome Incognito | Bootstrap renders | post-deploy |
| `GET /api/public-signing/document/<token>` with no cookie | curl | 200 + `phase: "pre-otp"` | post-deploy |
| `GET /api/public-signing/document/<token>` with valid cookie | curl | 200 + full payload (no `phase` key) | post-deploy |
| `GET /api/public-signing/document/<token>` with bad cookie | curl | 401 "Invalid public signing session" | post-deploy |
| `POST /decision` with no cookie | curl | 401 "Missing public signing session" | post-deploy |
| `POST /sign` with no cookie | curl | 401 "Missing public signing session" | post-deploy |
| Homepage / dashboards | Chrome | Unchanged | post-deploy |
| v1.1 UI Refresh marker on workflow | All | `data-ui-refresh="v1.1"` still present | post-deploy |
| Phase17 10-step smoke | curl | 10/10 PASS | post-deploy |

## 9. Open items

None blocking. Future enhancement: stash `signerMobile` on `ConsentDocument.metadata` at issuance time so `bootstrap.maskedMobile` can be pre-populated and the patient is presented with a masked confirmation (`+966 5•• ••• •772`) instead of being asked to retype the number. Not required for the current fix.
