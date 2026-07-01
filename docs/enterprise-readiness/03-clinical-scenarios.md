# 3. Clinical Scenarios — IMC-Style Validation

These scenarios represent realistic cases used to validate Clinical Workspace 2.0. Each scenario maps to test scripts, acceptance criteria, and expected decision-support outputs.

---

## SC-01 — Adult Routine Procedure

| Field | Value |
|-------|-------|
| **Name** | Adult routine procedure |
| **Patient** | Ahmad Hassan (MRN-000101) |
| **Age / Gender** | 38 / male |
| **Language** | Arabic |
| **Capacity** | Competent |
| **Encounter** | General Surgery, acute appendicitis |
| **Procedure** | Laparoscopic appendectomy |
| **Risk level** | MEDIUM |
| **Anesthesia** | GENERAL |
| **Allergies** | Penicillin |
| **Medications** | Paracetamol 1g PRN |

| Decision-support expectation | Result |
|------------------------------|--------|
| Consent category | PROCEDURE_CONSENT |
| Required participants | witness (anesthesia) |
| Alerts | None (penicillin not relevant to procedure) |
| Education | Auto-attached appendectomy PDF |
| Special considerations | Arabic default; witness signature before patient |

| Validation scripts | TS-01, TS-02, TS-12 |

---

## SC-02 — Pediatric Procedure Requiring Guardian

| Field | Value |
|-------|-------|
| **Name** | Pediatric procedure requiring guardian |
| **Patient** | Sara Al-Qahtani (MRN-000102) |
| **Age / Gender** | 9 / female |
| **Language** | Bilingual |
| **Capacity** | Minor |
| **Guardian** | Faisal Al-Qahtani (Parent) |
| **Encounter** | Pediatric Surgery, recurrent tonsillitis |
| **Procedure** | Tonsillectomy |
| **Risk level** | MEDIUM |
| **Anesthesia** | GENERAL |
| **Allergies** | None known |
| **Medications** | None |

| Decision-support expectation | Result |
|------------------------------|--------|
| Consent category | PROCEDURE_CONSENT |
| Required participants | guardian, witness |
| Blockers | Guardian must be present and documented before sending |
| Suggestions | Guardian consent required; witness required due to anesthesia |
| Education | Pediatric tonsillectomy interactive education |
| Special considerations | Guardian and witness signatures required |

| Validation scripts | TS-03 |

---

## SC-03 — High-Risk Cardiac / Radiology Procedure

| Field | Value |
|-------|-------|
| **Name** | High-risk cardiac/radiology procedure |
| **Patient** | Robert Smith (MRN-000103) |
| **Age / Gender** | 50 / male |
| **Language** | English |
| **Capacity** | Competent |
| **Encounter** | Cardiology, severe coronary artery disease |
| **Procedure** | Coronary angiography with possible PCI |
| **Risk level** | HIGH |
| **Anesthesia** | NONE |
| **Allergies** | Iodinated contrast (mild) |
| **Medications** | Aspirin 81mg, Atorvastatin 40mg |

| Decision-support expectation | Result |
|------------------------------|--------|
| Consent category | HIGH_RISK_PROCEDURE_CONSENT |
| Required participants | witness (high risk) |
| Alerts | Expired package (critical); updated guideline (warning); high-risk (warning); contrast allergy (critical); antithrombotic medication (warning) |
| Risks | CRITICAL: death (emergency); HIGH: kidney injury, stroke/heart attack |
| Education | Coronary angiography & PCI video |
| Special considerations | All alerts must be acknowledged before approval; contrast allergy requires premedication review |

| Validation scripts | TS-06, TS-09, TS-13 |

---

## SC-04 — Procedure Requiring Interpreter

| Field | Value |
|-------|-------|
| **Name** | Procedure requiring interpreter |
| **Patient** | Robert Smith (MRN-000103) |
| **Language preference** | English |
| **Procedure** | Any procedure (e.g., Coronary angiography) |

| Decision-support expectation | Result |
|------------------------------|--------|
| Suggestion | Interpreter recommended — patient prefers English |
| Required participants | interpreter |
| Flow | Interpreter attestation before patient signature |
| Evidence | Interpreter signature includes language metadata |

| Validation scripts | TS-04 |

---

## SC-05 — Procedure Requiring Witness

| Field | Value |
|-------|-------|
| **Name** | Procedure requiring witness |
| **Patient** | Ahmad Hassan or Robert Smith |
| **Procedure** | Any procedure with GENERAL anesthesia or HIGH/CRITICAL risk |

