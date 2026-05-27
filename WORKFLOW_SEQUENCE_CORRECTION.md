# WORKFLOW_SEQUENCE_CORRECTION — Public Signing Lifecycle Hotfix

**Date:** 2026-05-28
**Branch:** `phase24-evidence-package-final`
**Scope:** Public patient signing workflow (`/sign/[token]` route + supporting APIs)
**Severity:** UX-critical + Legal-correctness hotfix
**Backward compatibility:** Server-side relaxation; preserves all signature-time security gates.

---

## 1. Previous (invalid) sequence

The pre-correction lifecycle forced the patient to record a **legal consent decision before any identity verification had occurred**:

```
Bootstrap (cold-open landing)
   ↓
Education (clinical content presented BEFORE OTP)
   ↓
Consent Review (clinical content presented BEFORE OTP)
   ↓
Decision: Accept / Refuse        ← LEGAL ARTIFACT RECORDED PRE-IDENTITY
   ↓
OTP Request + Verify             ← identity verification AFTER decision
   ↓
Signature
   ↓
Confirmation
```

This sequence was enforced by:

- `requestSigningOtp(...)` in `apps/web/src/lib/server/public-signing-service.ts` throwing **409**:
  - `"Education must be completed and acknowledged before OTP can be requested"`
  - `"Consent decision is required before OTP can be requested"`
- `PublicSigningWorkflow.tsx` step indicator and conditional render gating the OTP card behind
  `decision.status !== "UNDECIDED"`.

### Why it was wrong

- **Legal:** A consent (or refusal) decision is a legally binding artifact. Recording it before the signer’s identity is verified (OTP) produces an artifact whose attribution cannot be defended.
- **UX:** Patients were forced to read full clinical content and commit to a decision before the system proved who they were — confusing trust posture and inverting the “verify, then disclose, then decide” order expected of regulated e-consent flows.
- **Security:** Decision events were recordable by anyone holding the token, with no challenge-of-possession (OTP) bound to the cookie that recorded the decision.

---

## 2. Corrected lifecycle

```
1. Bootstrap          → /sign/[token] cold open, NON-PHI metadata only
                        (template title, facility name). No clinical content.

2. OTP Request        → POST /api/sign/[token]/request-otp
                        Allowed immediately after token validation.
                        No education/decision pre-requisites.

3. OTP Verify         → POST /api/sign/[token]/verify-otp
                        Sets HttpOnly + Secure public-signing session cookie.

4. Education          → Full clinical disclosure pulled from
                        GET /api/public-signing/document/[token]
                        (only returns PHI when the verified session is present).
                        Patient acknowledges education.

5. Consent Review     → Patient reads full consent text + PDPL notice.

6. Decision           → POST /api/public-signing/document/[token]/decision
                        recordPublicDecisionEvent now requires a validated
                        public-signing session (verified OTP cookie).

7. Signature          → POST /api/public-signing/document/[token]/sign
                        submitPublicSigningSignature still enforces:
                          - OTP evidence (latestRequestedChallenge.otpHash)
                          - Education completed + acknowledged
                          - Decision != UNDECIDED
                          - Refusal acknowledged (refusal branch)

8. Confirmation       → Evidence package generated; signature receipt shown.
```

---

## 3. Legal rationale

| Principle | Pre-correction posture | Corrected posture |
|---|---|---|
| Identity before binding act | Decision recorded **before** OTP → unattributable artifact | OTP-verified session is a precondition for `recordPublicDecisionEvent` |
| Informed consent doctrine | Education shown pre-identity to an unverified party | Education shown only after identity proof, ensuring disclosure attaches to the verified signer |
| Non-repudiation of refusal | Refusal selectable by anyone holding the link | Refusal recorded against an OTP-bound session, preserving challenge-of-possession evidence |
| Audit chain integrity | Decision events landed before any OTP_REQUESTED entry | Audit chain now ordered: TOKEN_RESOLVED → OTP_REQUESTED → OTP_VERIFIED → EDUCATION_* → CONSENT_* → SIGNED |

