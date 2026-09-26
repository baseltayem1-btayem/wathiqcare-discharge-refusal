# RC1 Gate 1.3 — 01 Current Audit Map

**Scope:** Inventory of every audit event currently produced in WathiqCare.  
**Analysis date:** 2026-06-26  
**Deliverable owner:** Release Manager

---

## Executive Summary

WathiqCare emits audit events from **two runtimes**: the Next.js/Prisma stack (`apps/web`) and the Python FastAPI/SQLAlchemy stack (`apps/api/backend`). The Next.js side has the richer, more durable audit infrastructure, centered on `AuditLog` and `AuditChainEvent`. The Python backend has a mix of persisted `AuditLog`/`WorkflowAuditLog` events and an **in-memory** hash-chained `AuditLogger` used by the clinical discharge engine.

---

## 1. Audit Infrastructure

### 1.1 Next.js / Prisma Audit Infrastructure

| Component | File / Table | Purpose |
|---|---|---|
| Operational audit writer | `apps/web/src/lib/server/saas-services.ts` → `writeAuditLog` | Writes to `AuditLog` and appends to `AuditChainEvent` |
| Hash-chain service | `apps/web/src/lib/server/audit-chain-service.ts` → `appendAuditChainEvent` | SHA-256 linked chain in `AuditChainEvent` |
| Consent audit writer | `apps/web/src/lib/server/consent-library-service.ts` → `writeConsentAudit` | Writes `ConsentAuditEvent`, `ConsentTimelineEvent`, `AuditLog`, `AuditChainEvent` |
| Prisma `AuditLog` table | `apps/web/prisma/schema.prisma` | Generic operational audit |
| Prisma `AuditChainEvent` table | `apps/web/prisma/schema.prisma` | Tamper-evident hash chain |
| Prisma `ConsentAuditEvent` table | `apps/web/prisma/schema.prisma` | Consent lifecycle audit |
| Prisma `ConsentTimelineEvent` table | `apps/web/prisma/schema.prisma` | Consent timeline |

### 1.2 Python Backend Audit Infrastructure

| Component | File / Table | Purpose |
|---|---|---|
| In-memory hash-chain logger | `apps/api/backend/audit/audit_logger.py` | Used by `DischargeEngine` / `CaseOrchestrator`; **lost on restart** |
| Persisted generic audit | `apps/api/backend/models/audit_log.py` → `audit_logs` | Auth, secure links, documents, integration events |
| Workflow audit | `apps/api/backend/models/workflow_audit_log.py` → `workflow_audit_logs` | Workflow engine + legal orchestration events |
| Session audit | `apps/api/backend/models/discharge_session_audit_log.py` → `discharge_session_audit_logs` | Medico-legal form sessions |
| Audit service | `apps/api/backend/services/audit_service.py` | Helper to write `WorkflowAuditLog` |
| Structured logger | `apps/api/backend/core/logging_config.py` | JSON stdout logging |

---

## 2. Audit Event Inventory

### Legend

| Column | Meaning |
|---|---|
| **Actor** | `auth.sub`, JWT `sub`, `public_signer`, `system`, email-derived, or provider |
| **Timestamp** | `createdAt`/`created_at`/`signedAt` defaulting to `now()` or explicit ISO |
| **Correlation ID** | Explicit request/correlation ID or ad-hoc `challengeId`/`sessionId`/`tokenHash` |
| **Patient Context** | Direct `patientId`, `mrn`, or inferred via `caseId`/`consentDocumentId` |
| **Encounter Context** | Direct `encounterId`/`encounterIdentifier` or inferred via `caseId` |
| **Evidence/Hash** | Hash, signature, chain hash, or integrity proof |

---

