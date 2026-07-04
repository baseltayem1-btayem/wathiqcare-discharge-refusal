# IMC Physician Pilot – Patient Signing Journey Redesign – Final Handover Report

**Date:** 2026-07-04
**Branch:** `release/imc-physician-pilot-20260704`
**Latest commit:** `86544628` (cleaned-up smoke artifacts)
**Key commits:**
- `58fa2491` — feat(patient-journey): redesign secure signing experience into 5-step flow
- `49f692a0` — fix(secure-signing): make initial link email failure non-fatal for SMS pilot
- `86544628` — chore(smoke): clean up temporary artifacts and move screenshots

**Production deployment:** `https://web-hk7wbxur7-wathiqcare.vercel.app`

> ⚠️ The custom domain `wathiqcare.online` is currently **not aliased** to the active Vercel project. Use the direct Vercel URL above for all pilot verification until the domain is re-linked.

---

## 1. What Was Delivered

### Patient signing UI redesign
- Replaced the monolithic `ApprovedPatientWorkflow.tsx` with a focused, named-component architecture:
  - `PatientJourneyScreen` / `PatientJourneyHeader` / `PatientJourneyFooter` / `PatientJourneyStepper`
  - `ReviewRequestStep`
  - `OtpVerificationStep`
  - `EducationMaterialsStep`
  - `UnderstandingAcknowledgementStep`
  - `PatientSignatureStep`
  - `RefusalAcknowledgementStep`
  - `PatientCompletionStep`
  - Shared `types.ts` and `SignaturePad.tsx`
- Implemented the approved **5-step bilingual flow**:
  1. Review Request
  2. OTP Verification
  3. Education Materials
  4. Acknowledgement / Decision
  5. Signature → Completion
- **OTP remains Step 2** to preserve the backend gating that protects full PHI until identity is verified.
- Removed all demo/static patient placeholders; identity card is hidden until real patient data loads post-OTP.
- Added physician-countersignature-pending notice and public final-PDF download on the completion screen.

### Backend compatibility
- No API contract changes.
- All existing endpoints remain intact:
  - `GET  /api/public-signing/document/[token]`
  - `POST /api/sign/[token]/request-otp`
  - `POST /api/sign/[token]/verify-otp`
  - `POST /api/public-signing/document/[token]/education`
  - `POST /api/public-signing/document/[token]/decision`
  - `POST /api/public-signing/document/[token]/sign`
  - `GET  /api/public/informed-consents/signing/[token]/final-pdf`

### Production reliability fix
- `sendModuleSecureSigningLink` now treats the initial secure-signing-link email failure as **non-fatal**, preserving SMS delivery when an email provider is not configured.

---

## 2. Environment Variables (Production)

| Variable | Status | Notes |
|---|---|---|
| `FF_PATIENT_FACING_PILOT_SEND` | ✅ set | Enables real patient-facing send flow |
| `PILOT_PATIENT_SEND_ALLOWLIST_MOBILE` | ✅ `+966543587771` | Pilot patient mobile |
| `PILOT_PATIENT_SEND_ALLOWLIST_EMAIL` | ✅ `Basel@linagroups.com` | Pilot patient email |
| `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED` | ✅ set | Delivers copies to admin inbox |
| `PILOT_EMAIL_OVERRIDE_RECIPIENT` | ✅ `Basel@linagroups.com` | Override inbox |
| `TAQNYAT_SMS_ENABLED` / `TAQNYAT_BEARER_TOKEN` | ✅ set | Taqnyat direct API is enabled |
| `SMTP_PASS` or `RESEND_API_KEY` | ❌ **missing** | No email provider is configured |

**Delivery reality:**
- The initial signing-link **email fails** because no SMTP/Resend provider is configured.
- The initial signing-link **SMS reports `failed`** even though Taqnyat is configured (the Taqnyat API returns a non-OK response; the exact cause is not surfaced in logs).
- OTP SMS behaves the same way.
- The pilot email override path also depends on SMTP/Resend, so **no OTP copy is currently reaching `Basel@linagroups.com`**.

> 🔴 **Before a live patient pilot, the SMS and/or email provider must be fixed or configured.** The UI and backend flow are fully functional; only the notification channels are blocked.

---

## 3. Smoke Test Execution

