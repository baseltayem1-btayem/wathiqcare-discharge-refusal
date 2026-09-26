# RC1 Gate 1.3 — 02 Missing Events

**Scope:** Identify audit events that are required for legal, clinical, compliance, and forensic review but are currently missing or incomplete.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

WathiqCare produces many audit events, but several legally significant actions are either not audited or are audited only in operational logs/stdout rather than the durable tamper-evident audit store. The most critical gaps are: logout/session termination, session timeout, patient view of education/consent, consent withdrawal, feature-flag overrides, administrative changes, and explicit patient/encounter context in core audit tables.

---

## 1. Missing Authentication Events

### EVT-MISS-01 — Logout not audited

| Field | Details |
|---|---|
| **Description** | `apps/web/src/app/api/auth/logout/route.ts` clears the session cookie but writes no `AuditLog` or `AuditChainEvent`. |
| **Risk** | Cannot prove when a user's session ended. |
| **Legal Impact** | Weakens non-repudiation in shared-workstation or forensic investigations. |
| **Clinical Impact** | Cannot demonstrate that a clinician's session was properly terminated. |
| **Recommendation** | Add `writeAuditLog(action: 'session_terminated')` on logout, including user, IP, UA, and timestamp. |
| **Priority** | P2 |
| **Estimated Effort** | 2–4 h |

### EVT-MISS-02 — Session timeout not audited

| Field | Details |
|---|---|
| **Description** | No event is emitted when a session expires due to inactivity or absolute timeout. |
| **Risk** | Gap in session lifecycle evidence. |
| **Legal Impact** | Cannot prove that inactive sessions are automatically terminated. |
| **Clinical Impact** | Patient data may be accessed after expected timeout without audit record. |
| **Recommendation** | Emit `session_timeout`/`session_expired` events during token validation when expiry is detected. |
| **Priority** | P2 |
| **Estimated Effort** | 4–8 h |

### EVT-MISS-03 — Password reset / change not audited

| Field | Details |
|---|---|
| **Description** | No dedicated audit event for password reset requests, reset completion, or password change. |
| **Risk** | Account takeover via credential change may go undetected. |
| **Legal Impact** | Weakens identity non-repudiation. |
| **Clinical Impact** | Compromised clinician accounts may be used without forensic trace. |
| **Recommendation** | Add `password_reset_requested`, `password_reset_completed`, `password_changed` audit events. |
| **Priority** | P1 |
| **Estimated Effort** | 4–8 h |

### EVT-MISS-04 — Signup / user creation not audited in production path

| Field | Details |
|---|---|
| **Description** | `/api/auth/password/signup` returns success without writing an audit event for new user creation. |
| **Risk** | Unauthorized account creation is not traceable. |
| **Legal Impact** | Cannot prove who created accounts and when. |
| **Clinical Impact** | Rogue accounts could access clinical data. |
| **Recommendation** | Add `user_created`/`signup_completed` audit event with actor, tenant, and timestamp. |
| **Priority** | P1 |
| **Estimated Effort** | 2–4 h |