| Decision-support expectation | Result |
|------------------------------|--------|
| Required participants | witness |
| Flow | Witness signs before patient finalizes |
| Evidence | Timeline events for witness and patient signatures |

| Validation scripts | TS-05 |

---

## SC-06 — Patient Refuses After Education

| Field | Value |
|-------|-------|
| **Name** | Patient refuses after education |
| **Patient** | Robert Smith |
| **Procedure** | Coronary angiography |
| **Flow** | Complete education → ask question → decide to refuse → acknowledge consequences → sign refusal |

| Decision-support expectation | Result |
|------------------------------|--------|
| Decision | refused |
| Confirmation | Refusal recorded |
| Timeline | `DECISION_REFUSED`, `SIGNATURE_CAPTURED`, `PDF_FINALIZED`, `ARCHIVED_TO_CLINICAL_RECORD` |
| Evidence | Decision field = refused; refusal-specific confirmation screen |

| Validation scripts | TS-07 |

---

## SC-07 — Patient Asks a Question Before Signing

| Field | Value |
|-------|-------|
| **Name** | Patient asks a question before signing |
| **Patient** | Any competent patient |
| **Procedure** | Any |
| **Flow** | Complete education → type question → send → continue to decision → accept → sign |

| Decision-support expectation | Result |
|------------------------------|--------|
| Timeline | `QUESTION_SUBMITTED` event |
| Metrics | Questions asked counter increments |
| Evidence | Question text appears in patient journey state and exported JSON |

| Validation scripts | TS-02 |

---

## SC-08 — Education Material Unavailable

| Field | Value |
|-------|-------|
| **Name** | Education material unavailable |
| **Patient** | Any |
| **Procedure** | A procedure with no mapped education asset, or education toggled off by physician |

| Decision-support expectation | Result |
|------------------------------|--------|
| Behavior | Workspace skips education step or shows placeholder; no crash |
| Physician control | Toggle “Include patient education” off |

| Validation scripts | TS-08 |

---

## SC-09 — Updated Package / Guideline Warning

| Field | Value |
|-------|-------|
| **Name** | Updated package/guideline warning |
| **Patient** | Robert Smith |
| **Procedure** | Tonsillectomy (current v1.0.0, latest v1.1.0) |

| Decision-support expectation | Result |
|------------------------------|--------|
| Alert | A newer guideline version is available |
| Severity | warning |
| Action | Acknowledge and consider updating package before production |

| Validation scripts | TS-09 |

---

## SC-10 — Allergy-Related Alert

| Field | Value |
|-------|-------|
| **Name** | Allergy-related alert |
| **Patient** | Robert Smith |
| **Allergy** | Iodinated contrast (mild) |
| **Procedure** | Coronary angiography |

| Decision-support expectation | Result |
|------------------------------|--------|
| Alert | Patient has documented contrast/iodine allergy. Review premedication protocol and alternatives. |
| Severity | critical |
| Action | Acknowledge; verify premedication documented in encounter |

| Validation scripts | TS-06, TS-09 |

---

## SC-11 — Medication-Related Alert

| Field | Value |
|-------|-------|
| **Name** | Medication-related alert |
| **Patient** | Robert Smith |
| **Medication** | Aspirin 81mg |
| **Procedure** | Coronary angiography |

| Decision-support expectation | Result |
|------------------------------|--------|
| Alert | Patient is on antithrombotic medication. Confirm bleeding-risk management plan. |
| Severity | warning |
| Action | Acknowledge; verify bleeding-risk plan |

| Validation scripts | TS-06, TS-09 |

---

## Scenario-to-Script Mapping Summary

| Scenario | Primary Scripts | Acceptance Criteria Area |
|----------|-----------------|--------------------------|
| SC-01 Adult routine | TS-01, TS-02, TS-12 | Physician usability, patient education, bilingual |
| SC-02 Pediatric guardian | TS-03 | Decision rules, guardian flow |
| SC-03 High-risk cardiac | TS-06, TS-09, TS-13 | Clinical alerts, high-risk disclosure |
| SC-04 Interpreter | TS-04 | Interpreter flow, bilingual |
| SC-05 Witness | TS-05 | Witness flow, decision rules |
| SC-06 Refusal | TS-07 | Refusal handling, legal defensibility |
| SC-07 Question before signing | TS-02 | Patient education, audit events |
| SC-08 Education unavailable | TS-08 | Consent package accuracy |
| SC-09 Updated guideline | TS-09 | Clinical Knowledge Package resolution |
| SC-10 Allergy alert | TS-06, TS-09 | Decision rules, clinical alerts |
| SC-11 Medication alert | TS-06, TS-09 | Decision rules, clinical alerts |