---

## 4. UX rationale

- **Trust first:** Patients now see identity verification (“we will send you a one-time password”) before being asked to read clinical content. This matches the mental model of bank/government e-services they already trust.
- **Reduced abandonment:** The cold-open bootstrap surface is intentionally tiny (template title + mobile field). No PHI is rendered until OTP succeeds, so cold opens on shared/lost devices reveal nothing.
- **Linear progress:** The step indicator now reads OTP → Education → Consent Review → Decision → Signature → Confirmation, which is monotonic and matches the corrected server gates. The previous indicator showed OTP **after** Decision, which patients reported as confusing because they had to “go back” mentally to verify identity after committing.
- **Refusal parity:** The refusal branch retains its acknowledgement step, but it now occurs after OTP, so a refusal artifact is always tied to an identity-verified session.

---

## 5. Security preservation confirmation

The hotfix **relaxes** only the order in which OTP can be requested. All terminal security gates remain in place:

| Control | Status | Location |
|---|---|---|
| OTP verification required | ✅ Preserved | `validatePublicSigningSession` → `ensureOtpChallengeVerified` (unchanged) |
| HttpOnly session cookie | ✅ Preserved | `verify-otp/route.ts` sets `HttpOnly; Secure; SameSite=Lax` (unchanged) |
| Audit chain for OTP | ✅ Preserved | `appendAuditChainEvent("PUBLIC_SIGNING_OTP_REQUESTED" / "OTP_VERIFIED")` (unchanged) |
| Decision recording requires verified session | ✅ **Strengthened** | `recordPublicDecisionEvent` now calls `validatePublicSigningSession` when a `request` is passed (always true from the API route) |
| Signature requires OTP evidence | ✅ Preserved | `submitPublicSigningSignature` → `getLatestOtpEventByChallenge(... OTP_REQUESTED_EVENT)` 409 if missing |
| Signature requires education complete | ✅ Preserved | `submitPublicSigningSignature` → 409 if `!education.completed || !education.patientAcknowledged` |
| Signature requires decision | ✅ Preserved | `submitPublicSigningSignature` → 409 if `decision.status === "UNDECIDED"` |
| Signature requires refusal ack (refusal path) | ✅ Preserved | `submitPublicSigningSignature` → 409 if `CONSENT_REFUSED && !refusalAcknowledged` |
| No PHI before OTP | ✅ Preserved | `getPublicSigningDocument` returns `phase: "pre-otp"` non-PHI bootstrap when no session cookie is present |

### Endpoint posture matrix (post-hotfix)

| Endpoint | Before OTP | After OTP, before decision | After decision, before signature |
|---|---|---|---|
| `POST /api/sign/[token]/request-otp` | ✅ Allowed | ✅ Allowed (re-request) | ✅ Allowed |
| `POST /api/sign/[token]/verify-otp` | ✅ Allowed (sets cookie) | n/a | n/a |
| `GET /api/public-signing/document/[token]` | Returns `phase: "pre-otp"` bootstrap only | Returns full PHI payload | Returns full PHI payload |
| `POST /api/public-signing/document/[token]/decision` | ❌ **401** (no validated session) | ✅ Allowed | ✅ Allowed (re-record) |
| `POST /api/public-signing/document/[token]/education` | ❌ 401 (cookie required by `getPublicSigningDocument` for PHI; events are post-OTP) | ✅ Allowed | ✅ Allowed |
| `POST /api/public-signing/document/[token]/sign` | ❌ 401 (session) | ❌ 409 (no decision) | ✅ Allowed if education+decision+OTP evidence present |

---

## 6. Code changes

### `apps/web/src/lib/server/public-signing-service.ts`

1. **`requestSigningOtp`** — removed the two pre-OTP 409 gates:
   - `"Education must be completed and acknowledged before OTP can be requested"`
   - `"Consent decision is required before OTP can be requested"`
2. **`recordPublicDecisionEvent`** — added `validatePublicSigningSession` call before token-context resolution, requiring the OTP-verified session cookie.

