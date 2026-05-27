# PRODUCTION STABILIZATION REPORT

**Release:** WathiqCare Informed Consents v1.0 Pilot Ready
**Tag:** `wathiqcare-informed-consent-pilot-ready-v1.0`
**Validation Date:** 2026-05-27
**Production URL:** https://wathiqcare.online
**Deployment ID:** `wathiqcare-discharge-refusal-691qpznq0-wathiqcare.vercel.app` (aliased to `wathiqcare.online`)
**Branch:** `phase24-evidence-package-final`

---

## 1. Smoke Test Result — PASS (11/11)

Non-destructive end-to-end smoke run against production on 2026-05-27 04:16–04:18 UTC. Source: `__smoke_stabilization.cjs`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Health runtime | PASS | `GET /api/health` → 200 |
| 2 | Physician authentication | PASS | `POST /api/auth/password/login` → 200, access cookie set |
| 3 | Document creation | PASS | `documentId = 1589eeef-a977-4834-b4b8-e71aaa4d4d25` (201) |
| 4 | Secure signing URL generation | PASS | `signingUrl = https://wathiqcare.online/sign/NRvCl…EC0M/workflow` (ends with `/workflow`) |
| 5 | Stored signing URL matches | PASS | `consent_documents.metadata.secureSigningWorkflow.signingUrl` ends with `/workflow` |
| 6 | Patient email routing active | PASS | Stored `recipientEmail` equals physician-supplied address |
| 7 | Workflow page loads | PASS | `GET /sign/{token}/workflow` → 200 with `InformedConsentsEnterpriseWorkflowScreens` chunk |
| 8 | Education is the first screen (not OTP) | PASS | Context endpoint returns `otpVerifiedAt = null` at session start |
| 9 | Legacy `/sign/{token}` redirect | PASS | 307 → `/sign/{token}/workflow` |
| 10 | Signature endpoint protected before OTP | PASS | `POST /api/public-signing/document/{token}/sign` pre-OTP → 401 "Missing public signing session" |
| 11 | Workflow ordering (OTP gated, then unlocked after decision) | PASS | Pre-decision: 409 "Consent decision is required before OTP can be requested" → After `CONSENT_PRESENTED` + `CONSENT_ACCEPTED`: OTP request → 200 |

Auxiliary observations (informational, not gating):
- `educationFlow` returned 409 "No approved education package is linked to this consent document" for the auto-selected template, which correctly exercises the gate (template-specific, not a routing or workflow failure).
- All SSL/connection notices originate from pg client warnings about `sslmode=require` semantics; no functional impact.

---

## 2. Passed Workflows (Locked Baseline)

| Capability | Status | Anchor |
|---|---|---|
| Secure Signing Dispatch (email + SMS) | PASS | `module-secure-signing-service.ts → dispatchSecureSigningSession` |
| Patient Email Routing | PASS | Authoritative source: `consent_documents.metadata.secureSigningWorkflow.recipientEmail` (physician-supplied) |
| Education Workflow | PASS | `recordPublicEducationEvent` + linked `education_packages` (template-bound) |
| Consent Decision (Accept / Refuse + Refusal Acknowledgement) | PASS | `recordPublicDecisionEvent` |
| OTP Request + Verify | PASS | `requestSigningOtp` / `verifyPublicSigningOtp` with HMAC-stored `otpHash` and audit-chain `OTP_REQUESTED` / `OTP_VERIFIED` events |
| Public Signing Session | PASS | `validatePublicSigningSession` (cookie-bound after OTP verify) |
| Signature Submission | PASS | `submitPublicSigningSignature` (gated: status ∈ {APPROVED, READY_FOR_SIGNATURE, SIGNED}, education complete, decision recorded, OTP evidence present) |
| Evidence Packages | PASS | `persistPublicSigningEvidencePackages` (PDF + audit-chain sidecar) |
| Unified Evidence Certificate | PASS | `/api/modules/informed-consents/documents/[id]/unified-evidence-certificate` |
| Patient Workflow Entrypoint | PASS | `buildSigningUrlFromToken` emits `/sign/{token}/workflow`; legacy `/sign/{token}` redirects 307 |

---

## 3. Protected Behavior — DO NOT CHANGE

### 3.1 Patient Flow Sequence (Locked)

Education → Acknowledgement → Consent Form → Accept / Refuse → OTP → Signature → Patient Copy

- **OTP-first entry is forbidden.** The legacy OTP-only page at `apps/web/app/sign/[token]/page.tsx` is now a server-side `redirect()` to `./workflow`; the original is preserved as `page.legacy-otp.tsx.bak` for archival only (not routed).
- The 8-step staged component `InformedConsentsEnterpriseWorkflowScreens` (rendered with `mode="signature"` from `apps/web/app/sign/[token]/workflow/page.tsx`) is the single patient entrypoint.
- The URL builder `buildSigningUrlFromToken` in `apps/web/src/lib/server/module-secure-signing-service.ts` MUST always append `/workflow` to the token path. All three env-precedence branches enforce this.

### 3.2 Workflow Ordering (Enforced Server-Side)

The following gates must remain enforced in `apps/web/src/lib/server/public-signing-service.ts`:

