-- WathiqCare SQL Server DDL
-- File: 04_indexes.sql
-- Purpose: Performance indexes for workflow lookups, document retrieval, case search, and tenant scoping.

SET NOCOUNT ON;
GO

/* =========================
   SECURITY INDEXES
   ========================= */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_tenant_role' AND object_id = OBJECT_ID('security.users'))
    CREATE INDEX IX_users_tenant_role ON security.users (tenant_id, role);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_tenant_active' AND object_id = OBJECT_ID('security.users'))
    CREATE INDEX IX_users_tenant_active ON security.users (tenant_id, is_active);
GO

/* =========================
   WORKFLOW / CASE SEARCH INDEXES
   ========================= */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_patients_tenant_name' AND object_id = OBJECT_ID('workflow.patients'))
    CREATE INDEX IX_patients_tenant_name ON workflow.patients (tenant_id, full_name);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_cases_tenant_status' AND object_id = OBJECT_ID('workflow.cases'))
    CREATE INDEX IX_cases_tenant_status ON workflow.cases (tenant_id, status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_cases_tenant_workflow_type' AND object_id = OBJECT_ID('workflow.cases'))
    CREATE INDEX IX_cases_tenant_workflow_type ON workflow.cases (tenant_id, workflow_type);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_cases_tenant_patient_name' AND object_id = OBJECT_ID('workflow.cases'))
    CREATE INDEX IX_cases_tenant_patient_name ON workflow.cases (tenant_id, patient_name);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UIX_cases_tenant_case_number_notnull' AND object_id = OBJECT_ID('workflow.cases'))
    CREATE UNIQUE INDEX UIX_cases_tenant_case_number_notnull ON workflow.cases (tenant_id, case_number)
    WHERE case_number IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_discharge_refusal_cases_tenant_status' AND object_id = OBJECT_ID('workflow.discharge_refusal_cases'))
    CREATE INDEX IX_discharge_refusal_cases_tenant_status ON workflow.discharge_refusal_cases (tenant_id, discharge_status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_workflows_tenant_status_stage' AND object_id = OBJECT_ID('workflow.discharge_refusal_workflows'))
    CREATE INDEX IX_workflows_tenant_status_stage ON workflow.discharge_refusal_workflows (tenant_id, status, current_stage);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_workflows_escalation_due' AND object_id = OBJECT_ID('workflow.discharge_refusal_workflows'))
    CREATE INDEX IX_workflows_escalation_due ON workflow.discharge_refusal_workflows (escalation_due_at) WHERE escalation_due_at IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_workflows_closed_at' AND object_id = OBJECT_ID('workflow.discharge_refusal_workflows'))
    CREATE INDEX IX_workflows_closed_at ON workflow.discharge_refusal_workflows (closed_at) WHERE closed_at IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_discharge_case_doc_validation' AND object_id = OBJECT_ID('workflow.discharge_case_documentation'))
    CREATE INDEX IX_discharge_case_doc_validation ON workflow.discharge_case_documentation (last_validation_status, last_validated_at);
GO

/* =========================
   DOCUMENT RETRIEVAL INDEXES
   ========================= */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_documents_tenant_type_status' AND object_id = OBJECT_ID('documents.documents'))
    CREATE INDEX IX_documents_tenant_type_status ON documents.documents (tenant_id, document_type, status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_documents_case_generated_at' AND object_id = OBJECT_ID('documents.documents'))
    CREATE INDEX IX_documents_case_generated_at ON documents.documents (case_id, generated_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_documents_refusal_case_generated_at' AND object_id = OBJECT_ID('documents.documents'))
    CREATE INDEX IX_documents_refusal_case_generated_at ON documents.documents (discharge_refusal_case_id, generated_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_documents_workflow_generated_at' AND object_id = OBJECT_ID('documents.documents'))
    CREATE INDEX IX_documents_workflow_generated_at ON documents.documents (workflow_id, generated_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_documents_code' AND object_id = OBJECT_ID('documents.documents'))
    CREATE INDEX IX_documents_code ON documents.documents (document_code) WHERE document_code IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_documents_not_deleted' AND object_id = OBJECT_ID('documents.documents'))
    CREATE INDEX IX_documents_not_deleted ON documents.documents (tenant_id, case_id, status)
    WHERE is_deleted = 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_document_signatures_method' AND object_id = OBJECT_ID('documents.document_signatures'))
    CREATE INDEX IX_document_signatures_method ON documents.document_signatures (signature_method);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_document_signatures_signed_at' AND object_id = OBJECT_ID('documents.document_signatures'))
    CREATE INDEX IX_document_signatures_signed_at ON documents.document_signatures (signed_at) WHERE signed_at IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_document_otp_challenge' AND object_id = OBJECT_ID('documents.document_otp_challenges'))
    CREATE INDEX IX_document_otp_challenge ON documents.document_otp_challenges (challenge_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_document_otp_verified' AND object_id = OBJECT_ID('documents.document_otp_challenges'))
    CREATE INDEX IX_document_otp_verified ON documents.document_otp_challenges (verified, verified_at);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_signature_ack_sessions_case_status' AND object_id = OBJECT_ID('documents.signature_ack_sessions'))
    CREATE INDEX IX_signature_ack_sessions_case_status ON documents.signature_ack_sessions (case_id, verification_status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_signature_ack_sessions_verified_at' AND object_id = OBJECT_ID('documents.signature_ack_sessions'))
    CREATE INDEX IX_signature_ack_sessions_verified_at ON documents.signature_ack_sessions (verified_at) WHERE verified_at IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_evidence_bundles_case_created' AND object_id = OBJECT_ID('documents.evidence_bundles'))
    CREATE INDEX IX_evidence_bundles_case_created ON documents.evidence_bundles (case_id, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_evidence_bundles_checksum' AND object_id = OBJECT_ID('documents.evidence_bundles'))
    CREATE INDEX IX_evidence_bundles_checksum ON documents.evidence_bundles (checksum_hash);
GO

/* =========================
   LEGAL / AUDIT INDEXES
   ========================= */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_legal_escalation_cases_status_priority' AND object_id = OBJECT_ID('legal.legal_escalation_cases'))
    CREATE INDEX IX_legal_escalation_cases_status_priority ON legal.legal_escalation_cases (status, priority);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_legal_escalation_cases_follow_up' AND object_id = OBJECT_ID('legal.legal_escalation_cases'))
    CREATE INDEX IX_legal_escalation_cases_follow_up ON legal.legal_escalation_cases (follow_up_date) WHERE follow_up_date IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_legal_escalation_notes_case_created' AND object_id = OBJECT_ID('legal.legal_escalation_notes'))
    CREATE INDEX IX_legal_escalation_notes_case_created ON legal.legal_escalation_notes (legal_escalation_case_id, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_legal_escalation_notes_type' AND object_id = OBJECT_ID('legal.legal_escalation_notes'))
    CREATE INDEX IX_legal_escalation_notes_type ON legal.legal_escalation_notes (note_type);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_logs_tenant_created' AND object_id = OBJECT_ID('audit.audit_logs'))
    CREATE INDEX IX_audit_logs_tenant_created ON audit.audit_logs (tenant_id, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_logs_entity' AND object_id = OBJECT_ID('audit.audit_logs'))
    CREATE INDEX IX_audit_logs_entity ON audit.audit_logs (entity_type, entity_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_logs_case_created' AND object_id = OBJECT_ID('audit.audit_logs'))
    CREATE INDEX IX_audit_logs_case_created ON audit.audit_logs (case_id, created_at DESC) WHERE case_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_logs_document_created' AND object_id = OBJECT_ID('audit.audit_logs'))
    CREATE INDEX IX_audit_logs_document_created ON audit.audit_logs (document_id, created_at DESC) WHERE document_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_audit_logs_action_created' AND object_id = OBJECT_ID('audit.audit_logs'))
    CREATE INDEX IX_audit_logs_action_created ON audit.audit_logs (action, created_at DESC);
GO

/* =========================
   COMPLIANCE (SHC) INDEXES
   ========================= */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_home_care_plans_tenant_case' AND object_id = OBJECT_ID('compliance.home_care_plans'))
    CREATE INDEX IX_home_care_plans_tenant_case ON compliance.home_care_plans (tenant_id, case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_equipment_requests_tenant_case' AND object_id = OBJECT_ID('compliance.equipment_requests'))
    CREATE INDEX IX_equipment_requests_tenant_case ON compliance.equipment_requests (tenant_id, case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_equipment_requests_status' AND object_id = OBJECT_ID('compliance.equipment_requests'))
    CREATE INDEX IX_equipment_requests_status ON compliance.equipment_requests (status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_transfer_requests_tenant_case' AND object_id = OBJECT_ID('compliance.transfer_requests'))
    CREATE INDEX IX_transfer_requests_tenant_case ON compliance.transfer_requests (tenant_id, case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_patient_financial_liability_tenant_case' AND object_id = OBJECT_ID('compliance.patient_financial_liability'))
    CREATE INDEX IX_patient_financial_liability_tenant_case ON compliance.patient_financial_liability (tenant_id, case_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_patient_financial_liability_accepted' AND object_id = OBJECT_ID('compliance.patient_financial_liability'))
    CREATE INDEX IX_patient_financial_liability_accepted ON compliance.patient_financial_liability (accepted);
GO

/* =========================
    INTEGRATION INDEXES
    ========================= */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_integration_system_references_enabled' AND object_id = OBJECT_ID('integration.integration_system_references'))
    CREATE INDEX IX_integration_system_references_enabled ON integration.integration_system_references (enabled);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UIX_integration_refs_system_tenant_notnull' AND object_id = OBJECT_ID('integration.integration_system_references'))
    CREATE UNIQUE INDEX UIX_integration_refs_system_tenant_notnull ON integration.integration_system_references (system_code, tenant_id)
    WHERE tenant_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UIX_integration_refs_system_global' AND object_id = OBJECT_ID('integration.integration_system_references'))
    CREATE UNIQUE INDEX UIX_integration_refs_system_global ON integration.integration_system_references (system_code)
    WHERE tenant_id IS NULL;
GO

-- Deferred from immediate rollout:
-- security.tenant_memberships and security.invitations indexes
-- billing.* indexes
