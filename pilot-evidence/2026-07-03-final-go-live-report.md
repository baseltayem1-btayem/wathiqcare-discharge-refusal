# IMC Physician Pilot – Final Go-Live Delivery Report

**Date:** 2026-07-03  
**Pilot URL:** https://wathiqcare.online  
**Branch:** `release/imc-physician-pilot-20260704`  
**Latest commit:** `b9018478 fix(otp): deliver signing OTP to pilot override inbox when enabled`  
**Deployment:** https://wathiqcare-discharge-refusal-hcbusb1xt-wathiqcare.vercel.app (aliased to `wathiqcare.online`)

---

## 1. Production Fixes Deployed

| Fix | Commit / File | Status |
|---|---|---|
| Run SQL migrations as part of the Vercel build | `apps/web/vercel.json` | ✅ Deployed & passing |
| Evidence-package migration with TEXT keys | `apps/web/prisma/migrations/0034_evidence_package_2_0_text_keys.sql` | ✅ Deployed & passing |
| OTP delivered to accessible pilot override inbox | `apps/web/src/lib/server/public-signing-service.ts` | ✅ Committed & deployed |

Migrations run on every production build with expected warnings for already-existing objects.

---

## 2. Environment Variables (Production)

| Variable | Value | Purpose |
|---|---|---|
| `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED` | `true` | Activates pilot email override for signing OTP/link |
| `PILOT_EMAIL_OVERRIDE_RECIPIENT` | `Basel@linagroups.com` | Accessible admin inbox that receives OTP copies |
| `PILOT_PATIENT_SEND_ALLOWLIST_EMAIL` | `Basel@linagroups.com` | Allowed patient/test email for pilot send |
| `PILOT_PATIENT_SEND_ALLOWLIST_MOBILE` | `+966543587771` | Allowed patient/test mobile for pilot send |
| `FF_PATIENT_FACING_PILOT_SEND` | `true` | Enables real patient-facing send flow |

All variables are active on the current production deployment.

---

## 3. SMS Status

**Result: WORKING**

- Send endpoint reports `smsDeliveryStatus: "sent"`.
- Audit records show provider `sms_proxy`, status `sent`, HTTP `201`.
- The earlier `TAQNYAT_DELIVERY_FAILED` path is bypassed because the environment now uses the configured SMS proxy (`SMS_PROXY_URL`, `SMS_PROXY_SECRET`, `SMS_PROXY_SENDER_NAME`).

---

## 4. Email / OTP / Signing Results

| Step | Endpoint / Action | Result |
|---|---|---|
| Physician login | `POST /api/auth/password/login` | ✅ 200, session cookie issued |
| Send secure signing link | `POST /api/modules/informed-consents/send` | ✅ 200, link + SMS + email sent |
| Patient link SMS | TAQNYAT/SMS proxy | ✅ `sent` |
| Patient link email | SMTP → `Basel@linagroups.com` | ✅ `sent` (messageId `6f81fa2a-...`) |
| Request OTP | `POST /api/sign/{token}/request-otp` | ✅ 200, challenge created |
| OTP email to patient | SMTP → `Basel@linagroups.com` | ✅ `sent` |
| OTP override email | SMTP → `Basel@linagroups.com` | ✅ `sent` (audit id `f1d1b417-...`) |
| Verify OTP | `POST /api/sign/{token}/verify-otp` | ✅ 200 `verified: true` |
| Load signing document | `GET /api/public-signing/document/{token}` | ✅ 200, full payload |
| Record decision | `POST .../decision` (CONSENT_ACCEPTED) | ✅ 200 |
| Patient signature | `POST .../sign` | ✅ 200, document `SIGNED` |
| Evidence packages | DB `consent_evidence_packages` | ✅ PATIENT_COPY, MEDICAL_RECORD_COPY, LEGAL_ARCHIVE_COPY created |
| Patient final PDF | `GET /api/public/informed-consents/signing/{token}/final-pdf` | ✅ Returns valid `%PDF-1.4` document |

Test document: `129b6fe0-ef45-42ac-a6dc-abc895d9683e`  
Patient: `Mohammed Ibrahim Al-Rashidi` (`MRN-2024-0847`)  
Mobile: `+966543587771`  
Email: `Basel@linagroups.com`

---

## 5. Negative Tests

| Test | Expected | Actual |
|---|---|---|
| Non-allowlisted recipient (`test@wathiqcare.med.sa` / `+966500000001`) | Blocked | ✅ 403 `Recipient is not approved for pilot send` |
| Wrong OTP | Rejected | ✅ 200 `verified: false`, `attemptsRemaining: 2` |
| Final PDF before signature | Blocked | ✅ 409 `Signature status must be signed or finalized before PDF generation` |
| Internal review mode / draft illustrations in patient payload | Not exposed | ✅ Public payload uses `getApprovedIllustrationsForDocument`; `illustrations` array contains only approved content |

---

## 6. Known Limitations

1. **Physician signature required for fully sealed final PDF.**  
   The patient signature produces a `SIGNED` document and patient/medical/legal evidence copies. The signing response notes that a physician signature is mandatory before full finalization. The current secure-signing session creates only a `PATIENT` signer; physician capture happens in the physician workspace prior to send or via a separate workflow.

2. **OTP retrieval depends on the accessible inbox/SMS.**  
   The override delivers the OTP to `Basel@linagroups.com` and the patient mobile `+966543587771`. The pilot team must monitor one of these channels during live sessions.

3. **Vercel Node.js 20 deprecation warning.**  
   Builds succeed but warn that Node 20 is deprecated after 2026-10-01. This is not a pilot-day blocker; upgrade to Node 24 should be scheduled post-pilot.

4. **Migration warnings.**  
   `run-sql-migrations.cjs` reports expected warnings for pre-existing types/columns/checksums. These are non-blocking.

---

## 7. Pilot Credentials

| Role | Email | Password |
|---|---|---|
| Pilot physician | `dr.ahmed@wathiqcare.med.sa` | `IMC@imc2026` |

Test patient: `Mohammed Ibrahim Al-Rashidi`, MRN `MRN-2024-0847`, case `a4173dc9-5e40-4204-9b2c-4712abb6c7fa`.

---

## 8. Rollback Plan

1. **Code rollback:** revert to previous deployment/commit on `release/imc-physician-pilot-20260704` or use Vercel dashboard to promote the previous production deployment.
2. **Env rollback:** set `PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED` to `false` and clear `PILOT_EMAIL_OVERRIDE_RECIPIENT` to stop override deliveries.
3. **SMS fallback:** if SMS proxy fails, pilot send still falls back to email OTP/link via the override inbox.

---

## 9. Readiness Verdict

**🟢 GO for IMC physician pilot Day 1.**

- Domain alias, build pipeline, and migrations are stable.
- SMS and email delivery are both working.
- OTP is retrievable via the accessible override inbox.
- The patient can verify OTP, accept consent, sign, and receive a PDF.
- Negative controls (allowlist, wrong OTP, pre-signature PDF) are enforced.