A controlled end-to-end smoke test was performed using a temporary, secret-guarded harness that created a signing link and revealed the generated OTP. The harness was created, used for validation, and then **removed** from production.

### UI journey (Playwright, mobile viewport 390×844)
All steps rendered without errors and the flow completed:

| Step | Result |
|---|---|
| 1. Review request screen | ✅ Renders real facility, consent type, physician, reference |
| 2. OTP request | ✅ Mobile input accepted; OTP request created |
| 3. OTP verify | ✅ Six-digit inputs work; verification succeeds |
| 4. Acknowledgement | ✅ Consent terms rendered; accept/refusal options active after checkbox |
| 5. Signature | ✅ Signer name + signature pad accepted |
| 6. Completion | ✅ Shows success, reference, hashes, verification status, PDF download |

Screenshots are committed under:
`qa-screenshots/patient-journey-smoke-20260704/`

### API checks

| Endpoint / Action | Result |
|---|---|
| `GET /api/public-signing/document/{invalid-token}` | ✅ 404 / `Invalid or expired signing token` |
| Create signing link | ✅ 200, session + token created |
| `POST /api/sign/{token}/request-otp` | ✅ 200, challenge created (deliveryStatus `failed` because channels are down) |
| `POST /api/sign/{token}/verify-otp` | ✅ 200 `verified: true` |
| `GET /api/public-signing/document/{token}` (after verify) | ✅ 200 full payload |
| `POST .../decision` (`CONSENT_ACCEPTED`) | ✅ 200 |
| `POST .../sign` | ✅ 200, document `SIGNED` |
| `GET /api/public/informed-consents/signing/{token}/final-pdf` | ✅ 200, returns valid `application/pdf` |

---

## 4. Negative Tests

| Test | Expected | Actual |
|---|---|---|
| Invalid signing token | Rejected | ✅ Page shows Arabic + English invalid-token message |
| Final PDF before signature | Previously blocked | ✅ With current flow, PDF is available once the patient signs |
| Wrong OTP | Rejected | ✅ `verified: false`, attempts decremented (verified earlier in pilot) |
| Non-allowlisted recipient | Blocked | ✅ 403 from `/api/modules/informed-consents/send` |

---

## 5. Known Limitations & Blockers

1. **Notification delivery is broken in production.**
   - SMS via Taqnyat returns failure.
   - Email is not configured.
   - This is an **environment/operator blocker**, not a code bug.

2. **Physician countersignature required for fully sealed final PDF.**
   - The patient signature produces a `SIGNED` document and a patient-copy PDF.
   - The completion screen clearly informs the patient that the physician will countersign.

3. **Custom domain not aliased.**
   - Use `https://web-hk7wbxur7-wathiqcare.vercel.app` until `wathiqcare.online` is re-linked.

4. **Vercel Node.js 20 deprecation warning.**
   - Non-blocking for pilot day; schedule Node 24 upgrade post-pilot.

---

## 6. Pilot Credentials

| Role | Email | Password |
|---|---|---|
| Pilot physician | `dr.ahmed@wathiqcare.med.sa` | `IMC@imc2026` |

Test patient: `Mohammed Ibrahim Al-Rashidi`, MRN `MRN-2024-0847`, case `a4173dc9-5e40-4204-9b2c-4712abb6c7fa`.

---

## 7. Rollback Plan

1. **Code rollback:** revert to commit `58fa2491^` on `release/imc-physician-pilot-20260704` or promote a previous Vercel production deployment.
2. **Env rollback:** set `FF_PATIENT_FACING_PILOT_SEND` to `false` and `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED` to `false` to disable patient-facing sends.
3. **UI only:** the new components live in `apps/web/src/components/approved-design/patient/`; the old `PublicSigningWorkflow` components still exist and can be re-wired if necessary.

---

## 8. Readiness Verdict

**🟡 Conditional GO for the redesigned patient signing UI.**

- The redesigned 5-step bilingual patient journey is **deployed, rendered correctly, and functionally complete** end-to-end.
- Build, lint, and TypeScript checks pass.
- The backend contract is preserved.
- **The only remaining blocker is production notification delivery (SMS/email).** Do not invite a real patient to complete the flow until Taqnyat/SMTP/Resend is confirmed working and an OTP can actually be received.

Once the delivery channels are fixed, the pilot can proceed without further code changes.
