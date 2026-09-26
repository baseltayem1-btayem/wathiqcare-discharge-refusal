# 2. UAT Test Scripts — Clinical Workspace 2.0

**Environment:** `http://localhost:3000/prototype/clinical-workspace-2`  
**Test data:** Deterministic mock patients and procedures documented in `apps/web/src/app/prototype/clinical-workspace-2/lib/mock-data.ts`.

---

## Script Legend

| Field | Meaning |
|-------|---------|
| **TS-ID** | Test script identifier |
| **Preconditions** | State required before starting |
| **Test Data** | Patient/encounter/procedure to use |
| **Steps** | Numbered actions for the tester |
| **Expected Result** | Correct system behavior |
| **Pass/Fail Criteria** | How to judge the result |
| **Evidence Required** | Screenshot, JSON export, or note to capture |

---

## TS-01 — Physician Happy Path

| Field | Value |
|-------|-------|
| **Objective** | Verify a physician can select context, review the auto-resolved package, approve, and send. |
| **Preconditions** | Dev server running; workspace loaded. |
| **Test Data** | Patient: Ahmad Hassan; Procedure: Laparoscopic appendectomy. |

| Step | Action |
|------|--------|
| 1 | Open `/prototype/clinical-workspace-2`. |
| 2 | Search for “Ahmad Hassan” and select. |
| 3 | Confirm encounter auto-selects (General Surgery, ENC-2026-0001). |
| 4 | Select “Laparoscopic appendectomy”. |
| 5 | Review Clinical Knowledge Package: consent category, education, risks, anesthesia default. |
| 6 | Click **Approve draft**. |
| 7 | Click **Send to patient** → confirm. |

| Expected Result |
|-----------------|
| Readiness sidebar shows 100%. Consent dispatched banner appears. Timeline event `CONSENT_DISPATCHED` is recorded. Task Simulator metrics update. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if send succeeds and timeline event appears. | Screenshot of timeline; JSON export from Task Simulator. |

---

## TS-02 — Patient Happy Path

| Field | Value |
|-------|-------|
| **Objective** | Verify a patient can complete education, ask a question, accept, and sign. |
| **Preconditions** | Physician happy path completed or use **Preview patient journey**. |
| **Test Data** | Patient: Ahmad Hassan; Procedure: Laparoscopic appendectomy. |

| Step | Action |
|------|--------|
| 1 | From physician workspace, click **Preview patient journey**. |
| 2 | (Optional) Switch to Arabic and back to English. |
| 3 | Click **Start reviewing**. |
| 4 | Browse Summary, Risks, Benefits, Instructions, FAQ tabs. |
| 5 | In **Understanding**, answer both comprehension questions correctly. |
| 6 | Click **Check answers**. |
| 7 | On Questions panel, type a question and click **Send question**. |
| 8 | Click **Continue to decision**. |
| 9 | Click **I Accept**. |
| 10 | Click **Verify OTP**, then **Sign consent**. |

| Expected Result |
|-----------------|
| Patient sees **Consent completed** with green checkmark, reference, timestamp, and evidence hash. Timeline includes `EDUCATION_COMPLETED`, `QUESTION_SUBMITTED`, `DECISION_ACCEPTED`, `OTP_VERIFIED`, `SIGNATURE_CAPTURED`, `PDF_FINALIZED`, `ARCHIVED_TO_CLINICAL_RECORD`. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if all timeline events appear and confirmation shows accepted decision. | Screenshot of confirmation and timeline; exported evidence JSON. |

---

## TS-03 — Guardian-Required Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify a minor patient triggers guardian and witness requirements. |
| **Preconditions** | Workspace loaded. |
| **Test Data** | Patient: Sara Al-Qahtani (minor); Procedure: Tonsillectomy. |

| Step | Action |
|------|--------|
| 1 | Select Sara Al-Qahtani. |
| 2 | Select Tonsillectomy. |
| 3 | Review Clinical Knowledge Package blockers and suggestions. |
| 4 | Acknowledge any alerts. |
| 5 | Attempt to approve draft. |
| 6 | Observe that the package is blocked until guardian flow is documented. |
| 7 | Click **Preview patient journey**. |
| 8 | Complete patient steps through decision. |
| 9 | When prompted, complete Guardian flow (name, relationship, signature). |
| 10 | Complete witness signature if required. |

| Expected Result |
|-----------------|
| Guardian and witness are listed as required participants. Package status is `blocked` until guardian is documented. Timeline includes guardian signature with role. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if guardian requirement is enforced and documented. | Screenshot of required-participants banner; timeline event with role `guardian`. |

---

## TS-04 — Interpreter-Required Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify an English-preference patient triggers interpreter recommendation and attestation. |
| **Preconditions** | Workspace loaded. |
| **Test Data** | Patient: Robert Smith; Procedure: Coronary angiography with possible PCI. |

