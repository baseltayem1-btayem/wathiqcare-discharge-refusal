# SOP — Secure Signing

**Audience:** Operations, engineering on-call, security.
**Release:** v1.0.1
**Scope:** Operational procedures for the secure-signing subsystem.

---

## 1. Secure Link Issuance

### 1.1 Issuance flow

1. Physician initiates dispatch via the consent dispatch UI (`PILOT_USER_GUIDE_PHYSICIAN.md` §2).
2. Backend generates a high-entropy opaque token (cryptographically random; non-guessable).
3. Token is bound to: patient ID, tenant ID, consent document ID, template version, dispatching physician ID, issuance timestamp, TTL.
4. SMS containing the URL `https://wathiqcare.online/sign/<token>/workflow` is dispatched via the approved SMS provider.
5. Audit event `DISPATCHED` is appended.

### 1.2 Properties of the token

- Single-use for completion (after `PDF_FINALIZED`, the token cannot resume a new session).
- Bound to one consent document — cannot be reused for a different document.
- Tenant-scoped — server lookups always include tenant ID; cross-tenant resolution is impossible.
- Opaque — token does not encode PII.

### 1.3 Revocation

- Physician-initiated via timeline `Revoke Link`.
- Operations-initiated via the platform-tenant tools (only by named operators).
- Revocation appends an audit event and invalidates the token immediately.

---

## 2. OTP Validation

### 2.1 Request

- Endpoint: `POST /api/sign/{token}/request-otp`.
- Gate: server returns 409 unless education has been viewed AND a consent decision exists. (Verified by smoke check `otpGatedBeforeDecision`.)
- Code: 6-digit numeric, cryptographically random.
- TTL: as configured per environment (default short-lived).
- Delivery: SMS to the patient's registered mobile via approved provider. UI displays masked phone + delivery status.

### 2.2 Verify

- Endpoint: `POST /api/sign/{token}/verify-otp`.
- Constant-time comparison.
- Lockout / cool-down: after a configured number of failed attempts, OTP is locked for a cool-down window.
- Re-request: a new request invalidates any previously issued unverified code.
- On success, server marks `OTP_VERIFIED` with timestamp and unlocks the signature endpoint for this session only.

### 2.3 Signature submission

- Endpoint: protected — 401 if no valid public-signing session cookie; 409 if decision/OTP gates not satisfied. (Verified by smoke check `signatureProtectedBeforeOtp`.)
- On success, signature artifact is stored, PDF is generated, hashed, and the audit chain is closed with `PDF_FINALIZED`.

---

## 3. Biometric Future Path (out of scope for v1.0.1, design preserved)

The current identity binding is **OTP-based**. The signing subsystem is designed to allow stronger or additional factors without changing the public contract.

### 3.1 Candidate factors

- **WebAuthn / FIDO2** — strongest, where the patient device supports a platform authenticator.
- **Mobile-OS biometric** (TouchID, FaceID, Android BiometricPrompt) wrapped in WebAuthn ceremony.
- **Government-issued digital identity** (Nafath / similar) — if integration is sanctioned by IMC and regulators.

### 3.2 Design constraints for future activation

- Must be additive: existing OTP path remains as fallback for patients without compatible devices.
- Must extend the audit chain (e.g., `WEBAUTHN_VERIFIED` event) without breaking existing evidence packages.
- Smoke harness must add a corresponding gate before promotion.
- Legal reviewer must reaffirm defensibility.

### 3.3 Operating principle

> Identity binding strength may only increase across releases, never decrease.

---

## 4. Incident Handling

### 4.1 Severity definitions

| Sev | Definition | Examples |
|---|---|---|
| **P1** | Patient harm potential, data loss, cross-tenant leak, audit-chain corruption, identity-binding bypass. | Wrong patient PDF generated; OTP-less signature accepted; cross-tenant data visible. |
| **P2** | Material operational degradation, no immediate patient harm. | OTP delivery <90% sustained; smoke degraded one or more checks; widespread UX failure. |
| **P3** | Minor degradation. | One patient unable to complete due to local device; cosmetic defect. |

### 4.2 Response

- P1 — page on-call immediately; halt new dispatches at tenant level; preserve evidence; execute rollback procedure (`PILOT_READINESS_MASTER.md` §5.3) if any §5.1 trigger met.
- P2 — page on-call; mitigate; decide pause-and-review per `PILOT_READINESS_MASTER.md` §5.2.
- P3 — log and triage during business hours.

### 4.3 Post-incident

- Every P1 and P2 gets a written postmortem within 48h.
- Every P1 root cause must add a corresponding gate to the smoke harness before any new promotion.

---

## 5. Expired Links

### 5.1 Behavior

- Server rejects requests against an expired token with a stable, non-PII error message and audit event `EXPIRED`.
- Patient sees a "link expired" screen with instructions to contact their physician.
- No partial-state resume is permitted across expiry.

### 5.2 Operator action

- Confirm patient identity through normal clinical channels.
- Have physician dispatch a **new** link.
- Verify the new link arrives. Old token cannot be re-used.

---

## 6. Failed Signing Recovery

### 6.1 Patient-side failures

| Failure | Recovery |
|---|---|
| OTP not received | Patient re-requests; if persistent failure, physician confirms mobile number on record and re-dispatches if needed. |
| OTP locked due to retries | Wait the cool-down; if still failing, physician revokes and re-dispatches. |
| Signature submission network failure | Patient retries within the session window. If the session expires, physician re-dispatches; previously captured signature is not auto-applied to the new session. |
| Browser closed mid-flow | If session is still valid and gates already passed, patient resumes on re-open of the same link until expiry. If session is no longer valid, re-dispatch. |

### 6.2 Server-side failures

| Failure | Recovery |
|---|---|
| PDF generation error after signature captured | Engineering on-call investigates; signature artifact is preserved; regeneration is idempotent. The session is **not** auto-replayed silently — explicit operator action only. |
| SMS provider outage | Switch to fallback provider per ops runbook; document delivery-status fallback in evidence. |
| Database connectivity blip | Idempotent retries at the API layer. Audit chain must not have duplicate `OTP_VERIFIED` or `SIGNATURE_CAPTURED` events. |

### 6.3 Forbidden recovery actions

- Manual editing of the audit chain.
- Re-using a token after `PDF_FINALIZED`.
- Cross-applying a signature from one session to another.
- Sending OTP to a different phone than the dispatching record.

Any operator who needs to deviate from these rules **must** open a P1 incident first.

---

## 7. Routine Operations

- **Daily:** Run production smoke `__smoke_stabilization.cjs` against `https://wathiqcare.online`. Expect 11/11 PASS. Archive the JSON to `/pilot-evidence/<date>-smoke.json`.
- **Daily:** Evidence integrity sample of 5 random consents per active day (`PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md` §3).
- **Weekly:** Compliance reviewer §8 sign-off.
- **Weekly:** Incident log review.

---

## 8. References

- `PILOT_READINESS_MASTER.md` — governance, success and rollback criteria.
- `PILOT_USER_GUIDE_LEGAL_COMPLIANCE.md` — evidence review procedures.
- `LEGAL_EVIDENCE_SPECIFICATION.md` — evidence-package schema.
- `__smoke_stabilization.cjs` — production smoke harness.