### 2.1 Authentication & Access Events (Next.js)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `password_login_success` / `failure` | `app/api/auth/password/login/route.ts` `recordLoginAttempt` | Login form submit | email, ip_address, user_agent, success, reason | email | `created_at` | none | none | none |
| `platform_api_access_attempt` | `lib/server/auth.ts` | API access allowed/denied | user_id, email, role, endpoint, method, result, reason, ip, ua | `auth.sub` | now | none | none | none |
| `privileged_allowed` / `denied` | `lib/server/security-policy-service.ts` | Step-up sensitive action | `PrivilegedAccessLog` + `AuditLog` | actorUserId | now | none | caseId | none |
| `magic_link_requested` / `used` | `lib/server/magic-link-route-flow.ts` | Magic link lifecycle | tokenId, expiresAt, provider | user ID | explicit ISO | none | none | none |

### 2.2 Authentication & Access Events (Python)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `permission_denied` | `core/rbac.py` | Missing permission | entity_type, entity_id, action, details | current_user["id"] | `utcnow()` | none | none | none |
| `unauthorized_case_access_attempt` | `core/rbac.py` | Case access denied | case_id, role | current_user["id"] | `utcnow()` | none | case_id | none |
| `privileged_document_download` | `core/rbac.py` | Final doc download | document_id | current_user["id"] | `utcnow()` | none | via document | none |
| `login_attempt` / `login_success` / `login_failed_*` | `api/routers/auth.py` | Login | masked email, user_id, tenant_id, role, reason | user | UTC ISO | none | none | none |

### 2.3 Consent Lifecycle Events (Next.js)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `consent_template_created` | `consent-library-service.ts` | New template | template id, version, code, specialty, type | `auth.sub` | now | none | none | none |
| `consent_template_version_created` | `consent-library-service.ts` | New version | version label, clonedFromVersionId | `auth.sub` | now | none | none | none |
| `consent_template_version_status_changed` | `consent-library-service.ts` | Approve/activate/archive | new status, approver | `auth.sub` | now | none | none | none |
| `consent_document_created` | `consent-library-service.ts` | Document instantiated | consent reference, template, version | `auth.sub` | now | none | via caseId | caseId |
| `consent_document_edited` | `consent-library-service.ts` | Physician edits | before/after diagnosis & procedure | `auth.sub` | now | none | via caseId | caseId | `fixedClauseChecksum` |
| `consent_document_approved` | `consent-library-service.ts` | Physician approves | physician license, checksum | `auth.sub` | now | none | via caseId | caseId | `fixedClauseChecksum` |
| `consent_document_signed` | `consent-library-service.ts` | Signature captured | role, signer name, method | `auth.sub` | now | none | via caseId | caseId | metadata hash |
| `consent_document_finalized` | `consent-library-service.ts` | Finalized | PDF hash, checksum, evidence copies | `auth.sub` | now | none | via caseId | caseId | `immutablePdfHash`, `fixedClauseChecksum` |
| `consent_committee_review_submitted` | `consent-library-service.ts` | Committee review | decision, comments | `auth.sub` | now | none | via doc | via doc |
| `consent_emr_mapping_upserted` | `consent-library-service.ts` | EMR mapping saved | diagnosis/procedure codes, encounter identifier | `auth.sub` | now | none | via doc | encounterIdentifier |

### 2.4 Public Signing / OTP Events (Next.js)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `PUBLIC_SIGNING_OTP_REQUESTED` | `public-signing-service.ts` | OTP requested | challenge id, token hash, masked phone | public_signer | now | challengeId, sessionId, tokenHash | none | via doc |
| `OTP_VERIFY_FAILED` | `public-signing-service.ts` | Wrong OTP | challenge id, masked phone | public_signer | now | challengeId | none | via doc |
| `PATIENT_SIGNATURE_VERIFIED_BY_OTP` | `public-signing-service.ts` | OTP verified | document hash, OTP hash, token hash | public_signer | now | challengeId, tokenHash | none | via doc | documentHash |
| `REFUSAL_SIGNED` | `public-signing-service.ts` | Refusal signed | refusal form hash, signature hash, OTP hash | public_signer | now | challengeId, tokenHash | none | via doc | refusalFormHash, signatureHash |
| `PATIENT_SIGNATURE_CAPTURED` | `public-signing-service.ts` | Consent signed | signature hash, document hash, pdfHash | public_signer | now | challengeId, tokenHash | none | via doc | signatureHash, documentHash, pdfHash |
| `SECURE_SIGNING_LINK_CREATED` | `module-secure-signing-service.ts` | Signing link issued | session id, token hash, delivery statuses | initiatedBy | now | sessionId, tokenHash | patient name | caseId | tokenHash |
| `secure_link_created` / `revoked` | `secure-links.ts` | Secure link lifecycle | recipient email, delivery status | user ID | now | link_id | via caseId | caseId | token hash |

