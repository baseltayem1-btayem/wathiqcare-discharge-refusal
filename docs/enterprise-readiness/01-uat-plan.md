# 1. User Acceptance Test (UAT) Plan — Clinical Workspace 2.0

## 1.1 UAT Objective

Validate that the Clinical Workspace 2.0 prototype supports a safe, efficient, and legally defensible informed consent workflow for enterprise use. UAT will confirm that:

- Physicians can assemble, review, and dispatch a consent without unnecessary cognitive load.
- Patients can review education, ask questions, make a decision, and sign in Arabic or English.
- Guardians, interpreters, and witnesses can participate when required.
- Clinical alerts are surfaced, acknowledged, and auditable.
- Refusals are captured with the same rigor as acceptances.
- Audit events and evidence packages are complete and tamper-evident.

## 1.2 UAT Scope

### In Scope

| Capability | Validation Focus |
|------------|------------------|
| Physician workspace | Patient/encounter/procedure selection, package resolution, draft approval, send |
| Clinical decision support | Alerts for expired package, updated guideline, high-risk, allergy, medication, comorbidity |
| Patient journey | Landing, education, comprehension check, questions, decision, signature, confirmation |
| Guardian flow | Minor/incapacitated patient requiring guardian and witness |
| Interpreter flow | Language preference requiring interpreter attestation |
| Witness flow | Anesthesia or high-risk procedure requiring witness |
| Refusal flow | Refusal acknowledgment, signature, confirmation, audit |
| Accessibility | Language switch, text size, high contrast |
| Bilingual support | Arabic (RTL) and English (LTR) screens |
| Remote signing readiness | Preview of patient signing session and readiness badge |
| Audit timeline | Event ordering, actor attribution, evidence hashes |
| Evidence export | JSON metrics export and timeline evidence package |

### Out of Scope

| Item | Reason |
|------|--------|
| Production deployment | UAT is prototype-only; no deployment or merge is authorized. |
| Live WathiqNote signing | The production `/sign/[token]/workflow` route is not present in this branch. |
| OTP/SMS delivery | OTP is simulated in the prototype; real SMS gateways are not tested. |
| PDF finalization engine | PDF generation is mocked; production PDF service is not exercised. |
| Real patient data | All UAT uses deterministic mock patients to avoid PHI exposure. |
| Production feature flags | Flags are not modified; only prototype behavior is validated. |
| Clinical Knowledge Engine live integration | Mock engine is used; integration contract validation is a separate engineering task. |

## 1.3 User Groups

| Group | Role in UAT | Representative Users |
|-------|-------------|----------------------|
| Physicians | Primary users; validate clinical workflow and decision support. | 2 general surgeons, 1 cardiologist, 1 pediatrician |
| Nurses / support staff | Assist patients; validate accessibility and question flow. | 2 nurses |
| Legal affairs | Review consent language, refusal handling, evidence package. | 1 legal reviewer |
| Compliance / quality | Validate audit trail, alert acknowledgment, accessibility. | 1 compliance officer, 1 quality officer |
| IT / InfoSec | Validate environment, data handling, no PHI leakage. | 1 IT admin, 1 security reviewer |
| Patient representatives | Validate patient-facing language, readability, RTL layout. | 2 Arabic-speaking, 1 English-speaking |

## 1.4 Roles and Responsibilities

| Role | Responsibility |
|------|----------------|
| UAT Lead | Schedule sessions, assign scripts, track defects, compile report. |
| Clinical SME | Confirm clinical accuracy of alerts, risks, and required participants. |
| QA Engineer | Execute test scripts, capture screenshots, log defects, verify fixes. |
| Physician Tester | Perform physician-path scripts, provide usability feedback. |
| Patient Tester | Perform patient-path scripts in Arabic and English. |
| Legal Reviewer | Review refusal copy, evidence package, and audit events. |
| Compliance Reviewer | Confirm accessibility and bilingual requirements. |
| Release Manager | Confirm deployment checklist completion before any promotion. |

## 1.5 Test Environment Assumptions

- URL: `http://localhost:3000/prototype/clinical-workspace-2`
- Node.js 24.14.1, Next.js 16.2.4, mock data only.
- Dev server running locally or in an isolated staging preview.
- Playwright smoke script available at `qa-screenshots/capture-workspace-2-flow.mjs`.
- No database required; state is held in React client memory.

## 1.6 Entry Criteria

- [ ] Prototype build succeeds without TypeScript or ESLint errors in `/prototype/clinical-workspace-2`.
- [ ] Standalone smoke script passes for happy path, refusal path, and clinical alerts.
- [ ] Test data (mock patients, encounters, procedures) is documented and deterministic.
- [ ] All UAT participants have access to the test environment and guides.
- [ ] Defect tracking tool/board is configured.

## 1.7 Exit Criteria

- [ ] All P0 and P1 test scripts executed with no open defects.
- [ ] Legal and compliance reviewers approve refusal language and evidence package.
- [ ] Accessibility controls verified in Arabic and English.
- [ ] At least one end-to-end run completed for each clinical scenario in [Clinical Scenarios](./03-clinical-scenarios.md).
- [ ] Defect summary and risk register reviewed by UAT Lead and Clinical SME.
- [ ] Stakeholder sign-off obtained (see [Production Readiness Report](./08-production-readiness-report.md)).

## 1.8 Defect Severity Definitions

| Severity | Definition | Example | Response |
|----------|------------|---------|----------|
| P0 — Critical | Workflow cannot complete; patient safety or legal risk. | Cannot sign after accepting; refusal not recorded. | Block release; fix immediately. |
| P1 — High | Major functionality impaired; workaround exists but is unacceptable for production. | Alerts cannot be acknowledged; witness role missing. | Fix before GO. |
| P2 — Medium | Function works but with notable usability or compliance gap. | Misaligned RTL layout; timeline event missing metadata. | Fix before GO or accept as observation. |
| P3 — Low | Cosmetic or minor wording issue. | Typo in helper text; icon misalignment. | Track; fix in next iteration. |

## 1.9 Approval Gates

| Gate | Required Approver | Evidence |
|------|-------------------|----------|
| UAT Ready | UAT Lead | Entry criteria checklist complete. |
| Clinical Accuracy | Clinical SME | Signed clinical scenario validation. |
| Legal Defensibility | Legal Reviewer | Refusal and evidence review signed off. |
| Compliance & Accessibility | Compliance Officer | Accessibility and bilingual checklist complete. |
| Security & Data Handling | InfoSec Reviewer | No PHI in logs/screenshots; mock data only. |
| Release Readiness | Release Manager | Deployment and rollback checklists complete. |
| Final GO / NO GO | Executive Sponsor | [Production Readiness Report](./08-production-readiness-report.md) signed. |
