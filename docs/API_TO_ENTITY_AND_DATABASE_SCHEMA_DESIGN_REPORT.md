# API-to-Entity and Database Schema Design Report

Date: 2026-03-13
Execution mode: Analysis and design only
Implementation status: No DB objects created, no migrations executed

## Inputs and Evidence Baseline

Authoritative inputs used:
- docs/openapi/openapi.json
- docs/openapi/CANONICAL_OPENAPI_READINESS_REPORT.md
- backend/models/*.py
- backend/schemas/*.py
- backend/api/routers/*.py
- prisma/schema.prisma
- backend/core/discharge_workflow_service.py
- backend/core/forms_engine_service.py
- backend/signature/signature_proof_service.py
- backend/legal/escalation_case_service.py

Contract baseline:
- 68 paths, 68 operations
- duplicate method+path count: 0
- SHC endpoint is conditional and appears when SHC_COMPLIANCE_MODULE=true

Assumption policy used in this report:
- If OpenAPI response schemas are weak or inline, assumptions are explicitly marked.
- If an entity is currently file-backed, proposed table evidence includes API and service files, and marks backend model as missing.

---

## 1. Business Entity Inventory

| Entity | Domain/Module | Short business purpose | Likely persistence need | Related APIs |
|---|---|---|---|---|
| Tenant | Authentication / Tenancy | Tenant boundary and configuration identity | Reference/master | /auth/login |
| User | Authentication / Users | Authenticated staff identity and role | Reference/master | /auth/login |
| TenantMembership | Authentication / Tenancy | Multi-tenant user membership and role assignment | Transactional/supporting | no canonical path (current contract gap) |
| Invitation | Authentication / Tenancy | Tenant invitation lifecycle | Transactional/supporting | no canonical path (current contract gap) |
| Patient | Patients | Clinical subject identity per tenant | Reference/master | /api/discharge/refusal, /api/discharge/cases/*, /his/patient/{mrn} |
| Case | Discharge Cases | Canonical case envelope for workflow instances | Transactional | /api/discharge/cases, /api/discharge/cases/{case_id} |
| DischargeRefusalCase | Discharge Cases | Refusal-specific case context and signature summary | Transactional | /api/discharge/refusal, /api/cases/{case_id}/discharge-refusal-workflow/* |
| DischargeRefusalWorkflow | Discharge Refusal Workflow | Stage machine, timestamps, state transitions | Transactional | /api/discharge/cases/{case_id}/workflow/*, /api/cases/{case_id}/discharge-refusal-workflow/* |
| DischargeCaseDocumentation | Case Documentation | Policy documentation snapshot for refusal cases | Transactional | /api/discharge/cases/{case_id}, /api/discharge/cases/{case_id}/workflow/validate |
| Document | Workflow Documents | Generated forms and legal/medical document records | Transactional | /api/discharge/cases/{case_id}/documents, /api/documents/{document_id}/*, /api/forms/* |
| DocumentSignature | Signature / Acknowledgment | Signature state and signer metadata | Transactional | /api/documents/{document_id}/sign, /api/documents/{document_id}/witness-sign |
| DocumentOtpChallenge | Signature / Acknowledgment | OTP challenge and verification state | Transactional | /api/documents/{document_id}/send-otp, /api/documents/{document_id}/verify-otp |
| SignatureAckSession | Signature / Acknowledgment | End-to-end acknowledgment session for SMS/NAFATH/tablet | Transactional | /api/discharge/cases/{case_id}/acknowledgment/start, /verify, /{session_id} |
| EvidenceBundle | Signature / Acknowledgment | Evidentiary package metadata and hashes | Audit/supporting | /api/discharge/evidence-bundle/{discharge_case_id}, signature ack verify flow |
| AuditLog | Audit Logs | Immutable case and document event trail | Audit | /api/discharge/audit/{case_id}, /api/cases/{case_id}/audit-log |
| LegalEscalationCase | Compliance / Legal | Escalation assignment, priority, and resolution state | Transactional | /api/discharge/cases/{case_id}/legal-escalation/* |
| LegalEscalationNote | Compliance / Legal | Structured legal/compliance notes | Audit/transactional | /api/discharge/cases/{case_id}/legal-escalation/notes |
| HomeCarePlan | Home Healthcare / SHC Compliance | Home care alternative details for refusal workflow | Transactional (conditional) | /api/shc-compliance/workflow (conditional) |
| EquipmentRequest | Home Healthcare / SHC Compliance | Equipment workflow and temporary approval state | Transactional (conditional) | /api/shc-compliance/workflow (conditional) |
| TransferRequest | Home Healthcare / SHC Compliance | Transfer-hospital branch details | Transactional (conditional) | /api/shc-compliance/workflow (conditional) |
| PatientFinancialLiability | SHC Compliance | Financial liability notice and acceptance state | Transactional (conditional) | /api/shc-compliance/workflow (conditional), /api/cases/{case_id}/discharge-refusal-workflow/generate-financial-notice |
| IntegrationSystemReference | Integration References | Reference of external systems and integration status | Integration-supporting | /integrations/systems |

---

## 2. Normalized Entity Model Report

### 2.1 Core design boundaries

- Tenant owns all operational data through tenant_id.
- Case is canonical envelope; DischargeRefusalCase is specialization.
- Workflow, documentation, legal escalation, and documents are attached to DischargeRefusalCase.
- Audit is append-only and linkable to case/document.
- Signature and OTP become DB-backed (replace file JSON side state).

### 2.2 Entity definitions (normalized)

| Entity | Business purpose | Primary key strategy | Important attributes | Relationships | Ownership boundary | Classification |
|---|---|---|---|---|---|---|
| Tenant | Tenant boundary | uniqueidentifier (tenant_id) | code, name, domain, is_active | 1:N users, patients, cases, audits | IAM | reference |
| User | Staff identity and role | uniqueidentifier (user_id) | email, full_name, role, is_active, hashed_password | N:1 tenant; 1:N cases/docs/audits | IAM | reference |
| Patient | Patient identity per tenant | uniqueidentifier (patient_id) | mrn, full_name, date_of_birth | N:1 tenant; 1:N cases | Clinical data | reference |
| Case | Generic case container | uniqueidentifier (case_id) | case_number, case_type, status, metadata_json | N:1 tenant; 1:0..1 discharge_refusal_case | Workflow platform | transactional |
| DischargeRefusalCase | Refusal-specific case | uniqueidentifier (discharge_refusal_case_id) | discharge_status, discharge_alternative, signature summary fields | 1:1 case; 1:1 workflow; 1:N docs | Refusal domain | transactional |
| DischargeRefusalWorkflow | Timeline/state engine | uniqueidentifier (workflow_id) | current_stage, timestamps, refusal_reason, notes | 1:1 refusal_case; 1:1 case_documentation | Refusal domain | transactional |
| DischargeCaseDocumentation | Policy documentation | uniqueidentifier (case_doc_id) | decision_recorded_at, discussion_summary, refusal_reasons, forms_issued | 1:1 workflow | Compliance documentation | transactional |
| Document | Generated artifact registry | uniqueidentifier (document_id) | document_type, template_key, title, storage_path, payload_json, signed_at | N:1 case/refusal_case; 1:0..1 signature; 1:0..1 otp | Document service | transactional |
| DocumentSignature | Signature details | uniqueidentifier (document_signature_id) | signature_method, signature_hash, signer metadata, otp_verified | 1:1 document | Signature service | transactional |
| DocumentOtpChallenge | OTP lifecycle | uniqueidentifier (otp_id) | challenge_id, provider, delivery_status, otp_code_hash, verified | 1:1 document | Signature service | transactional |
| SignatureAckSession | Full acknowledgment session | uniqueidentifier (session_id) | method, verification_status, provider_result_json, proof_metadata_json | N:1 case; optional 1:1 document | Signature service | transactional |
| EvidenceBundle | Evidence metadata | uniqueidentifier (evidence_bundle_id) | evidence_json, checksum_hash, stored_path | N:1 case; N:1 session | Signature/compliance | audit |
| LegalEscalationCase | Legal/compliance escalation state | uniqueidentifier (legal_case_id) | priority, assigned_counsel, reason, follow_up_date, resolution_notes | 1:1 case/refusal_case; 1:N notes | Legal/compliance | transactional |
| LegalEscalationNote | Escalation notes stream | uniqueidentifier (legal_note_id) | note_type, note_text, author, created_at | N:1 legal_escalation_case | Legal/compliance | audit |
| AuditLog | Immutable events | uniqueidentifier (audit_log_id) | entity_type, entity_id, action, details, metadata_json, created_at | N:1 tenant/user, optional N:1 case/document | Audit | audit |
| HomeCarePlan | SHC home care branch | uniqueidentifier (home_care_plan_id) | care_type, equipment_required_json, care_provider | N:1 refusal_case | SHC module | transactional |
| EquipmentRequest | SHC equipment branch | uniqueidentifier (equipment_request_id) | requested_equipment, department, status | N:1 refusal_case | SHC module | transactional |
| TransferRequest | SHC transfer branch | uniqueidentifier (transfer_request_id) | receiving_hospital, transfer_reason, medical_stability_confirmation | N:1 refusal_case | SHC module | transactional |
| PatientFinancialLiability | SHC financial branch | uniqueidentifier (pfl_id) | notice_doc_path, accepted, signed_at, signature_hash | N:1 refusal_case | SHC module | transactional |
| IntegrationSystemReference | Integration status reference | uniqueidentifier (integration_ref_id) | system_code, enabled, endpoint_pattern, metadata_json | N:1 tenant or global | Integration | integration-supporting |
| TenantMembership | User-tenant bridge | uniqueidentifier (tenant_membership_id) | role, status, joined_at | N:1 tenant, N:1 user | IAM | transactional |
| Invitation | Tenant invitation workflow | uniqueidentifier (invitation_id) | email, role, status, token hash, expiry | N:1 tenant, optional N:1 inviter/acceptor user | IAM | transactional |

---

## 3. SQL Server Table Design Matrix (with mandatory source evidence)

Conventions:
- IDs: uniqueidentifier default newid()
- Timestamps: datetime2(3)
- JSON: nvarchar(max) with ISJSON check where required
- Text: nvarchar(max)
- Boolean: bit

### 3.1 security.tenants

- Columns:
  - tenant_id uniqueidentifier NOT NULL PK
  - code nvarchar(64) NOT NULL
  - name nvarchar(255) NOT NULL
  - domain nvarchar(255) NULL
  - is_active bit NOT NULL default(1)
  - timezone nvarchar(64) NULL
  - country nvarchar(64) NULL
  - billing_email nvarchar(255) NULL
  - metadata_json nvarchar(max) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: tenant_id
- FKs: none
- Unique: UQ_tenants_code(code)
- Indexes: IX_tenants_is_active(is_active)
- Nullable/required: as defined above
- Audit columns: created_at, updated_at
- Tenancy columns: not applicable (root tenant table)
- Soft-delete/status: is_active
- Source evidence:
  - OpenAPI path(s): /auth/login
  - Request/response schema(s): LoginRequest, TokenResponse
  - Backend model file(s): backend/models/tenant.py, prisma/schema.prisma (model Tenant)

### 3.2 security.users

- Columns:
  - user_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - email nvarchar(255) NOT NULL
  - full_name nvarchar(255) NOT NULL
  - role nvarchar(64) NOT NULL
  - is_active bit NOT NULL default(1)
  - hashed_password nvarchar(512) NULL
  - last_login_at datetime2(3) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: user_id
- FKs: tenant_id -> security.tenants(tenant_id)
- Unique: UQ_users_email(email)
- Indexes: IX_users_tenant_role(tenant_id, role), IX_users_tenant_active(tenant_id, is_active)
- Nullable/required: hashed_password and last_login_at nullable
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: is_active
- Source evidence:
  - OpenAPI path(s): /auth/login
  - Request/response schema(s): LoginRequest, TokenResponse
  - Backend model file(s): backend/models/user.py, prisma/schema.prisma (model User)

### 3.3 workflow.patients

- Columns:
  - patient_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - mrn nvarchar(64) NOT NULL
  - full_name nvarchar(255) NOT NULL
  - date_of_birth date NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: patient_id
- FKs: tenant_id -> security.tenants(tenant_id)
- Unique: UQ_patients_tenant_mrn(tenant_id, mrn)
- Indexes: IX_patients_tenant_name(tenant_id, full_name)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: none (active lifecycle handled at case level)
- Source evidence:
  - OpenAPI path(s): /api/discharge/refusal, /api/discharge/cases/{case_id}, /his/patient/{mrn}
  - Request/response schema(s): DischargeRefusalRequest, HomecarePreviewRequest, inline responses
  - Backend model file(s): backend/models/patient.py, prisma/schema.prisma (patient fields represented across Case/DischargeRefusalCase context)

### 3.4 workflow.cases

- Columns:
  - case_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - patient_id uniqueidentifier NULL
  - case_number nvarchar(64) NULL
  - case_type nvarchar(64) NOT NULL default('GENERAL')
  - status nvarchar(64) NOT NULL
  - workflow_type nvarchar(64) NULL
  - title nvarchar(255) NULL
  - patient_name nvarchar(255) NULL
  - patient_id_number nvarchar(64) NULL
  - medical_record_no nvarchar(64) NULL
  - room_number nvarchar(64) NULL
  - metadata_json nvarchar(max) NULL
  - version int NOT NULL default(1)
  - created_by_user_id uniqueidentifier NULL
  - updated_by_user_id uniqueidentifier NULL
  - closed_at datetime2(3) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: case_id
- FKs: tenant_id -> security.tenants, patient_id -> workflow.patients, created_by_user_id -> security.users, updated_by_user_id -> security.users
- Unique: UQ_cases_tenant_case_number(tenant_id, case_number)
- Indexes: IX_cases_tenant_status(tenant_id, status), IX_cases_tenant_workflow(tenant_id, workflow_type)
- Nullable/required: patient_id nullable to support legacy/imported records
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: status-driven; closed_at
- Source evidence:
  - OpenAPI path(s): /api/discharge/cases, /api/discharge/cases/{case_id}, /api/discharge/refusal
  - Request/response schema(s): DischargeRefusalRequest, inline case detail/list responses, DischargeCaseListItem and DischargeCaseDetail contracts in backend schemas
  - Backend model file(s): backend/models/discharge_case.py, prisma/schema.prisma (model Case)

### 3.5 workflow.discharge_refusal_cases

- Columns:
  - discharge_refusal_case_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - case_id uniqueidentifier NOT NULL
  - discharge_status nvarchar(64) NOT NULL
  - discharge_alternative nvarchar(64) NULL
  - rights_acknowledgment_doc_path nvarchar(1024) NULL
  - refusal_form_doc_path nvarchar(1024) NULL
  - signature_method nvarchar(64) NULL
  - signature_timestamp datetime2(3) NULL
  - signature_device nvarchar(128) NULL
  - signature_ip_address nvarchar(64) NULL
  - signature_hash nvarchar(256) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: discharge_refusal_case_id
- FKs: tenant_id -> security.tenants, case_id -> workflow.cases
- Unique: UQ_refusal_case_case_id(case_id)
- Indexes: IX_refusal_case_tenant_status(tenant_id, discharge_status)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: discharge_status
- Source evidence:
  - OpenAPI path(s): /api/discharge/refusal, /api/cases/{case_id}/discharge-refusal-workflow/*
  - Request/response schema(s): DischargeRefusalRequest, WorkflowMutationRequest
  - Backend model file(s): prisma/schema.prisma (model DischargeRefusalCase), backend/models/discharge_case.py (current operational overlap)

### 3.6 workflow.discharge_refusal_workflows

- Columns:
  - workflow_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - discharge_refusal_case_id uniqueidentifier NOT NULL
  - status nvarchar(64) NOT NULL
  - case_status nvarchar(128) NOT NULL
  - current_stage nvarchar(128) NOT NULL
  - discharge_decision_at datetime2(3) NULL
  - refusal_started_at datetime2(3) NULL
  - initial_communication_at datetime2(3) NULL
  - support_and_intervention_at datetime2(3) NULL
  - social_services_referred_at datetime2(3) NULL
  - refusal_form_generated_at datetime2(3) NULL
  - financial_notice_generated_at datetime2(3) NULL
  - escalation_due_at datetime2(3) NULL
  - escalated_at datetime2(3) NULL
  - closed_at datetime2(3) NULL
  - refusal_reason nvarchar(max) NULL
  - discussion_summary nvarchar(max) NULL
  - insurance_coverage_status nvarchar(64) NULL
  - responsible_department nvarchar(128) NULL
  - responsible_person nvarchar(255) NULL
  - next_action nvarchar(max) NULL
  - compliance_notes nvarchar(max) NULL
  - legal_notes nvarchar(max) NULL
  - financial_notice_issued bit NOT NULL default(0)
  - financial_notice_acknowledged bit NOT NULL default(0)
  - refusal_form_signed bit NOT NULL default(0)
  - witness_mode bit NOT NULL default(0)
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: workflow_id
- FKs: tenant_id -> security.tenants, discharge_refusal_case_id -> workflow.discharge_refusal_cases
- Unique: UQ_workflow_refusal_case(discharge_refusal_case_id)
- Indexes: IX_workflow_stage(status, current_stage), IX_workflow_escalation_due(escalation_due_at), IX_workflow_tenant_status(tenant_id, status)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: status, case_status
- Source evidence:
  - OpenAPI path(s): /api/discharge/cases/{case_id}/workflow/*, /api/cases/{case_id}/discharge-refusal-workflow/*
  - Request/response schema(s): WorkflowActionRequest, WorkflowMutationRequest, WorkflowTemplateGenerateRequest, WorkflowTemplatePreviewRequest, WorkflowValidationRequest
  - Backend model file(s): backend/models/discharge_workflow.py

### 3.7 workflow.discharge_case_documentation

- Columns:
  - case_documentation_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - workflow_id uniqueidentifier NOT NULL
  - decision_recorded_at datetime2(3) NULL
  - discussion_summary nvarchar(max) NULL
  - refusal_reasons nvarchar(max) NULL
  - forms_issued nvarchar(max) NULL
  - social_administrative_interventions nvarchar(max) NULL
  - last_validated_at datetime2(3) NULL
  - last_validation_status nvarchar(64) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: case_documentation_id
- FKs: tenant_id -> security.tenants, workflow_id -> workflow.discharge_refusal_workflows
- Unique: UQ_case_doc_workflow(workflow_id)
- Indexes: IX_case_doc_validation(last_validation_status, last_validated_at)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: last_validation_status as lifecycle marker
- Source evidence:
  - OpenAPI path(s): /api/discharge/cases/{case_id}, /api/discharge/cases/{case_id}/workflow/validate
  - Request/response schema(s): WorkflowValidationRequest, policy_documentation response contract fields
  - Backend model file(s): backend/models/workflow_case_documentation.py

### 3.8 documents.documents

- Columns:
  - document_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - case_id uniqueidentifier NULL
  - discharge_refusal_case_id uniqueidentifier NULL
  - workflow_id uniqueidentifier NULL
  - document_type nvarchar(64) NOT NULL
  - status nvarchar(64) NOT NULL
  - document_code nvarchar(64) NULL
  - title_en nvarchar(255) NOT NULL
  - title_ar nvarchar(255) NULL
  - template_key nvarchar(128) NOT NULL
  - template_version nvarchar(32) NOT NULL
  - file_name nvarchar(512) NOT NULL
  - mime_type nvarchar(128) NOT NULL
  - storage_path nvarchar(1024) NULL
  - preview_html nvarchar(max) NULL
  - payload_json nvarchar(max) NULL
  - size_bytes bigint NOT NULL default(0)
  - generated_by_user_id uniqueidentifier NULL
  - generated_at datetime2(3) NOT NULL
  - signed_by_user_id uniqueidentifier NULL
  - signed_at datetime2(3) NULL
  - metadata_json nvarchar(max) NULL
  - is_deleted bit NOT NULL default(0)
  - deleted_at datetime2(3) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: document_id
- FKs: tenant_id -> security.tenants, case_id -> workflow.cases, discharge_refusal_case_id -> workflow.discharge_refusal_cases, workflow_id -> workflow.discharge_refusal_workflows, generated_by_user_id -> security.users, signed_by_user_id -> security.users
- Unique: none globally; allow multiple versions per case/template
- Indexes: IX_docs_tenant_type_status(tenant_id, document_type, status), IX_docs_case(case_id), IX_docs_refusal_case(discharge_refusal_case_id), IX_docs_generated_at(generated_at), IX_docs_signed_at(signed_at)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: is_deleted, deleted_at, status
- Source evidence:
  - OpenAPI path(s): /api/discharge/cases/{case_id}/documents, /api/documents/{document_id}/view, /download, /preview, /api/forms/cases/{case_id}/documents
  - Request/response schema(s): GenerateFormRequest, WorkflowTemplateGenerateRequest, MedicalLegalFormsRenderRequest, inline document responses
  - Backend model file(s): backend/models/workflow_document.py, prisma/schema.prisma (model Document)

### 3.9 documents.document_signatures

- Columns:
  - document_signature_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - document_id uniqueidentifier NOT NULL
  - signature_method nvarchar(64) NOT NULL
  - signer_name nvarchar(255) NULL
  - signer_role nvarchar(128) NULL
  - signature_hash nvarchar(256) NULL
  - signature_payload_json nvarchar(max) NULL
  - otp_verified bit NOT NULL default(0)
  - otp_verified_at datetime2(3) NULL
  - archived_status bit NOT NULL default(0)
  - archived_at datetime2(3) NULL
  - archived_by_user_id uniqueidentifier NULL
  - signed_by_user_id uniqueidentifier NULL
  - signed_at datetime2(3) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: document_signature_id
- FKs: tenant_id -> security.tenants, document_id -> documents.documents, signed_by_user_id -> security.users, archived_by_user_id -> security.users
- Unique: UQ_doc_signatures_document(document_id)
- Indexes: IX_doc_signatures_method(signature_method), IX_doc_signatures_signed_at(signed_at)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: archived_status
- Source evidence:
  - OpenAPI path(s): /api/documents/{document_id}/sign, /api/documents/{document_id}/witness-sign
  - Request/response schema(s): SignDocumentRequest, WitnessSignRequest
  - Backend model file(s): none currently (file-backed state); source logic in backend/core/forms_engine_service.py

### 3.10 documents.document_otp_challenges

- Columns:
  - otp_challenge_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - document_id uniqueidentifier NOT NULL
  - challenge_id nvarchar(128) NOT NULL
  - provider nvarchar(64) NOT NULL
  - delivery_status nvarchar(64) NOT NULL
  - masked_phone nvarchar(64) NULL
  - otp_code_hash nvarchar(256) NULL
  - sent_by_user_id uniqueidentifier NULL
  - sent_at datetime2(3) NOT NULL
  - verified bit NOT NULL default(0)
  - verified_at datetime2(3) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: otp_challenge_id
- FKs: tenant_id -> security.tenants, document_id -> documents.documents, sent_by_user_id -> security.users
- Unique: UQ_doc_otp_document(document_id)
- Indexes: IX_doc_otp_challenge(challenge_id), IX_doc_otp_verified(verified)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: verified state
- Source evidence:
  - OpenAPI path(s): /api/documents/{document_id}/send-otp, /api/documents/{document_id}/verify-otp
  - Request/response schema(s): SendOtpRequest, VerifyOtpRequest
  - Backend model file(s): none currently (file-backed state); source logic in backend/core/forms_engine_service.py and backend/signature/providers/sms_otp_provider.py

### 3.11 documents.signature_ack_sessions

- Columns:
  - session_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - case_id uniqueidentifier NOT NULL
  - document_type nvarchar(64) NOT NULL
  - template_version nvarchar(64) NULL
  - document_hash nvarchar(256) NULL
  - acknowledgment_method nvarchar(64) NOT NULL
  - verification_status nvarchar(64) NOT NULL
  - patient_name nvarchar(255) NULL
  - patient_id_number nvarchar(64) NULL
  - medical_record_number nvarchar(64) NULL
  - provider_result_json nvarchar(max) NULL
  - proof_metadata_json nvarchar(max) NULL
  - rendered_html nvarchar(max) NULL
  - context_json nvarchar(max) NULL
  - workflow_document_id uniqueidentifier NULL
  - verified_at datetime2(3) NULL
  - created_by_user_id uniqueidentifier NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: session_id
- FKs: tenant_id -> security.tenants, case_id -> workflow.cases, workflow_document_id -> documents.documents, created_by_user_id -> security.users
- Unique: none
- Indexes: IX_sig_sessions_case_status(case_id, verification_status), IX_sig_sessions_method(acknowledgment_method), IX_sig_sessions_verified_at(verified_at)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: verification_status
- Source evidence:
  - OpenAPI path(s): /api/discharge/cases/{case_id}/acknowledgment/start, /api/discharge/cases/{case_id}/acknowledgment/{session_id}, /verify
  - Request/response schema(s): StartAcknowledgmentRequest, VerifyAcknowledgmentRequest
  - Backend model file(s): none currently (file-backed state); source logic in backend/signature/signature_proof_service.py

### 3.12 documents.evidence_bundles

- Columns:
  - evidence_bundle_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - case_id uniqueidentifier NOT NULL
  - session_id uniqueidentifier NULL
  - checksum_hash nvarchar(256) NOT NULL
  - evidence_json nvarchar(max) NOT NULL
  - stored_path nvarchar(1024) NULL
  - created_at datetime2(3) NOT NULL
- PK: evidence_bundle_id
- FKs: tenant_id -> security.tenants, case_id -> workflow.cases, session_id -> documents.signature_ack_sessions
- Unique: none
- Indexes: IX_evidence_case_created(case_id, created_at DESC), IX_evidence_checksum(checksum_hash)
- Audit columns: created_at
- Tenancy columns: tenant_id
- Soft-delete/status: none
- Source evidence:
  - OpenAPI path(s): /api/discharge/evidence-bundle/{discharge_case_id}, signature verify path family
  - Request/response schema(s): no explicit request schema for evidence-bundle path, VerifyAcknowledgmentRequest for signature verification workflow
  - Backend model file(s): none currently (file-backed artifacts); source logic in backend/signature/evidence/evidence_bundle_builder.py and backend/signature/signature_proof_service.py

### 3.13 legal.legal_escalation_cases

- Columns:
  - legal_escalation_case_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - case_id uniqueidentifier NOT NULL
  - discharge_refusal_case_id uniqueidentifier NULL
  - status nvarchar(64) NOT NULL
  - priority nvarchar(32) NOT NULL
  - risk_level nvarchar(32) NULL
  - assigned_counsel nvarchar(255) NULL
  - follow_up_date datetime2(3) NULL
  - reason nvarchar(max) NULL
  - escalated_at datetime2(3) NULL
  - resolved_at datetime2(3) NULL
  - resolution_notes nvarchar(max) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK: legal_escalation_case_id
- FKs: tenant_id -> security.tenants, case_id -> workflow.cases, discharge_refusal_case_id -> workflow.discharge_refusal_cases
- Unique: UQ_legal_case_case(case_id)
- Indexes: IX_legal_case_status_priority(status, priority), IX_legal_case_followup(follow_up_date)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: status
- Source evidence:
  - OpenAPI path(s): /api/discharge/cases/{case_id}/legal-escalation, /assign, /priority, /resolve
  - Request/response schema(s): LegalEscalationAssignRequest, LegalEscalationPriorityRequest, LegalEscalationResolveRequest
  - Backend model file(s): none currently (file-backed legal record); source logic in backend/legal/escalation_case_service.py

### 3.14 legal.legal_escalation_notes

- Columns:
  - legal_escalation_note_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - legal_escalation_case_id uniqueidentifier NOT NULL
  - note_type nvarchar(64) NOT NULL
  - note_text nvarchar(max) NOT NULL
  - author_user_id uniqueidentifier NULL
  - author_role nvarchar(64) NULL
  - created_at datetime2(3) NOT NULL
- PK: legal_escalation_note_id
- FKs: tenant_id -> security.tenants, legal_escalation_case_id -> legal.legal_escalation_cases, author_user_id -> security.users
- Unique: none
- Indexes: IX_legal_note_case_created(legal_escalation_case_id, created_at DESC), IX_legal_note_type(note_type)
- Audit columns: created_at
- Tenancy columns: tenant_id
- Soft-delete/status: none
- Source evidence:
  - OpenAPI path(s): /api/discharge/cases/{case_id}/legal-escalation/notes
  - Request/response schema(s): LegalEscalationNoteRequest
  - Backend model file(s): none currently (notes embedded in file JSON); source logic in backend/legal/escalation_case_service.py

### 3.15 audit.audit_logs

- Columns:
  - audit_log_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - user_id uniqueidentifier NOT NULL
  - entity_type nvarchar(64) NOT NULL
  - entity_id nvarchar(64) NOT NULL
  - action nvarchar(128) NOT NULL
  - details nvarchar(max) NULL
  - case_id uniqueidentifier NULL
  - document_id uniqueidentifier NULL
  - ip_address nvarchar(64) NULL
  - user_agent nvarchar(512) NULL
  - metadata_json nvarchar(max) NULL
  - created_at datetime2(3) NOT NULL
- PK: audit_log_id
- FKs: tenant_id -> security.tenants, user_id -> security.users, case_id -> workflow.cases, document_id -> documents.documents
- Unique: none
- Indexes: IX_audit_tenant_created(tenant_id, created_at DESC), IX_audit_entity(entity_type, entity_id), IX_audit_case(case_id, created_at DESC), IX_audit_action_created(action, created_at DESC)
- Audit columns: created_at
- Tenancy columns: tenant_id
- Soft-delete/status: none (append-only)
- Source evidence:
  - OpenAPI path(s): /api/discharge/audit/{case_id}, /api/cases/{case_id}/audit-log
  - Request/response schema(s): AuditLogItem response contract; most OpenAPI responses inline + HTTPValidationError
  - Backend model file(s): backend/models/audit_log.py, prisma/schema.prisma (model AuditLog)

### 3.16 compliance.home_care_plans (conditional SHC)

- Columns:
  - home_care_plan_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - case_id uniqueidentifier NOT NULL
  - discharge_refusal_case_id uniqueidentifier NOT NULL
  - care_type nvarchar(64) NOT NULL
  - equipment_required_json nvarchar(max) NOT NULL
  - care_provider nvarchar(64) NOT NULL
  - agreement_doc_path nvarchar(1024) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK/FK/Indexes: PK(home_care_plan_id), FK chain to tenant/case/refusal_case, IX(tenant_id, case_id)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: none
- Source evidence:
  - OpenAPI path(s): /api/shc-compliance/workflow (conditional, documented in canonical readiness report)
  - Request/response schema(s): SHCWorkflowRequest, HomeCarePlanPayload
  - Backend model file(s): prisma/schema.prisma (model HomeCarePlan); runtime structures in backend/modules/shc_discharge_compliance/shc_homecare_workflow.py

### 3.17 compliance.equipment_requests (conditional SHC)

- Columns:
  - equipment_request_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - case_id uniqueidentifier NOT NULL
  - discharge_refusal_case_id uniqueidentifier NOT NULL
  - requested_equipment nvarchar(255) NOT NULL
  - department nvarchar(128) NOT NULL
  - status nvarchar(32) NOT NULL
  - request_doc_path nvarchar(1024) NULL
  - temporary_approval_doc_path nvarchar(1024) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK/FK/Indexes: PK(equipment_request_id), FK chain, IX(tenant_id, case_id), IX(status)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: status
- Source evidence:
  - OpenAPI path(s): /api/shc-compliance/workflow (conditional)
  - Request/response schema(s): SHCWorkflowRequest, EquipmentRequestPayload
  - Backend model file(s): prisma/schema.prisma (model EquipmentRequest); runtime structures in backend/modules/shc_discharge_compliance/shc_equipment_request.py

### 3.18 compliance.transfer_requests (conditional SHC)

- Columns:
  - transfer_request_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - case_id uniqueidentifier NOT NULL
  - discharge_refusal_case_id uniqueidentifier NOT NULL
  - receiving_hospital nvarchar(255) NOT NULL
  - transfer_reason nvarchar(max) NOT NULL
  - medical_stability_confirmation bit NOT NULL
  - authorization_doc_path nvarchar(1024) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK/FK/Indexes: PK(transfer_request_id), FK chain, IX(tenant_id, case_id)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: none
- Source evidence:
  - OpenAPI path(s): /api/shc-compliance/workflow (conditional)
  - Request/response schema(s): SHCWorkflowRequest, TransferRequestPayload
  - Backend model file(s): prisma/schema.prisma (model TransferRequest); runtime structures in backend/modules/shc_discharge_compliance/shc_transfer_workflow.py

### 3.19 compliance.patient_financial_liability (conditional SHC)

- Columns:
  - patient_financial_liability_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NOT NULL
  - case_id uniqueidentifier NOT NULL
  - discharge_refusal_case_id uniqueidentifier NOT NULL
  - notice_doc_path nvarchar(1024) NULL
  - accepted bit NOT NULL default(0)
  - signed_at datetime2(3) NULL
  - signature_method nvarchar(64) NULL
  - signature_hash nvarchar(256) NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK/FK/Indexes: PK(patient_financial_liability_id), FK chain, IX(tenant_id, case_id), IX(accepted)
- Audit columns: created_at, updated_at
- Tenancy columns: tenant_id
- Soft-delete/status: accepted
- Source evidence:
  - OpenAPI path(s): /api/shc-compliance/workflow (conditional), /api/cases/{case_id}/discharge-refusal-workflow/generate-financial-notice
  - Request/response schema(s): SHCWorkflowRequest, WorkflowMutationRequest
  - Backend model file(s): prisma/schema.prisma (model PatientFinancialLiability), backend/modules/shc_discharge_compliance/shc_financial_liability.py

### 3.20 integration.integration_system_references

- Columns:
  - integration_system_reference_id uniqueidentifier NOT NULL PK
  - tenant_id uniqueidentifier NULL
  - system_code nvarchar(64) NOT NULL
  - enabled bit NOT NULL
  - endpoint_pattern nvarchar(512) NULL
  - resources_json nvarchar(max) NULL
  - metadata_json nvarchar(max) NULL
  - observed_at datetime2(3) NOT NULL
  - created_at datetime2(3) NOT NULL
  - updated_at datetime2(3) NOT NULL
- PK/FK/Indexes: PK(integration_system_reference_id), optional FK tenant_id -> security.tenants, UQ(system_code, tenant_id), IX(enabled)
- Audit columns: created_at, updated_at, observed_at
- Tenancy columns: tenant_id optional (supports global defaults)
- Soft-delete/status: enabled
- Source evidence:
  - OpenAPI path(s): /integrations/systems
  - Request/response schema(s): inline response object
  - Backend model file(s): no current SQLAlchemy/Prisma model; derived from backend/api/routers/integration.py

### 3.21 Deferred IAM/Billing tables (Prisma-backed, no canonical API yet)

These are part of target schema completeness but are deferred from immediate cutover because canonical OpenAPI does not expose them.

1. security.tenant_memberships
- Evidence:
  - OpenAPI path(s): none in current canonical contract
  - Request/response schema(s): none in current canonical contract
  - Backend model file(s): prisma/schema.prisma (model TenantMembership)

2. security.invitations
- Evidence:
  - OpenAPI path(s): none
  - Request/response schema(s): none
  - Backend model file(s): prisma/schema.prisma (model Invitation)

3. billing.plans
- Evidence:
  - OpenAPI path(s): none
  - Request/response schema(s): none
  - Backend model file(s): prisma/schema.prisma (model Plan)

4. billing.subscriptions
- Evidence:
  - OpenAPI path(s): none
  - Request/response schema(s): none
  - Backend model file(s): prisma/schema.prisma (model Subscription)

5. billing.usage_records
- Evidence:
  - OpenAPI path(s): none
  - Request/response schema(s): none
  - Backend model file(s): prisma/schema.prisma (model UsageRecord)

6. billing.invoices
- Evidence:
  - OpenAPI path(s): none
  - Request/response schema(s): none
  - Backend model file(s): prisma/schema.prisma (model Invoice)

7. billing.subscription_events
- Evidence:
  - OpenAPI path(s): none
  - Request/response schema(s): none
  - Backend model file(s): prisma/schema.prisma (model SubscriptionEvent)

---

## 4. Relationship Map

### 4.1 One-to-one relationships

- workflow.cases (1) -> workflow.discharge_refusal_cases (0..1)
- workflow.discharge_refusal_cases (1) -> workflow.discharge_refusal_workflows (1)
- workflow.discharge_refusal_workflows (1) -> workflow.discharge_case_documentation (0..1)
- documents.documents (1) -> documents.document_signatures (0..1)
- documents.documents (1) -> documents.document_otp_challenges (0..1)
- legal.legal_escalation_cases (1) <-> workflow.cases (1) for escalated cases

### 4.2 One-to-many relationships

- security.tenants (1) -> security.users (N)
- security.tenants (1) -> workflow.patients (N)
- security.tenants (1) -> workflow.cases (N)
- workflow.cases (1) -> documents.documents (N)
- workflow.cases (1) -> audit.audit_logs (N)
- legal.legal_escalation_cases (1) -> legal.legal_escalation_notes (N)
- workflow.discharge_refusal_cases (1) -> compliance.home_care_plans/equipment_requests/transfer_requests/patient_financial_liability (N each, conditional)
- documents.signature_ack_sessions (1) -> documents.evidence_bundles (N)

### 4.3 Many-to-many relationships and bridge tables

- security.users (N) <-> security.tenants (N) via security.tenant_memberships
- Potential future document-tag/category M:N can be added via documents.document_tags bridge (not required now)

### 4.4 Cascade and referential behavior recommendations

- Tenant deletion: disallow hard delete; set is_active=0
- Case deletion: disallow hard delete in production; archive status
- Document deletion: soft delete only (is_deleted/deleted_at)
- Legal notes and audits: append-only, no hard delete
- SHC conditional tables: on case archival, keep records for compliance retention

### 4.5 Audit and document linkage

- audit.audit_logs optionally links to case_id and document_id for query performance.
- documents.evidence_bundles links to signature session and case to preserve proof chain.

---

## 5. Database Module Structure

Recommendation: multiple schemas, not dbo-only.

Proposed schemas:
- security: tenants, users, tenant_memberships, invitations
- workflow: patients, cases, discharge_refusal_cases, discharge_refusal_workflows, discharge_case_documentation
- documents: documents, document_signatures, document_otp_challenges, signature_ack_sessions, evidence_bundles
- compliance: home_care_plans, equipment_requests, transfer_requests, patient_financial_liability
- legal: legal_escalation_cases, legal_escalation_notes
- audit: audit_logs
- integration: integration_system_references
- billing: plans, subscriptions, usage_records, invoices, subscription_events

Ownership and placement rules:
- security schema owns identity and access boundaries.
- workflow schema owns case and process state.
- documents schema owns generated artifacts and signature lifecycle.
- compliance and legal separate policy-sensitive domains for ACL and retention control.
- audit remains append-only and independently governed.
- integration and billing are modular and can be deployed later without breaking core workflow.

Why not dbo-only:
- Multi-schema gives clear ownership boundaries, cleaner permissions, easier PHI/PII segregation, and lower long-term coupling.

---

## 6. Persistence Model Reconciliation Report

### 6.1 Overlapping entities

Overlaps observed in SQLAlchemy and Prisma:
- tenants
- users
- audit_logs
- case/refusal/document concepts (different normalization depth)

### 6.2 Duplicate persistence concepts

- SQLAlchemy operational model: discharge_cases + discharge_refusal_workflows + discharge_workflow_documents
- Prisma model: cases + discharge_refusal_cases + documents
- Result: same business concepts represented with parallel structures.

### 6.3 Naming conflicts and model gaps

- SQLAlchemy discharge_cases vs Prisma cases/discharge_refusal_cases split
- SQLAlchemy discharge_workflow_documents vs Prisma documents
- File-backed state has no SQLAlchemy/Prisma model:
  - signature metadata
  - otp metadata
  - acknowledgment sessions
  - evidence bundles
  - legal escalation record file

### 6.4 Source-of-truth recommendation

Short term source of truth:
- Runtime behavior and transitions in SQLAlchemy service layer.

Target source of truth for SQL schema implementation:
- Prisma-normalized entity shape as baseline, extended with additional DB tables for all file-backed artifacts.

### 6.5 Required normalization adjustments before implementation

1. Canonical case split: maintain workflow.cases + workflow.discharge_refusal_cases
2. Canonical document table: move to documents.documents and map legacy document fields
3. Replace file JSON states with relational tables in documents and legal schemas
4. Introduce consistent status enums or check constraints
5. Add compatibility views for transition from existing SQLAlchemy queries

---

## 7. Database Design Risk Register

| Risk | Severity | Why it exists | Impact on schema confidence | Mitigation |
|---|---|---|---|---|
| API-implied fields not explicitly modeled | High | Many responses are inline or loosely shaped | Optionality and cardinality may be mis-specified | Add explicit response models for key endpoints before migration freeze |
| Weak response contracts | High | Canonical readiness report shows sparse explicit 200/201 schemas | Table design must infer from service code | Freeze API contracts and add schema refs per endpoint |
| File-backed artifacts vs DB-backed artifacts | High | Signature, OTP, sessions, evidence, legal records are file-based | Transaction boundaries and recoverability gaps | Create proposed DB tables first, backfill, then cut read/write paths |
| Conditional SHC scope | Medium | SHC route appears only when flag is enabled | Partial schema deployment risk | Deploy SHC tables behind feature-gated migration path |
| Homecare import defect impact | Medium | OpenAPI generation required runtime shim due missing symbol | Trust in startup/openapi parity reduced | Fix import mismatch and add startup/openapi smoke test |
| SQLAlchemy vs Prisma divergence | High | Parallel entity definitions and naming drift | Migration mapping ambiguity and data loss risk | Publish strict mapping spec and transitional compatibility views |
| Status values are free-form strings | Medium | Multiple services write unconstrained status/action text | Inconsistent reporting and state transitions | Add constrained lookup/check constraints |
| Integration references are runtime-derived | Low | /integrations/systems currently environment-driven | Integration tables may drift from runtime flags | Store observed snapshots with source timestamp and treat as reference |

Assumptions explicitly made:
- Signature/session/evidence/legal JSON stores will be promoted to DB tables.
- Some workflow and document response payload fields are treated as derived projections, not canonical storage columns.
- Deferred IAM/Billing tables remain out of immediate implementation until API exposure is added.

---

## 8. Final Recommendation (GO / NO-GO)

Decision for design package: GO
- The API-to-entity design is complete and traceable.
- Every proposed table includes source evidence: OpenAPI paths, schema refs, backend model sources (or explicit model gap).

Decision for SQL schema implementation execution now: NO-GO

Blocking prerequisites before implementation GO:
1. Resolve homecare import defect that required OpenAPI generation shim.
2. Promote file-backed artifacts to explicit DB tables and define backfill strategy.
3. Reconcile SQLAlchemy and Prisma entity mapping with approved canonical naming.
4. Strengthen response schemas for core workflow and document endpoints.
5. Approve status/value constraint strategy (enum/check constraints).

End state once blockers are closed:
- GO for SQL Server DDL and migration planning phase.