### 2.5 Signature Orchestration Events (Next.js)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `signing_session_created` / `submit_failed` | `signature-orchestration-service.ts` | External signing session | provider session id, signer links, expiry | initiatedBy | now | sessionId | via document | via document |
| `signer.signed` / `session.completed` / `session.expired` | `signature-orchestration-service.ts` | Provider webhook | webhook_events + signing_events | provider | now | providerSessionId | via session | via session | HMAC verified |
| `token_used` / `revoked` | `signature-orchestration-service.ts` | Token consumption | signing_secure_tokens | system | now | token | via session | via session |

### 2.6 PDF Generation Events (Next.js)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `pdf_generation_requested` | `legal-case-pdf-service.ts` | PDF requested | trigger, requested_final, version | `auth.sub` | now | none | via caseId | caseId | none |
| `pdf_generated` / `pdf_regenerated` | `legal-case-pdf-service.ts` | PDF generated | version, status, content hash, binary hash | `auth.sub` | now | none | via caseId | caseId | `sha256_hash`, `sha256_binary_hash` |
| `pdf_generation_failed` | `legal-case-pdf-service.ts` | PDF failure | error message, trigger | `auth.sub` | now | none | via caseId | caseId | none |
| `evidence_package_generated` | `informed-consents-evidence-vault-service.ts` | Evidence package | storage path, checksum, verification token | `auth.sub` | now | verificationToken | via doc | via caseId | `checksumSha256` |

### 2.7 Promissory Note Events (Next.js)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `promissory_note_created` | `promissory-note-service.ts` | Note created | note number, amount, currency, due date | `auth.sub` | now | none | via caseId | caseId | `documentHash` |
| `promissory_note_signing_started` | `promissory-note-debtor-signing-service.ts` | Signing link sent | note number, debtor mobile, signing URL | `auth.sub` | now | none | via caseId | caseId | none |

### 2.8 Clinical Knowledge Engine (CKE) Events (Next.js)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `PUBLISHED` / governance transitions | `clinical-knowledge/services/governance-service.ts` | CKE governance transition | entity type/id, event type, actor, role, comment, metadata | actorUserId | now | none | none | none | `simpleHash()` (weak) |
| `cke_assembly_requested` / `failed` | `clinical-knowledge/informed-consent-integration.ts` | CKE mapping requested | procedure code, patient context | system | now | none | via patient context | none |
| `consent_form_loaded_from_library` | `clinical-knowledge/informed-consent-integration.ts` | CKE form resolved | template id, version, package id/version | system | now | none | via patient context | none |
| `education_material_loaded` / `not_available` | `clinical-knowledge/informed-consent-integration.ts` | Education resolved | education id, asset id, type | system | now | none | via patient context | none |

### 2.9 Patient Education Events (Next.js)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `EDUCATION_OPENED` / `FAQ_VIEWED` / `UNDERSTANDING_COMPLETED` / `UNDERSTANDING_PASSED` / `EDUCATION_COMPLETED` | `patient-education-evidence.ts` | Patient education telemetry | template code, language, score, duration, attempts | `auth.sub` / public_signer | now | sessionId | via doc | caseId if provided |

