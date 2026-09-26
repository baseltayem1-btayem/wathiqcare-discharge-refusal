# Physician Quick Guide — Clinical Workspace 2.0

## What this guide covers

How to use Clinical Workspace 2.0 to prepare and send an informed consent to a patient.

---

## 1. Open the workspace

1. Navigate to **Clinical Workspace 2.0**.
2. Confirm the patient context banner at the top is empty.

## 2. Select patient and encounter

1. In the **Patient & Encounter** section, type the patient name.
2. Click the patient card. The encounter auto-selects.
3. If the patient has multiple encounters, choose the correct one.

## 3. Select the procedure

1. In the **Procedure** section, choose the planned procedure.
2. The Clinical Knowledge Package auto-resolves:
   - Consent category
   - Required education
   - Material risks
   - Anesthesia default
   - Required participants (guardian, interpreter, witness)
   - Patient-specific alerts

## 4. Review alerts

1. Read every **Patient-specific clinical alert**.
2. Click **Acknowledge** on each alert.
3. You cannot approve the draft until all alerts are acknowledged.

## 5. Adjust anesthesia or education if needed

- Use the anesthesia dropdown if the planned anesthesia differs from the default.
- Toggle patient education on or off.

## 6. Add physician notes

- Enter any notes in the draft preview panel. Notes are included in the consent record.

## 7. Approve the draft

1. Review the auto-resolved package.
2. Click **Approve draft**.
3. Confirm the readiness sidebar shows 100%.

## 8. Preview the patient journey (optional but recommended)

1. Click **Preview patient journey**.
2. Walk through the patient screens to confirm education and decision flow.
3. Click **Back to physician workspace** when finished.

## 9. Send to patient

1. Click **Send to patient**.
2. Confirm the patient name, procedure, and encounter.
3. Click **Confirm send**.
4. A `CONSENT_DISPATCHED` event is recorded in the timeline.

## 10. Review completion

1. After the patient signs or refuses, click **View timeline**.
2. Review all events and the evidence hash.
3. Export evidence from the Task Simulator if needed.

---

## Common issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Approve draft is disabled | Missing patient/procedure or unacknowledged alert | Complete selection and acknowledge all alerts. |
| Send is disabled | Draft not approved or blockers present | Approve draft; resolve guardian/witness blockers. |
| Interpreter required | Patient language preference is English | Ensure interpreter attestation in patient journey. |
| Guardian required | Patient is a minor or incapacitated | Complete guardian flow before sending. |

---

## Tips

- Use **Preview patient journey** to catch education or wording issues before sending.
- Always acknowledge alerts; they are part of the legal record.
- Keep physician notes concise and clinically relevant.
