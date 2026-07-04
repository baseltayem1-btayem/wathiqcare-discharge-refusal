# 4. Acceptance Criteria — Clinical Workspace 2.0

Each criterion is measurable and assigned an owner. Criteria marked **MUST** are release blockers; **SHOULD** are high priority; **MAY** are desirable.

---

## 4.1 Physician Usability

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| PU-01 | Physician can select patient, encounter, and procedure in ≤ 3 screens. | MUST | Task Simulator click count ≤ 24 (baseline). | Product / UX |
| PU-02 | Clinical Knowledge Package auto-resolves consent category, education, anesthesia default, risks, and required participants. | MUST | All sections visible without manual lookup. | Clinical Knowledge |
| PU-03 | Approve draft is disabled until all readiness checks pass. | MUST | Readiness sidebar at 100% before send enabled. | QA |
| PU-04 | Physician can preview patient journey before sending. | MUST | Preview button visible and functional. | QA |
| PU-05 | Physician notes can be entered and appear in draft preview. | SHOULD | Notes retained across state changes. | QA |
| PU-06 | Send action records a `CONSENT_DISPATCHED` timeline event. | MUST | Event visible in timeline. | QA |

---

## 4.2 Patient Education

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| PE-01 | Education material includes summary, risks, benefits, instructions, FAQ, and comprehension check. | MUST | All tabs present and navigable. | Clinical SME |
| PE-02 | Comprehension check requires ≥ 80% score to pass. | MUST | 1/2 correct fails; 2/2 correct passes. | QA |
| PE-03 | Patient can ask a free-text question before deciding. | MUST | Question submitted, counter increments, timeline event recorded. | QA |
| PE-04 | Education progress bar updates as patient views tabs. | SHOULD | Progress reaches 100% at comprehension tab. | QA |
| PE-05 | Education unavailable state is handled gracefully. | MUST | No crash; patient can proceed if physician disables education. | QA |

---

## 4.3 Consent Package Accuracy

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| CPA-01 | Correct consent category is selected for procedure risk level. | MUST | HIGH_RISK_PROCEDURE_CONSENT for angiography; PROCEDURE_CONSENT for appendectomy/tonsillectomy. | Clinical SME |
| CPA-02 | Required participants match capacity, language, anesthesia, and risk rules. | MUST | Guardian/witness for minor; interpreter for English preference; witness for anesthesia/high risk. | QA |
| CPA-03 | Risk disclosures include incidence rates and severity levels. | MUST | CRITICAL/HIGH/MEDIUM risks visible. | Clinical SME |
| CPA-04 | Education material is auto-attached when available. | SHOULD | Asset title and duration shown. | QA |
| CPA-05 | Package version and expiry are checked and surfaced as alerts. | MUST | Expired package blocks approval. | QA |

---

## 4.4 Clinical Knowledge Package Resolution

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| CKP-01 | Package status is `ready` when no blockers and all alerts acknowledged. | MUST | Send enabled. | QA |
| CKP-02 | Package status is `blocked` when guardian missing for minor/incapacitated patient. | MUST | Send disabled; blocker message shown. | QA |
| CKP-03 | Updated guideline warning appears when currentVersion < latestVersion. | SHOULD | Alert visible and acknowledged. | QA |
| CKP-04 | Rule explanation panel summarizes all suggestions and blockers. | SHOULD | All active rules listed. | QA |

---

## 4.5 Decision Rules

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| DR-01 | Minor/incapacitated patient triggers guardian requirement. | MUST | TS-03 passes. | Clinical SME / QA |
| DR-02 | English-preference patient triggers interpreter recommendation. | MUST | TS-04 passes. | QA |
| DR-03 | Anesthesia planned triggers witness requirement. | MUST | TS-05 passes. | QA |
| DR-04 | HIGH/CRITICAL risk triggers witness requirement. | MUST | TS-05 passes. | QA |
| DR-05 | Contrast/iodine allergy + angiography triggers critical alert. | MUST | TS-06 passes. | Clinical SME / QA |
| DR-06 | Antithrombotic medication + procedure triggers warning alert. | MUST | TS-06 passes. | Clinical SME / QA |
| DR-07 | Age ≥ 75 + high-risk procedure triggers comorbidity warning. | SHOULD | Verified with appropriate mock data. | Clinical SME |

---