### EVT-MISS-05 — Failed login attempts not persisted in Python backend

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/api/routers/auth.py` logs login attempts to stdout but does not write to `AuditLog` or `WorkflowAuditLog`. |
| **Risk** | Authentication events are only in volatile logs. |
| **Legal Impact** | No durable record of brute-force attempts or successful logins. |
| **Clinical Impact** | Cannot forensically investigate account compromise. |
| **Recommendation** | Persist login success/failure to `AuditLog` with masked email, IP, UA, outcome. |
| **Priority** | P1 |
| **Estimated Effort** | 1 day |

---

## 2. Missing Consent Lifecycle Events

### EVT-MISS-06 — Patient viewed consent not audited

| Field | Details |
|---|---|
| **Description** | No event records when a patient or representative opens/views the consent document before signing. |
| **Risk** | Cannot prove the patient was presented with the document. |
| **Legal Impact** | Informed consent validity may be challenged. |
| **Clinical Impact** | Cannot demonstrate patient education/presentation occurred. |
| **Recommendation** | Add `consent_viewed`/`consent_presented` event when the public signing page loads. |
| **Priority** | P1 |
| **Estimated Effort** | 4–8 h |

### EVT-MISS-07 — Consent withdrawn not audited

| Field | Details |
|---|---|
| **Description** | No explicit event for withdrawal of consent after it has been finalized. |
| **Risk** | Withdrawal actions are invisible. |
| **Legal Impact** | Patient's right to withdraw consent may not be demonstrable. |
| **Clinical Impact** | Clinical decisions may rely on a consent that was withdrawn. |
| **Recommendation** | Add `consent_withdrawn` event with actor, timestamp, and new status. |
| **Priority** | P1 |
| **Estimated Effort** | 1 day |

### EVT-MISS-08 — Consent modified after approval not explicitly audited

| Field | Details |
|---|---|
| **Description** | `consent_document_edited` is emitted, but edits after physician approval may not be clearly distinguished. |
| **Risk** | Approved consent text could be altered without clear audit separation. |
| **Legal Impact** | Evidence of post-approval tampering may be ambiguous. |
| **Clinical Impact** | Wrong procedure/diagnosis could be introduced after approval. |
| **Recommendation** | Add explicit `consent_modified_after_approval` or enforce immutable state after approval. |
| **Priority** | P1 |
| **Estimated Effort** | 1–2 days |

### EVT-MISS-09 — Consent rejected (by committee/legal) not audited

| Field | Details |
|---|---|
| **Description** | No explicit `consent_rejected` event for committee or legal rejection. |
| **Risk** | Rejection decisions are not durably recorded. |
| **Legal Impact** | Cannot demonstrate governance decisions. |
| **Clinical Impact** | Rejected consents might be used clinically. |
| **Recommendation** | Add `consent_rejected` event with reason, actor, and timestamp. |
| **Priority** | P2 |
| **Estimated Effort** | 4–8 h |

---

## 3. Missing Patient Education Events

### EVT-MISS-10 — Patient viewed education material not consistently audited

| Field | Details |
|---|---|
| **Description** | `EDUCATION_OPENED` is emitted in some paths, but not all education views are recorded. `ProcedureEducationAuditEvent` schema exists but no producer was found. |
| **Risk** | Cannot prove patient received required education. |
| **Legal Impact** | Informed consent may be challenged if education delivery cannot be proven. |
| **Clinical Impact** | Patients may sign without adequate understanding. |
| **Recommendation** | Standardize education-view events across all education assets and ensure `ProcedureEducationAuditEvent` is populated. |
| **Priority** | P1 |
| **Estimated Effort** | 1–2 days |

### EVT-MISS-11 — Patient declined education not audited

| Field | Details |
|---|---|
| **Description** | No event when a patient declines to view education materials. |
| **Risk** | Cannot document patient refusal of education. |
| **Legal Impact** | Incomplete evidence of informed consent process. |
| **Clinical Impact** | Risk of proceeding without documented patient engagement. |
| **Recommendation** | Add `education_declined` event. |
| **Priority** | P2 |
| **Estimated Effort** | 4–8 h |

---

## 4. Missing WathiqNote Lifecycle Events

### EVT-MISS-12 — WathiqNote created/modified/approved not explicitly audited

| Field | Details |
|---|---|
| **Description** | Promissory note creation and signing are audited generically, but there is no dedicated WathiqNote audit event type or table. |
| **Risk** | Financial/legal note lifecycle is fragmented. |
| **Legal Impact** | Enforceability of promissory notes may be weakened. |
| **Clinical Impact** | Financial liability decisions lack clear evidence. |
| **Recommendation** | Add dedicated `WathiqNoteAuditEvent` table and events for create, update, approve, sign, cancel. |
| **Priority** | P2 |
| **Estimated Effort** | 2–3 days |

### EVT-MISS-13 — WathiqNote downloaded/printed not audited

| Field | Details |
|---|---|
| **Description** | No event when a promissory note PDF is downloaded or printed. |
| **Risk** | Unauthorized disclosure of financial documents is untraceable. |
| **Legal Impact** | Cannot track document distribution. |
| **Clinical Impact** | Patient financial data may leak without record. |
| **Recommendation** | Add `wathiqnote_downloaded`, `wathiqnote_printed` events. |
| **Priority** | P2 |
| **Estimated Effort** | 1 day |

---

## 5. Missing PDF/Document Events

### EVT-MISS-14 — PDF downloaded not audited consistently

| Field | Details |
|---|---|
| **Description** | Some legal-package downloads are audited, but general PDF/document downloads are not consistently recorded. |
| **Risk** | Unauthorized document access is not traceable. |
| **Legal Impact** | Cannot demonstrate who received a copy of a legal document. |
| **Clinical Impact** | Patient records may be inappropriately shared. |
| **Recommendation** | Add `document_downloaded`/`pdf_downloaded` event for every document download endpoint. |
| **Priority** | P1 |
| **Estimated Effort** | 1–2 days |

### EVT-MISS-15 — PDF regenerated not always audited as distinct event

| Field | Details |
|---|---|
| **Description** | `pdf_regenerated` exists in some paths but may not cover all regeneration scenarios. |
| **Risk** | Multiple versions of the same document may be indistinguishable. |
| **Legal Impact** | Cannot prove which version was the authoritative copy. |
| **Clinical Impact** | Clinicians may rely on an outdated PDF. |
| **Recommendation** | Ensure every regeneration produces a distinct `pdf_regenerated` event with version and reason. |
| **Priority** | P2 |
| **Estimated Effort** | 1 day |

### EVT-MISS-16 — Document printed not audited

| Field | Details |
|---|---|
| **Description** | Browser print actions are not captured in the audit store. |
| **Risk** | Hard copies are produced without record. |
| **Legal Impact** | Cannot track physical document distribution. |
| **Clinical Impact** | Printed consents may be lost or altered. |
| **Recommendation** | Add client-side `beforeprint` telemetry or rely on download event as proxy; document limitation. |
| **Priority** | P3 |
| **Estimated Effort** | 1–2 days |

---

## 6. Missing Signature Events

### EVT-MISS-17 — Signature cancelled/abandoned not audited

| Field | Details |
|---|---|
| **Description** | No event when a patient starts but does not complete signing. |
| **Risk** | Cannot distinguish between refused and abandoned signatures. |
| **Legal Impact** | Incomplete evidence of signing attempt. |
| **Clinical Impact** | May misinterpret patient intent. |
| **Recommendation** | Add `signature_cancelled`/`signature_abandoned` event with session/correlation ID. |
| **Priority** | P2 |
| **Estimated Effort** | 1 day |

### EVT-MISS-18 — Signature method changed not audited

| Field | Details |
|---|---|
| **Description** | No event when a patient switches from OTP to tablet or Nafath method. |
| **Risk** | Method provenance is unclear. |
| **Legal Impact** | Signature validity may be questioned. |
| **Clinical Impact** | Incorrect method may be attributed to patient. |
| **Recommendation** | Add `signature_method_changed` event. |
| **Priority** | P3 |
| **Estimated Effort** | 4–8 h |

### EVT-MISS-19 — Physician/witness signature hash not stored in web stack

| Field | Details |
|---|---|
| **Description** | `ConsentDocumentSignature` has no top-level `signatureHash`; only public-signing path stores a hash in metadata JSON. |
| **Risk** | Physician/witness signatures lack cryptographic proof. |
| **Legal Impact** | Non-repudiation of clinician signatures is weakened. |
| **Clinical Impact** | Clinician attestation may be challenged. |
| **Recommendation** | Add mandatory `signatureHash` column and compute it for all signature methods. |
| **Priority** | P0 |
| **Estimated Effort** | 3–4 days |

---

## 7. Missing Clinical Knowledge Engine / Content Mapping Events

### EVT-MISS-20 — Clinical rule executed not explicitly audited

| Field | Details |
|---|---|
| **Description** | CKE rule execution is implicit in assembly events; no explicit `clinical_rule_executed` event. |
| **Risk** | Cannot reconstruct which rules fired for a consent. |
| **Legal Impact** | Clinical decision rationale may be challenged. |
| **Clinical Impact** | Wrong rule application may not be detectable. |
| **Recommendation** | Add `clinical_rule_executed` event with rule ID, inputs, outputs, and patient context. |
| **Priority** | P2 |
| **Estimated Effort** | 2–3 days |

### EVT-MISS-21 — Content mapping resolved not explicitly audited

| Field | Details |
|---|---|
| **Description** | `consent_form_loaded_from_library` and `education_material_loaded` exist, but there is no explicit `content_mapping_resolved` event with mapping ID and version. |
| **Risk** | Cannot prove which content mapping produced the consent. |
| **Legal Impact** | Content provenance is unclear. |
| **Clinical Impact** | Outdated or incorrect mappings may be used. |
| **Recommendation** | Add `content_mapping_resolved` event with mapping ID, version, procedure code, and timestamp. |
| **Priority** | P2 |
| **Estimated Effort** | 1–2 days |

### EVT-MISS-22 — Feature flag override not audited

| Field | Details |
|---|---|
| **Description** | No event when a feature flag is overridden via environment variable or query parameter (e.g., pilot flags). |
| **Risk** | Experimental features can be enabled without trace. |
| **Legal Impact** | Non-approved flows may be used without evidence. |
| **Clinical Impact** | Patients may be exposed to unvalidated workflows. |
| **Recommendation** | Add `feature_flag_override` event whenever a non-default flag value is evaluated in production. |
| **Priority** | P2 |
| **Estimated Effort** | 2–3 days |

---

## 8. Missing Administrative / Security Events

### EVT-MISS-23 — Administrative changes not audited

| Field | Details |
|---|---|
| **Description** | Tenant settings, user roles, permissions, retention policies, and subscription changes are partially audited but not consistently. |
| **Risk** | Privileged misuse is not traceable. |
| **Legal Impact** | Cannot demonstrate administrative governance. |
| **Clinical Impact** | Unauthorized access changes could expose patient data. |
| **Recommendation** | Add `admin_user_role_changed`, `admin_tenant_setting_changed`, `admin_retention_policy_changed` events. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

### EVT-MISS-24 — Data export / report access not consistently audited

| Field | Details |
|---|---|
| **Description** | `ReportAccessLog` exists but not all export/report endpoints write to it. |
| **Risk** | Bulk data exports are untracked. |
| **Legal Impact** | PDPL/HIPAA breach investigations lack evidence. |
| **Clinical Impact** | Patient data may be exfiltrated. |
| **Recommendation** | Audit every CSV/PDF/data export endpoint. |
| **Priority** | P1 |
| **Estimated Effort** | 1–2 days |

### EVT-MISS-25 — API key / token lifecycle not audited

| Field | Details |
|---|---|
| **Description** | No events for API key creation, rotation, or revocation. |
| **Risk** | Compromised keys cannot be traced. |
| **Legal Impact** | Weak non-repudiation for programmatic access. |
| **Clinical Impact** | Integration data leaks may be undetectable. |
| **Recommendation** | Add `api_key_created`, `api_key_rotated`, `api_key_revoked` events. |
| **Priority** | P2 |
| **Estimated Effort** | 1–2 days |

### EVT-MISS-26 — Security incident response actions not audited

| Field | Details |
|---|---|
| **Description** | `SecurityIncident` records incidents, but remediation actions (acknowledge, escalate, close) may not be audited. |
| **Risk** | Incident handling is not traceable. |
| **Legal Impact** | Cannot demonstrate timely response. |
| **Clinical Impact** | Security events may be mishandled. |
| **Recommendation** | Add `security_incident_acknowledged`, `security_incident_escalated`, `security_incident_resolved` events. |
| **Priority** | P2 |
| **Estimated Effort** | 1 day |

---

## 9. Missing Context Fields

### EVT-MISS-27 — Core audit tables lack explicit `patientId`

| Field | Details |
|---|---|
| **Description** | `AuditLog` and `AuditChainEvent` do not have a `patientId` column; patient context is inferred via `caseId`. |
| **Risk** | Patient-scoped audit queries require complex joins. |
| **Legal Impact** | Slow/incorrect forensic queries. |
| **Clinical Impact** | Difficult to produce a complete patient record of consent/events. |
| **Recommendation** | Add `patientId`/`mrn` columns to core audit tables where available. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

### EVT-MISS-28 — Core audit tables lack explicit `encounterId`

| Field | Details |
|---|---|
| **Description** | No `encounterId` FK in `AuditLog`/`AuditChainEvent`; only `ConsentEmrMapping.encounterIdentifier` stores it. |
| **Risk** | Encounter-scoped evidence is fragmented. |
| **Legal Impact** | Cannot easily reconstruct all events for a specific encounter. |
| **Clinical Impact** | Clinical review per encounter is difficult. |
| **Recommendation** | Add `encounterId` to core audit tables and introduce an `Encounter` model. |
| **Priority** | P1 |
| **Estimated Effort** | 3–5 days |

### EVT-MISS-29 — Unified correlation ID missing

| Field | Details |
|---|---|
| **Description** | No `correlationId` column in `AuditLog`/`AuditChainEvent`; correlation is ad-hoc inside `metadataJson`. |
| **Risk** | End-to-end request tracing is impossible. |
| **Legal Impact** | Cannot correlate frontend, Next.js, and Python backend events for a single action. |
| **Clinical Impact** | Troubleshooting and forensic reconstruction are slow/error-prone. |
| **Recommendation** | Add `correlationId` column and propagate `x-request-id`/`x-correlation-id` across all calls. |
| **Priority** | P1 |
| **Estimated Effort** | 2–3 days |

---

## 10. Summary Table

| ID | Missing Event / Field | Priority | Effort | Legal Impact | Clinical Impact |
|---|---|---|---|---|---|
| EVT-MISS-01 | Logout not audited | P2 | 2–4 h | Medium | Medium |
| EVT-MISS-02 | Session timeout not audited | P2 | 4–8 h | Medium | High |
| EVT-MISS-03 | Password reset/change not audited | P1 | 4–8 h | High | High |
| EVT-MISS-04 | Signup not audited | P1 | 2–4 h | High | High |
| EVT-MISS-05 | Python login not persisted | P1 | 1 day | High | High |
| EVT-MISS-06 | Patient viewed consent not audited | P1 | 4–8 h | High | High |
| EVT-MISS-07 | Consent withdrawn not audited | P1 | 1 day | High | High |
| EVT-MISS-08 | Consent modified after approval unclear | P1 | 1–2 days | High | High |
| EVT-MISS-09 | Consent rejected not audited | P2 | 4–8 h | Medium | Medium |
| EVT-MISS-10 | Patient viewed education not consistent | P1 | 1–2 days | High | High |
| EVT-MISS-11 | Patient declined education not audited | P2 | 4–8 h | Low | Medium |
| EVT-MISS-12 | WathiqNote lifecycle not dedicated | P2 | 2–3 days | Medium | Medium |
| EVT-MISS-13 | WathiqNote downloaded not audited | P2 | 1 day | Medium | Medium |
| EVT-MISS-14 | PDF downloaded not consistent | P1 | 1–2 days | High | High |
| EVT-MISS-15 | PDF regenerated not distinct everywhere | P2 | 1 day | Medium | Medium |
| EVT-MISS-16 | Document printed not audited | P3 | 1–2 days | Low | Low |
| EVT-MISS-17 | Signature cancelled not audited | P2 | 1 day | Medium | Medium |
| EVT-MISS-18 | Signature method changed not audited | P3 | 4–8 h | Low | Low |
| EVT-MISS-19 | Physician/witness signature hash missing | P0 | 3–4 days | Critical | Critical |
| EVT-MISS-20 | Clinical rule executed not explicit | P2 | 2–3 days | Medium | High |
| EVT-MISS-21 | Content mapping resolved not explicit | P2 | 1–2 days | Medium | High |
| EVT-MISS-22 | Feature flag override not audited | P2 | 2–3 days | Medium | High |
| EVT-MISS-23 | Administrative changes not consistent | P1 | 2–3 days | High | High |
| EVT-MISS-24 | Data export not consistent | P1 | 1–2 days | High | High |
| EVT-MISS-25 | API key lifecycle not audited | P2 | 1–2 days | Medium | Medium |
| EVT-MISS-26 | Security incident actions not audited | P2 | 1 day | Medium | Medium |
| EVT-MISS-27 | Core audit tables lack patientId | P1 | 2–3 days | High | High |
| EVT-MISS-28 | Core audit tables lack encounterId | P1 | 3–5 days | High | High |
| EVT-MISS-29 | Unified correlationId missing | P1 | 2–3 days | High | High |