| Step | Action |
|------|--------|
| 1 | Select Robert Smith. |
| 2 | Select Coronary angiography. |
| 3 | Review suggestions; confirm interpreter is recommended. |
| 4 | Click **Preview patient journey**. |
| 5 | Complete education and questions. |
| 6 | At decision, click **I Accept**. |
| 7 | Complete interpreter attestation (name, language, signature) before patient signs. |
| 8 | Patient verifies OTP and signs. |

| Expected Result |
|-----------------|
| Interpreter appears in required participants. Interpreter signature event recorded with `language` metadata. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if interpreter attestation is required and recorded before final signature. | Screenshot of interpreter panel; timeline event metadata. |

---

## TS-05 — Witness-Required Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify high-risk or anesthesia procedures require a witness signature. |
| **Preconditions** | Workspace loaded. |
| **Test Data** | Patient: Robert Smith; Procedure: Coronary angiography with possible PCI. |

| Step | Action |
|------|--------|
| 1 | Select Robert Smith + Coronary angiography. |
| 2 | Review suggestions; confirm witness is required due to high risk. |
| 3 | Complete patient decision to accept. |
| 4 | At signature, switch role to **Witness**. |
| 5 | Enter witness name and sign. |
| 6 | Switch role to **Patient** and sign. |

| Expected Result |
|-----------------|
| Witness signature event recorded before patient signature. Final confirmation lists both signers. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if witness signature is captured and ordered before patient signature. | Timeline events for witness and patient. |

---

## TS-06 — High-Risk Procedure Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify high-risk procedure triggers critical alerts and high-risk disclosure. |
| **Preconditions** | Workspace loaded. |
| **Test Data** | Patient: Robert Smith; Procedure: Coronary angiography with possible PCI. |

| Step | Action |
|------|--------|
| 1 | Select Robert Smith + Coronary angiography. |
| 2 | Review patient-specific alerts (high-risk, contrast allergy, antithrombotic, expired/updated package). |
| 3 | Acknowledge each alert. |
| 4 | Review risk disclosures; confirm CRITICAL risk visible. |
| 5 | Approve draft and send. |

| Expected Result |
|-----------------|
| All alerts acknowledged before approval enabled. High-risk risks displayed with CRITICAL/HIGH tone. Witness required. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if alerts block approval until acknowledged and critical risks are visible. | Screenshots of unacknowledged and acknowledged alerts; risk disclosure panel. |

---

## TS-07 — Patient Refusal Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify a patient can refuse, acknowledge consequences, sign refusal, and generate audit trail. |
| **Preconditions** | Workspace loaded with a competent patient. |
| **Test Data** | Patient: Robert Smith; Procedure: Coronary angiography. |

| Step | Action |
|------|--------|
| 1 | Select patient/procedure and approve draft. |
| 2 | Open **Preview patient journey**. |
| 3 | Complete education and questions. |
| 4 | Click **I Refuse**. |
| 5 | Check the refusal consequence acknowledgment box. |
| 6 | Enter name and click **Sign refusal**. |

| Expected Result |
|-----------------|
| Screen shows **Refusal recorded** with red icon. Timeline includes `DECISION_REFUSED` and `SIGNATURE_CAPTURED`. Decision field in evidence JSON is `refused`. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if refusal is documented with signature and refusal-specific confirmation. | Screenshot of refusal confirmation; timeline event `DECISION_REFUSED`; evidence JSON. |

---

## TS-08 — Education Unavailable Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify graceful behavior when education material is missing. |
| **Preconditions** | Workspace loaded. |
| **Test Data** | Use a procedure with no mapped education material if available, or toggle education off. |

| Step | Action |
|------|--------|
| 1 | Select Ahmad Hassan + Laparoscopic appendectomy. |
| 2 | In Clinical Knowledge Package, toggle **Include patient education** off. |
| 3 | Approve and preview patient journey. |
| 4 | Observe that the patient is taken to questions or decision without education. |

| Expected Result |
|-----------------|
| No broken/missing content. Patient can proceed without education if physician disables it. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if workspace handles missing/disabled education gracefully. | Screenshot of journey without education step. |

---

## TS-09 — Clinical Alert Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify alerts are surfaced, must be acknowledged, and are auditable. |
| **Preconditions** | Workspace loaded. |
| **Test Data** | Patient: Robert Smith; Procedure: Coronary angiography. |

| Step | Action |
|------|--------|
| 1 | Select Robert Smith + Coronary angiography. |
| 2 | Confirm **Approve draft** is disabled until alerts are acknowledged. |
| 3 | Click **Acknowledge** on each alert. |
| 4 | Confirm **Approve draft** becomes enabled. |
| 5 | Send to patient and view timeline. |

| Expected Result |
|-----------------|
| Alerts block approval until acknowledged. Timeline does not need alert events but the readiness state reflects acknowledgment. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if unacknowledged alerts disable approval and acknowledgment enables it. | Screenshot before/after acknowledgment; readiness sidebar. |

---

## TS-10 — Remote Signing Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify remote signing readiness badge and preview function. |
| **Preconditions** | Workspace loaded. |
| **Test Data** | Any competent patient. |

