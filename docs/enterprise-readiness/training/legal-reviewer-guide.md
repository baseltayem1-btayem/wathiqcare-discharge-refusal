# Legal Reviewer Guide — Clinical Workspace 2.0

## Purpose

This guide helps legal affairs reviewers evaluate the consent workflow for defensibility, risk exposure, and compliance with informed consent principles.

---

## What to review

### 1. Consent language

- Confirm the consent explains the procedure, material risks, benefits, and alternatives.
- Verify risks are displayed with incidence rates and severity levels.
- Check that no consent language implies waiver of liability.

### 2. Voluntary decision

- Confirm **I Accept** and **I Refuse** are equally accessible.
- Verify refusal does not require additional navigation steps beyond acceptance.
- Confirm the patient can change their mind before the procedure begins.

### 3. Refusal handling

- Review the refusal acknowledgment text.
- Confirm refusal requires a signature.
- Verify the timeline records `DECISION_REFUSED`.
- Check that refusal confirmation clearly states the decision is documented.

### 4. Capacity and guardianship

- Verify minors and incapacitated patients trigger guardian and witness requirements.
- Confirm guardian attestation captures name and relationship.
- Verify the package is blocked until guardian documentation is complete.

### 5. Interpreter attestation

- Confirm interpreter presence is recommended or required based on language preference.
- Verify interpreter signature includes the language interpreted.
- Check that attestation occurs before patient signature.

### 6. Evidence package

- Review the exported JSON from the Task Simulator.
- Confirm it contains: baseline, current metrics, deltas, patient metrics, timestamp, mode.
- Verify timeline events include actor, timestamp, summary, and evidence hash.
- Confirm no real PHI beyond mock identifiers is present.

### 7. Audit trail

- Confirm every critical action produces an event:
  - Consent dispatched
  - Education completed
  - Question submitted
  - Decision accepted/refused
  - OTP verified
  - Signature captured
  - PDF finalized
  - Archived to clinical record
- Verify events are chronological and non-repudiable via evidence hash.

---

## Red flags

| Red flag | Action |
|----------|--------|
| Refusal path lacks signature or acknowledgment | Block release until fixed. |
| Consent language contains liability waiver | Remove or rephrase. |
| Alerts can be bypassed | Require acknowledgment before approval. |
| Evidence export omits decision or signature | Block release until fixed. |
| PHI appears in exported evidence | Remove and conduct security review. |

---

## Sign-off checklist

- [ ] Consent language reviewed and approved.
- [ ] Refusal workflow reviewed and approved.
- [ ] Guardian/interpreter/witness flows reviewed and approved.
- [ ] Evidence package format reviewed and approved.
- [ ] Audit trail completeness reviewed and approved.
- [ ] No PHI leakage in mock evidence.

Sign: _________________________  Date: __________