### `apps/web/src/components/modules/PublicSigningWorkflow.tsx`

3. Added a `useEffect` that sets `otpVerified = true` whenever `documentData` is populated. (When the server returns a full document payload, the public-signing session cookie has already been validated by `validatePublicSigningSession`, which implies a verified OTP challenge.)
4. Reordered the step indicator stages from `[Education, Consent Review, Decision, OTP, Signature, Confirmation]` to `[OTP Verification, Education, Consent Review, Decision, Signature, Confirmation]` (with parallel refusal-branch reordering).
5. Removed the legacy in-flow OTP card that previously rendered only after decision; OTP is now serviced exclusively by the pre-OTP bootstrap surface.
6. Updated the signature section helper copy that referenced the obsolete “before OTP and signing” phrasing.

### Unchanged on purpose

- All signature-time gates in `submitPublicSigningSignature`.
- All audit-chain writers (`appendAuditChainEvent`, `writePublicConsentAudit`, `recordEvidenceEvent`).
- HttpOnly/Secure cookie issuance in `verify-otp/route.ts`.
- Bootstrap PHI redaction in `buildPreOtpBootstrapPayload`.

---

## 7. Verification matrix

| Scenario | Expected | Where enforced |
|---|---|---|
| Cold open `/sign/[token]` | Bootstrap (non-PHI) renders; mobile field shown | `getPublicSigningDocument` → `phase: "pre-otp"` |
| OTP request immediately after cold open | 200 (no education/decision precondition) | `requestSigningOtp` — gates removed |
| OTP verify with valid code | 200 + HttpOnly cookie | `verifyPublicSigningOtp` (unchanged) |
| Education render after OTP | Full PHI payload returned | `getPublicSigningDocument` → `validatePublicSigningSession` |
| Decision before OTP (replay attempt) | 401 Invalid public signing session | `recordPublicDecisionEvent` → `validatePublicSigningSession` |
| Decision after OTP | 200 | same |
| Signature before decision | 409 Consent decision is required before signature capture | `submitPublicSigningSignature` (unchanged) |
| Signature before education ack | 409 Education must be completed and acknowledged before signature capture | same |
| Signature without OTP evidence | 409 Missing OTP evidence for this signing session | same |
| Refusal signature before refusal ack | 409 Refusal acknowledgement is required | same |

### Phase17 smoke

The existing `__phase17_smoke.ps1` exercises the **physician-side** consent draft pipeline (login → templates → generate-draft → endpoint reachability for signature/secure-signing/evidence). It does not exercise the public-signing OTP/decision ordering directly, and its reachability probes accept 4xx as "endpoint exists". Re-running it after deploy is required only to confirm the physician-side regression baseline.

Patient-side ordering is verified by:
- `apps/web/src/lib/server/public-signing-service.ts` unit invariants (signature gates above), and
- the end-to-end browser walkthrough scripts under `__preview_landing_walkthrough.cjs` / `__ui_refresh_reenable_walkthrough.cjs`.

---

## 8. Rollback

Revert the three edits in this branch and redeploy the previous tagged build (`wathiqcare-informed-consent-pilot-ready-v1.0.1`). No data migrations are involved; the only persisted state affected by this change is the temporal ordering of audit events.

---

## 9. Controlled production hotfix plan

1. CI build of `phase24-evidence-package-final`.
2. Vercel preview deploy → smoke against preview alias.
3. Promote to production alias `wathiqcare.online`.
4. Re-run `__phase17_smoke.ps1` against production (physician baseline).
5. Manual patient-side cold-open verification:
   - Visit `/sign/<token>` with cleared cookies → confirm bootstrap renders (no PHI).
   - Request OTP from the bootstrap surface → confirm 200.
   - Verify OTP → confirm session cookie set + document payload returned.
   - Walk through Education → Consent → Decision → Signature.
6. Confirm audit chain ordering on the resulting `consent_audit_log` entries.

Rollback target alias: previously-tagged v1.0.1 deployment.