### 2.10 Case / Discharge Refusal Workflow Events (Next.js)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `RISKS_EXPLAINED` | `case-compliance-service.ts` | Risk explanation | case metadata + AuditLog + AuditChainEvent | `auth.sub` | now | none | via caseId | caseId | none |
| `SIGNATURE_RECORDED` | `case-compliance-service.ts` | Signature/refusal | case metadata, ConsentRecord, AuditLog, AuditChainEvent | `auth.sub` | now | none | via caseId | caseId | documentHash |
| `WITNESS_RECORDED` | `case-compliance-service.ts` | Witness actions | case metadata, AuditLog, AuditChainEvent | `auth.sub` | now | none | via caseId | caseId | signature_hash, identity_hash |
| `EXPORT_LEGAL_PACKAGE` | `case-compliance-service.ts` | Legal package export | Document, AuditLog, AuditChainEvent, ReportAccessLog | `auth.sub` | now | none | via caseId | caseId | none |
| `legal_escalation_note_added` / `priority_updated` / `resolved` | `dischargeMedicoLegal.ts` | Legal escalation lifecycle | AuditLog | `auth.sub` | now | none | via caseId | caseId | none |

### 2.11 Discharge / Legal / Workflow Events (Python)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `DISCHARGE_ORDER / CREATE` / `STATUS_UPDATE` | `core/discharge_engine.py` | Discharge order lifecycle | entry_id, actor_id, role, resource_id, outcome, previous_hash, entry_hash | physician/SYSTEM | UTC ISO | none | patient_id (object) | none | SHA-256 chain hash |
| `REFUSAL_RECORD / CREATE` / `REFUSAL_RECORDED` | `core/discharge_engine.py` / `case_orchestrator.py` | Refusal recorded | resource_id, details, patient_data | nurse/SYSTEM | UTC ISO | none | patient_data | none | SHA-256 chain hash |
| `ESCALATION / ESCALATED_*` | `core/case_orchestrator.py` | Case escalation | case_id, legal_case_id | SYSTEM/LEGAL | UTC ISO | none | patient_data | none | SHA-256 chain hash |
| `REFUSAL_DOCUMENTATION / GENERATE` | `core/case_orchestrator.py` | Document generation | case_id, form_id | SYSTEM/ADMIN | UTC ISO | none | patient_data | none | SHA-256 chain hash |
| `CASE_CREATED` / `DISCHARGE_ORDER_ISSUED` / `PATIENT_SIGNATURE_REQUESTED` / `PATIENT_ACCEPTED` / `PATIENT_REFUSED` / `CASE_CLOSED` | `services/workflow_engine.py` | Workflow lifecycle | case_id, task_id, metadata_json | actor_user_id | `utcnow()` | none | case_id, patient_id, patient_name, mrn | none | none |
| `legal_state_transition` / `master_discharge_document_generated` / `patient_response_recorded` / `evidence_package_generated` | `modules/discharge_legal_workflow/legal_orchestration_service.py` | Legal orchestration | case_id, from/to state, document_id, package_hash | actor.user_id | `utcnow()` | none | case_id, patient_id | encounter_number | document/package hashes |

### 2.12 Secure Link Events (Python)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `secure_link_generated` / `revoked` / `expired` / `link_opened` / `token_validated` / `decision_submitted` / `refusal_acknowledged` / `secure_link_consumed` | `services/secure_link_service.py` | Secure link lifecycle | case_id, link_id, recipient, ip, ua, decision, signature_hash | created_by / revoked_by | `utcnow()` | none | case_id | none | token hash (HMAC-SHA256), signature_hash |

### 2.13 Signature Proof Events (Python)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `form_viewed` / `agreement_viewed` / `acknowledgment_method_selected` / `agreement_sent_for_signature` / `sms_otp_sent` / `nafath_verification_started` / `tablet_signature_started` / `sms_otp_verified` / `nafath_verification_completed` / `tablet_signature_captured` / `signature_verified` / `evidence_bundle_created` / `pdf_generated` / `document_attached_to_case` | `signature/signature_proof_service.py` | Signature journey | case_id, document_type, session_id, method, verified | current_user["id"] | `utcnow()` | session_id | case_id | none | evidence bundle hashes |

