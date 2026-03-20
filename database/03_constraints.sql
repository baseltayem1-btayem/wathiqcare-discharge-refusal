-- WathiqCare SQL Server DDL
-- File: 03_constraints.sql
-- Purpose: Add FK constraints, unique constraints, and check constraints.

SET NOCOUNT ON;
GO

/* =========================
   UNIQUE CONSTRAINTS
   ========================= */
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_tenants_code')
    ALTER TABLE security.tenants ADD CONSTRAINT UQ_tenants_code UNIQUE (code);
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_users_email')
    ALTER TABLE security.users ADD CONSTRAINT UQ_users_email UNIQUE (email);
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_patients_tenant_mrn')
    ALTER TABLE workflow.patients ADD CONSTRAINT UQ_patients_tenant_mrn UNIQUE (tenant_id, mrn);
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_discharge_refusal_cases_case_id')
    ALTER TABLE workflow.discharge_refusal_cases ADD CONSTRAINT UQ_discharge_refusal_cases_case_id UNIQUE (case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_discharge_refusal_workflows_refusal_case')
    ALTER TABLE workflow.discharge_refusal_workflows ADD CONSTRAINT UQ_discharge_refusal_workflows_refusal_case UNIQUE (discharge_refusal_case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_discharge_case_documentation_workflow')
    ALTER TABLE workflow.discharge_case_documentation ADD CONSTRAINT UQ_discharge_case_documentation_workflow UNIQUE (workflow_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_document_signatures_document')
    ALTER TABLE documents.document_signatures ADD CONSTRAINT UQ_document_signatures_document UNIQUE (document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_document_otp_document')
    ALTER TABLE documents.document_otp_challenges ADD CONSTRAINT UQ_document_otp_document UNIQUE (document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_legal_escalation_cases_case')
    ALTER TABLE legal.legal_escalation_cases ADD CONSTRAINT UQ_legal_escalation_cases_case UNIQUE (case_id);
GO

/* =========================
   FOREIGN KEYS
   ========================= */
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_users_tenant')
    ALTER TABLE security.users ADD CONSTRAINT FK_users_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_patients_tenant')
    ALTER TABLE workflow.patients ADD CONSTRAINT FK_patients_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_cases_tenant')
    ALTER TABLE workflow.cases ADD CONSTRAINT FK_cases_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_cases_patient')
    ALTER TABLE workflow.cases ADD CONSTRAINT FK_cases_patient
        FOREIGN KEY (patient_id) REFERENCES workflow.patients(patient_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_cases_created_by')
    ALTER TABLE workflow.cases ADD CONSTRAINT FK_cases_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_cases_updated_by')
    ALTER TABLE workflow.cases ADD CONSTRAINT FK_cases_updated_by
        FOREIGN KEY (updated_by_user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_discharge_refusal_cases_tenant')
    ALTER TABLE workflow.discharge_refusal_cases ADD CONSTRAINT FK_discharge_refusal_cases_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_discharge_refusal_cases_case')
    ALTER TABLE workflow.discharge_refusal_cases ADD CONSTRAINT FK_discharge_refusal_cases_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_discharge_refusal_workflows_tenant')
    ALTER TABLE workflow.discharge_refusal_workflows ADD CONSTRAINT FK_discharge_refusal_workflows_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_discharge_refusal_workflows_refusal_case')
    ALTER TABLE workflow.discharge_refusal_workflows ADD CONSTRAINT FK_discharge_refusal_workflows_refusal_case
        FOREIGN KEY (discharge_refusal_case_id) REFERENCES workflow.discharge_refusal_cases(discharge_refusal_case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_discharge_case_documentation_tenant')
    ALTER TABLE workflow.discharge_case_documentation ADD CONSTRAINT FK_discharge_case_documentation_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_discharge_case_documentation_workflow')
    ALTER TABLE workflow.discharge_case_documentation ADD CONSTRAINT FK_discharge_case_documentation_workflow
        FOREIGN KEY (workflow_id) REFERENCES workflow.discharge_refusal_workflows(workflow_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_documents_tenant')
    ALTER TABLE documents.documents ADD CONSTRAINT FK_documents_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_documents_case')
    ALTER TABLE documents.documents ADD CONSTRAINT FK_documents_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_documents_refusal_case')
    ALTER TABLE documents.documents ADD CONSTRAINT FK_documents_refusal_case
        FOREIGN KEY (discharge_refusal_case_id) REFERENCES workflow.discharge_refusal_cases(discharge_refusal_case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_documents_workflow')
    ALTER TABLE documents.documents ADD CONSTRAINT FK_documents_workflow
        FOREIGN KEY (workflow_id) REFERENCES workflow.discharge_refusal_workflows(workflow_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_documents_generated_by')
    ALTER TABLE documents.documents ADD CONSTRAINT FK_documents_generated_by
        FOREIGN KEY (generated_by_user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_documents_signed_by')
    ALTER TABLE documents.documents ADD CONSTRAINT FK_documents_signed_by
        FOREIGN KEY (signed_by_user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_document_signatures_tenant')
    ALTER TABLE documents.document_signatures ADD CONSTRAINT FK_document_signatures_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_document_signatures_document')
    ALTER TABLE documents.document_signatures ADD CONSTRAINT FK_document_signatures_document
        FOREIGN KEY (document_id) REFERENCES documents.documents(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_document_signatures_archived_by')
    ALTER TABLE documents.document_signatures ADD CONSTRAINT FK_document_signatures_archived_by
        FOREIGN KEY (archived_by_user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_document_signatures_signed_by')
    ALTER TABLE documents.document_signatures ADD CONSTRAINT FK_document_signatures_signed_by
        FOREIGN KEY (signed_by_user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_document_otp_tenant')
    ALTER TABLE documents.document_otp_challenges ADD CONSTRAINT FK_document_otp_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_document_otp_document')
    ALTER TABLE documents.document_otp_challenges ADD CONSTRAINT FK_document_otp_document
        FOREIGN KEY (document_id) REFERENCES documents.documents(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_document_otp_sent_by')
    ALTER TABLE documents.document_otp_challenges ADD CONSTRAINT FK_document_otp_sent_by
        FOREIGN KEY (sent_by_user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_signature_ack_sessions_tenant')
    ALTER TABLE documents.signature_ack_sessions ADD CONSTRAINT FK_signature_ack_sessions_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_signature_ack_sessions_case')
    ALTER TABLE documents.signature_ack_sessions ADD CONSTRAINT FK_signature_ack_sessions_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_signature_ack_sessions_workflow_document')
    ALTER TABLE documents.signature_ack_sessions ADD CONSTRAINT FK_signature_ack_sessions_workflow_document
        FOREIGN KEY (workflow_document_id) REFERENCES documents.documents(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_signature_ack_sessions_created_by')
    ALTER TABLE documents.signature_ack_sessions ADD CONSTRAINT FK_signature_ack_sessions_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_evidence_bundles_tenant')
    ALTER TABLE documents.evidence_bundles ADD CONSTRAINT FK_evidence_bundles_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_evidence_bundles_case')
    ALTER TABLE documents.evidence_bundles ADD CONSTRAINT FK_evidence_bundles_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_evidence_bundles_session')
    ALTER TABLE documents.evidence_bundles ADD CONSTRAINT FK_evidence_bundles_session
        FOREIGN KEY (session_id) REFERENCES documents.signature_ack_sessions(session_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_legal_escalation_cases_tenant')
    ALTER TABLE legal.legal_escalation_cases ADD CONSTRAINT FK_legal_escalation_cases_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_legal_escalation_cases_case')
    ALTER TABLE legal.legal_escalation_cases ADD CONSTRAINT FK_legal_escalation_cases_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_legal_escalation_cases_refusal_case')
    ALTER TABLE legal.legal_escalation_cases ADD CONSTRAINT FK_legal_escalation_cases_refusal_case
        FOREIGN KEY (discharge_refusal_case_id) REFERENCES workflow.discharge_refusal_cases(discharge_refusal_case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_legal_escalation_notes_tenant')
    ALTER TABLE legal.legal_escalation_notes ADD CONSTRAINT FK_legal_escalation_notes_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_legal_escalation_notes_case')
    ALTER TABLE legal.legal_escalation_notes ADD CONSTRAINT FK_legal_escalation_notes_case
        FOREIGN KEY (legal_escalation_case_id) REFERENCES legal.legal_escalation_cases(legal_escalation_case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_legal_escalation_notes_author')
    ALTER TABLE legal.legal_escalation_notes ADD CONSTRAINT FK_legal_escalation_notes_author
        FOREIGN KEY (author_user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_audit_logs_tenant')
    ALTER TABLE audit.audit_logs ADD CONSTRAINT FK_audit_logs_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_audit_logs_user')
    ALTER TABLE audit.audit_logs ADD CONSTRAINT FK_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES security.users(user_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_audit_logs_case')
    ALTER TABLE audit.audit_logs ADD CONSTRAINT FK_audit_logs_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_audit_logs_document')
    ALTER TABLE audit.audit_logs ADD CONSTRAINT FK_audit_logs_document
        FOREIGN KEY (document_id) REFERENCES documents.documents(document_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_home_care_plans_tenant')
    ALTER TABLE compliance.home_care_plans ADD CONSTRAINT FK_home_care_plans_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_home_care_plans_case')
    ALTER TABLE compliance.home_care_plans ADD CONSTRAINT FK_home_care_plans_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_home_care_plans_refusal_case')
    ALTER TABLE compliance.home_care_plans ADD CONSTRAINT FK_home_care_plans_refusal_case
        FOREIGN KEY (discharge_refusal_case_id) REFERENCES workflow.discharge_refusal_cases(discharge_refusal_case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_equipment_requests_tenant')
    ALTER TABLE compliance.equipment_requests ADD CONSTRAINT FK_equipment_requests_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_equipment_requests_case')
    ALTER TABLE compliance.equipment_requests ADD CONSTRAINT FK_equipment_requests_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_equipment_requests_refusal_case')
    ALTER TABLE compliance.equipment_requests ADD CONSTRAINT FK_equipment_requests_refusal_case
        FOREIGN KEY (discharge_refusal_case_id) REFERENCES workflow.discharge_refusal_cases(discharge_refusal_case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_transfer_requests_tenant')
    ALTER TABLE compliance.transfer_requests ADD CONSTRAINT FK_transfer_requests_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_transfer_requests_case')
    ALTER TABLE compliance.transfer_requests ADD CONSTRAINT FK_transfer_requests_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_transfer_requests_refusal_case')
    ALTER TABLE compliance.transfer_requests ADD CONSTRAINT FK_transfer_requests_refusal_case
        FOREIGN KEY (discharge_refusal_case_id) REFERENCES workflow.discharge_refusal_cases(discharge_refusal_case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_patient_financial_liability_tenant')
    ALTER TABLE compliance.patient_financial_liability ADD CONSTRAINT FK_patient_financial_liability_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_patient_financial_liability_case')
    ALTER TABLE compliance.patient_financial_liability ADD CONSTRAINT FK_patient_financial_liability_case
        FOREIGN KEY (case_id) REFERENCES workflow.cases(case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_patient_financial_liability_refusal_case')
    ALTER TABLE compliance.patient_financial_liability ADD CONSTRAINT FK_patient_financial_liability_refusal_case
        FOREIGN KEY (discharge_refusal_case_id) REFERENCES workflow.discharge_refusal_cases(discharge_refusal_case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_integration_system_references_tenant')
    ALTER TABLE integration.integration_system_references ADD CONSTRAINT FK_integration_system_references_tenant
        FOREIGN KEY (tenant_id) REFERENCES security.tenants(tenant_id);
GO

/* =========================
   CHECK CONSTRAINTS
   ========================= */

-- JSON validity checks
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tenants_metadata_json')
    ALTER TABLE security.tenants ADD CONSTRAINT CK_tenants_metadata_json CHECK (metadata_json IS NULL OR ISJSON(metadata_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_cases_metadata_json')
    ALTER TABLE workflow.cases ADD CONSTRAINT CK_cases_metadata_json CHECK (metadata_json IS NULL OR ISJSON(metadata_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_documents_payload_json')
    ALTER TABLE documents.documents ADD CONSTRAINT CK_documents_payload_json CHECK (payload_json IS NULL OR ISJSON(payload_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_documents_metadata_json')
    ALTER TABLE documents.documents ADD CONSTRAINT CK_documents_metadata_json CHECK (metadata_json IS NULL OR ISJSON(metadata_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_document_signatures_payload_json')
    ALTER TABLE documents.document_signatures ADD CONSTRAINT CK_document_signatures_payload_json CHECK (signature_payload_json IS NULL OR ISJSON(signature_payload_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_signature_ack_sessions_provider_result_json')
    ALTER TABLE documents.signature_ack_sessions ADD CONSTRAINT CK_signature_ack_sessions_provider_result_json CHECK (provider_result_json IS NULL OR ISJSON(provider_result_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_signature_ack_sessions_proof_metadata_json')
    ALTER TABLE documents.signature_ack_sessions ADD CONSTRAINT CK_signature_ack_sessions_proof_metadata_json CHECK (proof_metadata_json IS NULL OR ISJSON(proof_metadata_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_signature_ack_sessions_context_json')
    ALTER TABLE documents.signature_ack_sessions ADD CONSTRAINT CK_signature_ack_sessions_context_json CHECK (context_json IS NULL OR ISJSON(context_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_evidence_bundles_evidence_json')
    ALTER TABLE documents.evidence_bundles ADD CONSTRAINT CK_evidence_bundles_evidence_json CHECK (ISJSON(evidence_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_audit_logs_metadata_json')
    ALTER TABLE audit.audit_logs ADD CONSTRAINT CK_audit_logs_metadata_json CHECK (metadata_json IS NULL OR ISJSON(metadata_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_home_care_plans_equipment_required_json')
    ALTER TABLE compliance.home_care_plans ADD CONSTRAINT CK_home_care_plans_equipment_required_json CHECK (ISJSON(equipment_required_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_integration_refs_resources_json')
    ALTER TABLE integration.integration_system_references ADD CONSTRAINT CK_integration_refs_resources_json CHECK (resources_json IS NULL OR ISJSON(resources_json) = 1);
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_integration_refs_metadata_json')
    ALTER TABLE integration.integration_system_references ADD CONSTRAINT CK_integration_refs_metadata_json CHECK (metadata_json IS NULL OR ISJSON(metadata_json) = 1);
GO

-- Domain checks

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_cases_case_type')
    ALTER TABLE workflow.cases ADD CONSTRAINT CK_cases_case_type CHECK (case_type IN ('GENERAL','DISCHARGE_REFUSAL'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_discharge_refusal_cases_discharge_status')
    ALTER TABLE workflow.discharge_refusal_cases ADD CONSTRAINT CK_discharge_refusal_cases_discharge_status CHECK (discharge_status IN ('accept_discharge','refuse_discharge'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_discharge_refusal_cases_discharge_alternative')
    ALTER TABLE workflow.discharge_refusal_cases ADD CONSTRAINT CK_discharge_refusal_cases_discharge_alternative CHECK (discharge_alternative IS NULL OR discharge_alternative IN ('home_care','transfer_hospital','financial_responsibility'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_workflows_status')
    ALTER TABLE workflow.discharge_refusal_workflows ADD CONSTRAINT CK_workflows_status CHECK (status IN ('draft','active','refusal_active','escalated','closed'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_documents_status')
    ALTER TABLE documents.documents ADD CONSTRAINT CK_documents_status CHECK (status IN ('draft','generated','signed','verified','archived','voided'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_documents_soft_delete_consistency')
    ALTER TABLE documents.documents ADD CONSTRAINT CK_documents_soft_delete_consistency CHECK ((is_deleted = 0 AND deleted_at IS NULL) OR (is_deleted = 1));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_document_signatures_method')
    ALTER TABLE documents.document_signatures ADD CONSTRAINT CK_document_signatures_method CHECK (signature_method IN ('sms_otp','nafath','tablet_signature'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_signature_ack_sessions_method')
    ALTER TABLE documents.signature_ack_sessions ADD CONSTRAINT CK_signature_ack_sessions_method CHECK (acknowledgment_method IN ('sms_otp','nafath','tablet_signature'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_signature_ack_sessions_status')
    ALTER TABLE documents.signature_ack_sessions ADD CONSTRAINT CK_signature_ack_sessions_status CHECK (verification_status IN ('pending','awaiting_signature','verified','failed','unavailable'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_legal_escalation_cases_priority')
    ALTER TABLE legal.legal_escalation_cases ADD CONSTRAINT CK_legal_escalation_cases_priority CHECK (priority IN ('low','medium','high','critical'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_legal_escalation_cases_status')
    ALTER TABLE legal.legal_escalation_cases ADD CONSTRAINT CK_legal_escalation_cases_status CHECK (status IN ('active','resolved','closed'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_equipment_requests_status')
    ALTER TABLE compliance.equipment_requests ADD CONSTRAINT CK_equipment_requests_status CHECK (status IN ('pending','approved','unavailable'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_patient_financial_liability_signature_method')
    ALTER TABLE compliance.patient_financial_liability ADD CONSTRAINT CK_patient_financial_liability_signature_method CHECK (signature_method IS NULL OR signature_method IN ('sms_otp','nafath','tablet_signature'));
GO

-- Deferred from immediate rollout:
-- security.tenant_memberships and security.invitations constraints
-- billing.* constraints
