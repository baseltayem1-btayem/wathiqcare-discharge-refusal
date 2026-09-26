# 02 — Clinical Scenarios

## 1. Required Scenarios

| Category | Scenario | Library / Code Evidence | Status |
|----------|----------|------------------------|--------|
| **Specialty** | General Surgery | `imcApprovedConsentLibrary.generated.ts`: 33 `General Surgery` forms; also many `General / Other` | Supported |
| **Specialty** | Orthopedics | No dedicated Orthopedics specialty in library | Gap |
| **Specialty** | Emergency | No dedicated Emergency Medicine specialty in library | Gap |
| **Specialty** | Radiology | `Radiology / Interventional Radiology`: 36 forms | Supported |
| **Specialty** | Endoscopy | `Gastroenterology / Endoscopy`: 12 forms | Supported |
| **Specialty** | Cardiology | No dedicated Cardiology specialty in library | Gap |
| **Specialty** | Urology | 18 forms | Supported |
| **Specialty** | ENT | 10 forms | Supported |
| **Guardian** | Guardian signing on behalf of patient | `normalizeSignerRole` maps `GUARDIAN` role; metadata stores `signerName` and role | Partial |
| **Interpreter** | Interpreter present / attestation | No interpreter role, signature role, or attestation flow found | Not supported |
| **Witness** | Witness required / attestation | No witness role or signature role found | Not supported |
| **Refusal** | Patient refuses treatment | Refusal path implemented: refusal acknowledgement + refusal signature + REFUSAL_SIGNED event | Supported |
| **Withdrawal** | Consent withdrawn after signing | No withdrawal or void flow found | Not supported |
| **Repeat signature** | Signature repeated (e.g., error correction) | Blocked by duplicate-role check; requires new document | Supported (no retry) |
| **Expired OTP** | OTP passes TTL / max attempts | 10-minute TTL, 3-attempt limit per challenge; new request invalidates old | Supported |
| **Expired consent** | Consent document expires before signing | Document-level expiry not observed in code | Not confirmed |

## 2. Library Specialty Distribution

```
General / Other                          112
ENT                                       10
General Surgery                           33
Anesthesia                                 2
Radiology / Interventional Radiology      36
Blood Transfusion                          2
Obstetrics & Gynecology                    9
Gastroenterology / Endoscopy              12
Urology                                   18
Allergy / Immunology                       5
Ophthalmology                              1
Research                                   1
Oncology / Hematology                      1
Vascular Surgery                           1
```

## 3. Consent Type Coverage

```
PROCEDURE_CONSENT              227
ANESTHESIA_CONSENT               2
DIAGNOSTIC_IMAGING_CONSENT      11
BLOOD_TRANSFUSION_CONSENT        2
RESEARCH_CLINICAL_TRIAL_CONSENT  1
```

## 4. Findings

### 4.1 Missing explicit Orthopedics, Emergency, and Cardiology templates

- **Description:** The IMC approved-content library does not contain forms
  tagged with `Orthopedics`, `Emergency`, or `Cardiology`. Orthopedic, cardiac,
  and emergency cases may fall back to `General / Other` or require a manual
  workflow.
- **Severity:** Medium
- **Operational Impact:** Physicians in these departments may need to use the
  generic consent form or the manual fallback, reducing workflow standardization.
- **Clinical Impact:** Specialty-specific risks/benefits may not be presented
  to the patient from an approved template, affecting informed-consent quality.
- **Recommendation:** Map existing general forms to these specialties or add
  specialty-specific approved forms before pilot expansion beyond the initial
  surgical cohort.
- **Estimated Effort:** 1–2 days (content mapping review).
- **Owner:** Clinical Content Lead + IMC Governance.

### 4.2 Interpreter workflow not implemented

- **Description:** No interpreter role, signature attestation, or language-
  interpretation acknowledgment exists in the consent or public-signing flows.
- **Severity:** High
- **Operational Impact:** Hospitals with non-Arabic/non-English speakers cannot
  document interpreter-mediated consent within the system.
- **Clinical Impact:** Legally required interpreter attestation may be missing,
  creating compliance and patient-safety risk.
- **Recommendation:** Add an interpreter attestation field and signature role,
  or document the manual offline workaround and legal sign-off before pilot.
- **Estimated Effort:** 2–5 days.
- **Owner:** Legal + Clinical UX.

### 4.3 Witness workflow not implemented

- **Description:** No witness signature role or witness-required flag is present
  in the code. `normalizeSignerRole` only distinguishes `GUARDIAN` and
  `PATIENT`.
- **Severity:** High
- **Operational Impact:** Procedures requiring a witness cannot be documented
  electronically.
- **Clinical Impact:** Consent validity may be challenged for procedures where
  witness attestation is mandated by policy or regulation.
- **Recommendation:** Add `WITNESS` signature role and a witness-required
  template flag; otherwise exclude witness-required procedures from pilot scope.
- **Estimated Effort:** 2–4 days.
- **Owner:** Legal + Engineering.

### 4.4 Consent withdrawal not supported

- **Description:** After PDF finalization there is no withdrawal, void, or
  cancellation flow. A signed consent remains in `FINALIZED`/`SIGNED` state
  indefinitely.
- **Severity:** Medium
- **Operational Impact:** Patients who change their mind require a manual,
  out-of-system process.
- **Clinical Impact:** Delay in recording revocation; risk of proceeding with a
  procedure after patient has withdrawn consent.
- **Recommendation:** Define and implement a withdrawal workflow (new document
  status `WITHDRAWN`, reversal audit event, patient acknowledgment) or add it
  to the out-of-scope list with clinical SOP.
- **Estimated Effort:** 2–4 days.
- **Owner:** Clinical + Legal + Engineering.

### 4.5 Guardian signing is partially supported

- **Description:** The service accepts a `GUARDIAN` signer role and records the
  guardian name, but the UI/workflow for identifying the guardian relationship
  and authority is not validated.
- **Severity:** Medium
- **Operational Impact:** Risk of selecting the wrong signer role or missing
  legal-guardian verification.
- **Clinical Impact:** A non-authorized signer could invalidate the consent.
- **Recommendation:** Document guardian-selection criteria in the physician
  workflow and require guardian relationship/ID capture before pilot.
- **Estimated Effort:** 4–8 hours.
- **Owner:** Clinical UX + Legal.