| Step | Action |
|------|--------|
| 1 | Select patient/procedure and approve draft. |
| 2 | Click **Preview patient journey**. |
| 3 | On landing screen, confirm **Secure signing session** badge and **Remote signing ready** badge appear. |
| 4 | Complete the journey. |

| Expected Result |
|-----------------|
| Patient landing shows secure and remote-ready indicators. Preview simulates the remote patient experience. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if remote signing readiness is visible and preview works end-to-end. | Screenshot of landing badges. |

---

## TS-11 — Accessibility Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify text size and high-contrast controls work on every patient screen. |
| **Preconditions** | Patient preview open. |
| **Test Data** | Patient: Ahmad Hassan. |

| Step | Action |
|------|--------|
| 1 | Open patient preview. |
| 2 | Set text size to **Large**, then **Extra large**. |
| 3 | Enable **High contrast**. |
| 4 | Navigate through landing, education, questions, decision, signature, confirmation. |
| 5 | Disable high contrast and return text size to Normal. |

| Expected Result |
|-----------------|
| All screens respect text size and high-contrast settings. No clipped text or inaccessible controls. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if every step is usable at large/extra-large size and high contrast. | Screenshots of education and decision panels in high contrast + extra-large. |

---

## TS-12 — Arabic Language Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify Arabic (RTL) patient journey is complete and readable. |
| **Preconditions** | Patient preview open. |
| **Test Data** | Patient: Ahmad Hassan (default Arabic). |

| Step | Action |
|------|--------|
| 1 | Open patient preview. |
| 2 | Ensure language is **العربية**. |
| 3 | Complete all steps through signature. |
| 4 | Confirm layout is right-to-left. |

| Expected Result |
|-----------------|
| All patient-facing text appears in Arabic. Layout is RTL. Buttons and inputs remain usable. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if Arabic screens are fully localized and RTL. | Screenshot of Arabic decision panel and signature panel. |

---

## TS-13 — English Language Flow

| Field | Value |
|-------|-------|
| **Objective** | Verify English (LTR) patient journey is complete and readable. |
| **Preconditions** | Patient preview open. |
| **Test Data** | Patient: Robert Smith (default English). |

| Step | Action |
|------|--------|
| 1 | Open patient preview. |
| 2 | Confirm language is **English**. |
| 3 | Complete all steps through signature. |
| 4 | Confirm layout is left-to-right. |

| Expected Result |
|-----------------|
| All patient-facing text appears in English. Layout is LTR. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if English screens are fully localized and LTR. | Screenshot of English confirmation panel. |

---

## TS-14 — Audit Trail Verification

| Field | Value |
|-------|-------|
| **Objective** | Verify timeline events are ordered, attributed, and include evidence hashes. |
| **Preconditions** | A complete happy-path or refusal journey has been executed. |
| **Test Data** | Any completed consent. |

| Step | Action |
|------|--------|
| 1 | Complete physician send and patient journey. |
| 2 | Click **View timeline**. |
| 3 | Review each event: actor, timestamp, summary, evidence hash. |
| 4 | Click **Export evidence** in the sidebar. |

| Expected Result |
|-----------------|
| Timeline is chronological. Every critical event has an actor and evidence hash. Exported JSON contains events, metrics, and journey state. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if timeline is complete and export is non-empty and valid JSON. | Exported JSON file; timeline screenshot. |

---

## TS-15 — Evidence Package Verification

| Field | Value |
|-------|-------|
| **Objective** | Verify the exported evidence package contains baseline, metrics, deltas, patient metrics, and timestamp. |
| **Preconditions** | A consent has been sent or patient journey completed. |
| **Test Data** | Any completed scenario. |

| Step | Action |
|------|--------|
| 1 | In Task Simulator, click **Export evidence**. |
| 2 | Open downloaded `intelligent-clinical-journey-evidence.json`. |
| 3 | Validate fields: `baseline`, `current`, `deltas`, `percentReductions`, `patientMetrics`, `timestamp`, `mode`. |

| Expected Result |
|-----------------|
| JSON is valid and contains all expected fields. Metrics reflect the executed workflow. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if JSON is valid and contains metrics for physician and patient. | Downloaded JSON file. |

---

## TS-16 — Rollback Verification

| Field | Value |
|-------|-------|
| **Objective** | Verify the rollback checklist can be executed without data loss. |
| **Preconditions** | Deployment checklist reviewed. |
| **Test Data** | N/A (tabletop exercise). |

| Step | Action |
|------|--------|
| 1 | Simulate a critical defect discovered in production preview. |
| 2 | Walk through [Rollback Checklist](./07-rollback-checklist.md). |
| 3 | Confirm active signing sessions are preserved and only new sessions are blocked. |
| 4 | Confirm audit logs remain intact. |

| Expected Result |
|-----------------|
| Rollback steps are clear, assign ownership, and do not delete audit data or active sessions. |

| Pass/Fail Criteria | Evidence Required |
|--------------------|-------------------|
| Pass if checklist is actionable and preserves data. | Completed rollback tabletop checklist sign-off. |