## 4.6 Audit Events

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| AE-01 | Every critical action produces a timeline event. | MUST | Events for dispatch, education, question, decision, OTP, signature, PDF, archive. | QA |
| AE-02 | Each event has an actor, timestamp, status, summary, and evidence hash. | MUST | All fields populated in timeline and export. | QA |
| AE-03 | Events are sorted chronologically. | MUST | Timeline displayed in ascending timestamp order. | QA |
| AE-04 | Refusal decision creates `DECISION_REFUSED` event. | MUST | TS-07 passes. | QA |
| AE-05 | Signature events include role and signer name. | MUST | Metadata visible in timeline. | QA |

---

## 4.7 Evidence Package

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| EP-01 | Exported JSON contains baseline, current metrics, deltas, percent reductions, patient metrics, mode, and timestamp. | MUST | JSON schema validated. | QA |
| EP-02 | Evidence hash is present for signature and completion events. | MUST | Non-empty hash string. | QA |
| EP-03 | Exported data contains no PHI beyond mock identifiers used in the scenario. | MUST | Legal/InfoSec review. | Legal / InfoSec |
| EP-04 | Audit evidence export includes all timeline events and patient journey state. | SHOULD | TS-14 passes. | QA |

---

## 4.8 Legal Defensibility

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| LD-01 | Patient can accept or refuse voluntarily without coercion. | MUST | Both options equally prominent; refusal path independent. | Legal |
| LD-02 | Refusal includes explicit acknowledgment of consequences and signature. | MUST | TS-07 passes; refusal confirmation screen visible. | Legal |
| LD-03 | Signature attestation confirms the signer read and understood the consent. | MUST | Text present on signature panel. | Legal |
| LD-04 | Consent reference, procedure, decision, signer, timestamp, and evidence hash are recorded. | MUST | Confirmation screen and timeline include all fields. | Legal |
| LD-05 | Patient copy download is offered (mock). | SHOULD | Download button present, even if disabled. | Legal |

---

## 4.9 Performance

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| PF-01 | Workspace initial load ≤ 3 seconds on local dev. | SHOULD | Measured with stopwatch. | QA |
| PF-02 | Patient journey step transitions ≤ 1 second. | SHOULD | No perceptible delay. | QA |
| PF-03 | Package resolution ≤ 500 ms after procedure selection. | SHOULD | Measured in browser. | QA |
| PF-04 | Load testing under concurrent signing sessions is planned before production. | MUST | Load-test ticket created and scheduled. | DevOps |

---

## 4.10 Accessibility

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| AC-01 | Text size controls (normal, large, extra-large) apply to all patient screens. | MUST | TS-11 passes. | Compliance |
| AC-02 | High-contrast mode applies to all patient screens. | MUST | TS-11 passes. | Compliance |
| AC-03 | All interactive elements are reachable via keyboard. | SHOULD | Tab navigation verified. | QA |
| AC-04 | Automated accessibility scan reports no critical or serious violations. | MUST | axe-core or Lighthouse a11y score ≥ 90. | Compliance |
| AC-05 | Focus indicators are visible in high-contrast mode. | SHOULD | Visual inspection. | Compliance |

---

## 4.11 Bilingual Arabic / English Support

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| BL-01 | Patient can switch between Arabic and English at any step. | MUST | Language toggle functional. | QA |
| BL-02 | Arabic screens render right-to-left (RTL). | MUST | Layout direction = rtl. | QA |
| BL-03 | All patient-facing text is localized for both languages. | MUST | No English fragments on Arabic screens, and vice versa. | QA |
| BL-04 | Dates and numbers are formatted according to selected locale. | SHOULD | Timestamp localized. | QA |
| BL-05 | Physician workspace labels support bilingual display where applicable. | MAY | Context bar shows Arabic name when available. | Product |

---

## 4.12 Rollback Readiness

| ID | Criterion | Priority | Measurement | Owner |
|----|-----------|----------|-------------|-------|
| RR-01 | Feature can be disabled without code deployment (feature flag or alias). | MUST | Rollback checklist actionable. | Release Manager |
| RR-02 | Active signing sessions are preserved during rollback. | MUST | Rollback checklist confirms. | Release Manager |
| RR-03 | Audit logs and evidence packages are preserved during rollback. | MUST | Rollback checklist confirms. | InfoSec |
| RR-04 | Rollback communication plan identifies stakeholders and channels. | MUST | Checklist includes comms plan. | Release Manager |

---

## Acceptance Criteria Summary

| Priority | Count |
|----------|-------|
| MUST | 42 |
| SHOULD | 19 |
| MAY | 3 |

All **MUST** criteria must pass for the readiness report to move from **NO GO** to **GO WITH OBSERVATIONS** or **GO**.