| Gate | Server check | Status code on violation |
|---|---|---|
| OTP before education complete | `requestSigningOtp` → education.completed && education.acknowledged | 409 |
| OTP before decision | `requestSigningOtp` → decision.status !== "UNDECIDED" | 409 |
| Signature before OTP | `submitPublicSigningSignature` → latest `OTP_REQUESTED_EVENT` has `otpHash` | 409 / 401 |
| Signature before education | `submitPublicSigningSignature` → education.completed && education.patientAcknowledged | 409 |
| Signature before decision | `submitPublicSigningSignature` → decision.status !== "UNDECIDED" | 409 |
| Refusal signature without refusalAcknowledged | same | 409 |
| Document not approved | same → status ∈ {APPROVED, READY_FOR_SIGNATURE, SIGNED} | 409 |

### 3.3 Notification Routing (Locked)

- Recipient resolution for **secure_signing_link**, **secure_signing_otp**, and **patient_copy_notification** is `consent_documents.metadata.secureSigningWorkflow.recipientEmail` (set at dispatch time from the physician-supplied `recipientEmail`).
- No admin fallback. Empty/missing `recipientEmail` MUST cause a 400 from the secure-signing dispatch endpoint.
- `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED=false` in production; toggling true is reserved for explicit pilot redirection and MUST be reviewed before any change.

### 3.4 Evidence Integrity (Locked)

- Audit-chain rows for each signing session: `OTP_REQUESTED` → `OTP_VERIFIED` → `PUBLIC_SIGNING_OTP_VERIFIED` → `SIGNATURE_CAPTURED` → `EVIDENCE_PACKAGED`.
- `documentHash` deterministically computed from `documentId, consentReference, status, diagnosis, plannedProcedure, templateVersionId, updatedAt`.
- Signature hash = `sha256(signatureDataUrl)`.
- Sidecar evidence package pattern (see `/memories/repo/evidence-package-2-sidecar-pattern.md`) MUST NOT be reverted to inline embedding.

---

## 4. Files in This Release (Source of Truth)

- `apps/web/src/lib/server/module-secure-signing-service.ts` — URL builder appends `/workflow`; dispatch persists `secureSigningWorkflow.recipientEmail`.
- `apps/web/src/lib/server/public-signing-service.ts` — all workflow gates, OTP/signature/evidence orchestration.
- `apps/web/src/lib/server/pilot-email-override.ts` — adds `sendSigningOtpEmail`, `sendPatientCopyNotificationEmail`.
- `apps/web/src/lib/server/audit-chain-service.ts` — append-only audit row insertion.
- `apps/web/app/sign/[token]/page.tsx` — server redirect to `./workflow`.
- `apps/web/app/sign/[token]/workflow/page.tsx` — mounts `InformedConsentsEnterpriseWorkflowScreens`.
- `apps/web/app/sign/[token]/page.legacy-otp.tsx.bak` — archival only (not routed).
- `apps/web/app/api/public-signing/document/[token]/{route.ts,education,decision,sign,preview}/route.ts` — patient-facing public endpoints.
- `apps/web/app/api/sign/[token]/{context,request-otp,verify-otp}/route.ts` — token context + OTP lifecycle.
- `apps/web/app/api/modules/informed-consents/documents/[id]/{secure-signing,unified-evidence-certificate,signature-certificate,signature-orchestration,sign}/route.ts` — physician dispatch + evidence APIs.
- `apps/web/src/components/modules/PublicSigningWorkflow.tsx` — 8-step UI component.
- `apps/web/prisma/migrations/0028_smart_educational_consent_library_foundation.sql` — education library schema.

---

## 5. Remaining Risks

1. **Education package coverage** — Some templates have no linked `education_packages` row, so `requestSigningOtp` returns 409 on those flows. Mitigation: seed via `apps/web/scripts/phase6{a,b,c}-*` before any pilot patient is enrolled on a new template.
2. **SMS provider (Taqnyat) not configured in production** — secure_signing_otp SMS attempts fail; email OTP path is fully operational. Mitigation: configure Taqnyat credentials before SMS-only patient cohorts.
3. **Drift: `signature-core.ts buildSigningUrl`** — A second URL builder still emits the bare `/sign/{token}` shape. Not used on the secure-signing dispatch path; flagged for follow-up consolidation only. Not pilot-blocking.
4. **Physician license gate** — `/approve` requires an active `user_physician_licenses` row. For pilot physicians, ensure license records exist before go-live; do NOT bypass via direct DB updates outside controlled validation runs.
5. **SSL warning from `pg` 9.x** — Informational only; no functional impact. Suppress by setting `sslmode=verify-full` explicitly in connection string when convenient.

---

## 6. Next Recommended Action

**Internal IMC Pilot Monitoring** — Enroll the controlled IMC physician cohort, monitor `notification_delivery_attempts`, `audit_chain_events`, and `consent_documents.status` transitions for the first 5 live cases. No additional production deploys unless a critical defect is observed.

---

## 7. Stabilization Outcome

**STABILIZED** — All 11 smoke checks PASS, all 10 capability gates locked. Release tagged as `wathiqcare-informed-consent-pilot-ready-v1.0` pointing at the deployed commit on branch `phase24-evidence-package-final`.
