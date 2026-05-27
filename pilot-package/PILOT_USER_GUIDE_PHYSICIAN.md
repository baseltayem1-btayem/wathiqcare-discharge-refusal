# PHYSICIAN USER GUIDE — WathiqCare Informed Consent

**Audience:** Pilot physicians dispatching informed-consent documents.
**Release:** v1.0.1
**Production URL:** `https://wathiqcare.online`

---

## 1. Before you start

- Use your assigned named account. Do not share credentials.
- Confirm the patient's mobile number on record is correct **before** dispatching.
- Confirm the consent template required for the procedure is the **latest approved version** for your department.

---

## 2. Consent Dispatch Workflow

### 2.1 Locate the patient
1. Sign in at `https://wathiqcare.online`.
2. Open the patient via your usual workflow (search by MRN or name).
3. Select **New Informed Consent**.

### 2.2 Select procedure & template
1. Choose the procedure.
2. Confirm the consent template auto-selected matches the procedure.
3. If a different template is required, select it manually from the approved list.

### 2.3 Attach patient education package
1. Confirm the educational materials linked to the template are appropriate for the patient (language, literacy level, special considerations).
2. Add procedure-specific notes if applicable.

### 2.4 Confirm mobile number
1. Review the masked mobile number displayed.
2. If incorrect, **do not dispatch**. Update the patient record through the standard demographic update workflow, then return.

### 2.5 Dispatch
1. Tap **Dispatch Consent Link**.
2. The system sends the secure link to the patient via SMS.
3. You will see a delivery confirmation including a dispatch reference ID.

**Target dispatch time:** ≤ 90 seconds end-to-end.

---

## 3. Patient Education Flow

When the patient opens the link they will move through:

1. **Education** — the materials you attached.
2. **Decision** — Accept or Refuse.
3. **OTP** — only after a decision, the patient verifies their phone.
4. **Signature** — only after OTP verification.

You do not need to walk the patient through these steps live. If the patient asks for help:

- Direct them to `PILOT_USER_GUIDE_PATIENT.md` content (printable PDF available in the pilot training pack).
- For OTP delivery problems, confirm the mobile number on record; if wrong, the patient must abandon and you must re-dispatch after updating it.

---

## 4. Tracking patient progress

In the patient's consent timeline you will see real-time status:

| Status | Meaning |
|---|---|
| `DISPATCHED` | Link sent. Patient has not opened it. |
| `EDUCATION_VIEWED` | Patient has loaded the education stage. |
| `DECISION_ACCEPTED` / `DECISION_REFUSED` | Patient committed to a decision. |
| `OTP_REQUESTED` | Patient requested an OTP. |
| `OTP_VERIFIED` | Patient passed OTP. |
| `SIGNATURE_CAPTURED` | Signature submitted. |
| `PDF_FINALIZED` | Final PDF generated and hashed. |
| `EXPIRED` | Link expired without completion. |
| `REVOKED` | You or a colleague revoked the link before completion. |

---

## 5. Refusal Handling

If a patient refuses:

1. The system captures a **Refusal Acknowledgement** followed by a **Refusal Signature**.
2. A refusal PDF is generated with the same audit-chain rigor as a positive consent.
3. The patient timeline will show `DECISION_REFUSED` → `OTP_VERIFIED` → `SIGNATURE_CAPTURED` → `PDF_FINALIZED`.
4. Open the refusal PDF and confirm the document is filed correctly under the patient's record.
5. Conduct the clinical conversation that follows from a refusal (alternatives, second opinion, follow-up plan). Document this conversation per standard clinical practice.

A refusal is **not** treated as a failed consent. It is a fully valid, legally defensible outcome.

---

## 6. Audit Verification (for your own assurance)

For any executed consent or refusal you can open the **Evidence View**:

- Audit chain (timestamps for each stage).
- OTP evidence (masked phone, delivery status, verification timestamp).
- Decision evidence (Accept / Refuse) with timestamp.
- Education evidence (which materials were rendered to the patient).
- Final PDF and its integrity hash.

If anything in the chain looks incomplete or inconsistent, **do not modify the record**. Report it to Program Operations and the Legal Reviewer immediately. Audit data is append-only by design — manual changes are not possible.

---

## 7. Re-dispatch & expiry

- A link expires after the configured TTL (see `SOP_SECURE_SIGNING.md` §5).
- If a link expires, dispatch a **new** link. The old link becomes permanently invalid.
- If you need to revoke an outstanding link (e.g., wrong template), use **Revoke Link** from the timeline. Then dispatch a new one.

---

## 8. Escalation

| Situation | Escalate to |
|---|---|
| Patient cannot complete after two retries | Program Operations |
| OTP delivery failing across multiple patients | Engineering On-Call |
| Suspected wrong template dispatched | Revoke + re-dispatch; report to Pilot Clinical Lead |
| Suspected audit-chain inconsistency | Legal Reviewer + Program Operations (do NOT attempt remediation yourself) |
| Any clinical safety concern arising from refusal | Standard clinical escalation pathway |

---

## 9. Do / Do not

**Do**
- Verify the mobile number before dispatch.
- Confirm the patient understands the materials before they tap Accept.
- Treat refusal as a valid clinical outcome.
- Capture pilot feedback after each encounter using `PILOT_FEEDBACK_TEMPLATE.md`.

**Do not**
- Share your account credentials.
- Sign on behalf of a patient.
- Dispatch a consent to a phone the patient does not control.
- Attempt to edit audit data — it is append-only.
- Use a non-approved consent template.
