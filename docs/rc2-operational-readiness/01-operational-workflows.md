# 01 — Operational Workflows

## 1. Scope

This document validates the end-to-end consent workflow from physician dispatch
through evidence-package generation.

## 2. Primary Workflow

| Step | Actor | System Action | Evidence Event |
|------|-------|---------------|----------------|
| 1 | Physician | Selects patient + procedure; dispatches consent | `DISPATCHED` |
| 2 | System | Resolves content mapping (CKE or IMC static library) | `consent_form_loaded_from_library` / `education_material_loaded` |
| 3 | Patient | Opens secure link (`/sign/{token}/workflow`) | `ACCESSED` |
| 4 | Patient | Reviews education material | `EDUCATION_VIEWED` |
| 5 | Patient | Chooses Accept or Refuse | `CONSENT_ACCEPTED` / `CONSENT_REFUSED` |
| 6 | Patient | Requests OTP to mobile + email fallback | `OTP_REQUESTED` |
| 7 | Patient | Enters OTP | `OTP_VERIFIED` / `OTP_VERIFY_FAILED` |
| 8 | Patient | Captures signature | `SIGNATURE_CAPTURED` / `REFUSAL_SIGNED` |
| 9 | System | Finalizes PDF, computes byte hash, stores evidence package | `PDF_FINALIZED` |
| 10 | System | Appends hash-chained audit event | `AUDIT_CHAIN_APPENDED` |

## 3. Supported Modules

- Informed Consent (`informed-consents`)
- Discharge / secure-link refusal
- Promissory notes (limited operational review; out of pilot scope)

## 4. Workflow Evidence Sources

- `ConsentDocument` record
- `ConsentSignature` records
- `AuditEvent` table
- `AuditChainEvent` hash chain (per case)
- `EvidencePackage` / `ConsentEvidencePackage` records
- `notificationDeliveryAttempt` records for OTP/link delivery
- `webhook_events` queue entries for signature orchestration

## 5. Key Configuration

| Parameter | Value | Location |
|-----------|-------|----------|
| OTP expiry | 10 minutes | `public-signing-service.ts:54` |
| OTP max attempts | 3 | `public-signing-service.ts:53` |
| Public signing session TTL | 30 minutes | `public-signing-service.ts:55` |
| Secure link TTL | 72 hours | `secure-links.ts:20` |
| SMS provider | Taqnyat | `taqniat-sms-adapter.ts` |
| Email providers | SMTP / Resend | `email-provider.ts` |
| PDF renderer | External container + Puppeteer fallback | `apps/pdf-renderer/` |

## 6. Findings

### 6.1 Workflow/SOP mismatch — OTP gating

- **Description:** `SOP_SECURE_SIGNING.md` §2.1 states OTP is gated on education
  being viewed AND a consent decision existing. The current service code
  (`public-signing-service.ts:1986-1991`) explicitly removed pre-OTP education
  and decision gates; OTP is requestable immediately after token validation.
  Education and decision are enforced only at `submitPublicSigningSignature`.
- **Severity:** Medium
- **Operational Impact:** Operators following the SOP may expect failed OTP
  requests before a decision; monitoring thresholds based on that expectation
  will be wrong.
- **Clinical Impact:** Low direct clinical impact because the final signature
  submission still enforces education + decision.
- **Recommendation:** Update `SOP_SECURE_SIGNING.md` §2.1 to reflect the actual
  sequence, or restore the pre-OTP gates if the SOP represents the intended
  legal design.
- **Estimated Effort:** 1–2 hours (doc) or 1 day (code).
- **Owner:** Program Operations + Legal Reviewer.

### 6.2 Secure link OTP is generated but not delivered

- **Description:** `requestPublicSecureLinkOtp` (`secure-links.ts:949-978`)
  creates a 6-digit OTP, stores its hash in the document payload, and returns
  `success: true` with a masked email, but it does **not** send the OTP to the
  recipient. The patient has no way to receive the code unless a separate
  caller exists.
- **Severity:** High
- **Operational Impact:** Secure-link OTP verification flow cannot be completed
  operationally; support load for discharge/refusal links will be high.
- **Clinical Impact:** Discharge acceptance/refusal decisions may be blocked,
  delaying patient exit workflow.
- **Recommendation:** Add email dispatch of the OTP in `requestPublicSecureLinkOtp`
  or document the external caller and confirm it is implemented.
- **Estimated Effort:** 2–4 hours.
- **Owner:** Engineering.

### 6.3 Duplicate signature prevention

- **Description:** `submitPublicSigningSignature` rejects submissions when a
  signature already exists for the signer role (`public-signing-service.ts:2366`).
- **Severity:** Low (positive finding)
- **Operational Impact:** Prevents accidental duplicate signatures and preserves
  audit-chain integrity.
- **Clinical Impact:** Ensures a single legally binding decision per role.
- **Recommendation:** None.
- **Estimated Effort:** N/A.
- **Owner:** N/A.

### 6.4 Public signing session expiry

- **Description:** The OTP-verified public session is valid for 30 minutes
  (`computePublicSessionExpiry`). There is no automatic extension or silent
  renewal.
- **Severity:** Low
- **Operational Impact:** Patients who pause longer than 30 minutes must restart
  from a freshly dispatched link.
- **Clinical Impact:** Manageable; aligns with the SOP expectation of a fresh
  gated session.
- **Recommendation:** Communicate the 30-minute window in the patient UI and in
  physician training.
- **Estimated Effort:** 30 minutes.
- **Owner:** Program Operations.