### 2.14 Forms Engine OTP/Signature Events (Python)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `document_generated` / `document_signed` / `document_witness_signed` / `document_otp_issued` / `document_otp_sent` / `document_otp_resend_blocked` / `document_otp_expired` / `document_otp_replay_blocked` / `document_otp_verified` / `document_otp_verification_failed` | `core/forms_engine_service.py` | Form session OTP/signature | case_id, document_id, template_key, challenge_id | current_user["id"] | `_now()` | none | case_id | none | otpCodeHash, signature hash |

### 2.15 Integration / Notification Events (Python)

| Event Name | Source | Trigger | Stored Fields | Actor | Timestamp | Correlation ID | Patient Context | Encounter Context | Evidence/Hash |
|---|---|---|---|---|---|---|---|---|---|
| `integration_sync_queued` / `completed` / `failed` | `services/integration_monitoring_service.py` | Integration runs | run_id, connector, status, processed, failed | triggered_by | `utcnow()` | none | none | none |
| `secure_link_email_sent` / `failed` / `not_configured` | `api/routers/secure_links.py` | Secure link email | link_id, recipient | created_by | UTC ISO | none | case_id | none |
| `sms_send_requested` / `succeeded` / `failed` / `retry_scheduled` | `services/notifications/sms_service.py` / `taqnyat_provider.py` | SMS dispatch | provider, message_type, status_code, error, masked recipient | system | UTC ISO | none | case_id | none |
| `DASHBOARD_ALERT_CREATED` | `notifications/dashboard_channel.py` | Dashboard alert | alert_id, alert_key, severity, tenant_id | system | UTC ISO | none | case_id | none |
| `WHATSAPP_*` | `notifications/whatsapp_channel.py` | WhatsApp fallback | to, status_code, error | system | UTC ISO | none | case_id | none |

---

## 3. Audit Event Coverage Summary

| Domain | Next.js Events | Python Events | Gaps |
|---|---|---|---|
| Authentication | login attempts, magic links, privileged access | login attempts, permission denials | logout, session timeout, signup not audited |
| Consent lifecycle | rich event set | limited | consent viewed by patient, consent withdrawn |
| OTP | public signing OTP events | forms engine OTP events | unified OTP verification table |
| Signature | public signing, orchestration | signature proof, forms engine | physician/witness signature hash in web stack |
| PDF | generation, evidence packages | document generation | PDF-byte hash not consistently stored |
| WathiqNote | promissory note lifecycle | — | WathiqNote-specific audit table |
| Clinical Knowledge Engine | governance events | — | weak hash in governance events |
| Content Mapping | EMR mapping upsert | — | content mapping resolved event |
| Discharge/Refusal | case compliance | rich engine/orchestration | in-memory Python audit lost on restart |
| Integration | TrakCare logs | integration scheduler | correlation IDs missing |

---

## 4. Key Findings

### FIND-AUD-MAP-01 — Audit events are produced by two independent runtimes

| Field | Details |
|---|---|
| **Description** | Next.js and Python backends both emit audit events into different tables/schemas without a unified event model or correlation ID. |
| **Risk** | Forensic reconstruction requires joining across two runtimes; events may be missed or duplicated. |
| **Legal Impact** | Incomplete or inconsistent evidence chain; difficulty proving chain of custody. |
| **Clinical Impact** | Clinical actions may be audited in one runtime but not the other. |
| **Recommendation** | Define a single canonical audit event schema and propagate correlation IDs across the HTTP boundary. |
| **Priority** | P1 |
| **Estimated Effort** | 3–5 days |

### FIND-AUD-MAP-02 — Python `AuditLogger` is in-memory only

| Field | Details |
|---|---|
| **Description** | `apps/api/backend/audit/audit_logger.py` stores hash-chained entries in `self._entries`; no DB persistence. |
| **Risk** | All discharge-engine audit evidence is lost on process restart. |
| **Legal Impact** | Critical evidence for discharge/refusal workflows disappears on every deploy/restart. |
| **Clinical Impact** | Cannot reconstruct clinical decisions made via the Python discharge engine. |
| **Recommendation** | Persist `AuditLogger` entries to PostgreSQL on every log call or replace with `AuditLog`/`WorkflowAuditLog`. |
| **Priority** | P0 |
| **Estimated Effort** | 2–3 days |
