-- WathiqCare SQL Server DDL
-- File: 02_create_tables.sql
-- Purpose: Create tables for approved modules/entities.
-- Notes:
--   1) PKs and core column defaults are created here.
--   2) FKs, unique constraints, and check constraints are added in 03_constraints.sql.
--   3) Indexes are added in 04_indexes.sql.

SET NOCOUNT ON;
GO

/* =========================
   SECURITY
   ========================= */
IF OBJECT_ID('security.tenants', 'U') IS NULL
BEGIN
    CREATE TABLE security.tenants (
        tenant_id uniqueidentifier NOT NULL CONSTRAINT PK_tenants PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        code nvarchar(64) NOT NULL,
        name nvarchar(255) NOT NULL,
        domain nvarchar(255) NULL,
        is_active bit NOT NULL CONSTRAINT DF_tenants_is_active DEFAULT (1),
        timezone nvarchar(64) NULL,
        country nvarchar(64) NULL,
        billing_email nvarchar(255) NULL,
        metadata_json nvarchar(max) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_tenants_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_tenants_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('security.users', 'U') IS NULL
BEGIN
    CREATE TABLE security.users (
        user_id uniqueidentifier NOT NULL CONSTRAINT PK_users PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        email nvarchar(255) NOT NULL,
        full_name nvarchar(255) NOT NULL,
        role nvarchar(64) NOT NULL,
        is_active bit NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1),
        hashed_password nvarchar(512) NULL,
        last_login_at datetime2(3) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

-- Deferred tables (not part of immediate rollout):
-- security.tenant_memberships
-- security.invitations

/* =========================
   WORKFLOW
   ========================= */
IF OBJECT_ID('workflow.patients', 'U') IS NULL
BEGIN
    CREATE TABLE workflow.patients (
        patient_id uniqueidentifier NOT NULL CONSTRAINT PK_patients PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        mrn nvarchar(64) NOT NULL,
        full_name nvarchar(255) NOT NULL,
        date_of_birth date NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_patients_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_patients_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('workflow.cases', 'U') IS NULL
BEGIN
    CREATE TABLE workflow.cases (
        case_id uniqueidentifier NOT NULL CONSTRAINT PK_cases PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        patient_id uniqueidentifier NULL,
        case_number nvarchar(64) NULL,
        case_type nvarchar(64) NOT NULL CONSTRAINT DF_cases_case_type DEFAULT ('GENERAL'),
        status nvarchar(64) NOT NULL,
        workflow_type nvarchar(64) NULL,
        title nvarchar(255) NULL,
        patient_name nvarchar(255) NULL,
        patient_id_number nvarchar(64) NULL,
        medical_record_no nvarchar(64) NULL,
        room_number nvarchar(64) NULL,
        metadata_json nvarchar(max) NULL,
        version int NOT NULL CONSTRAINT DF_cases_version DEFAULT (1),
        created_by_user_id uniqueidentifier NULL,
        updated_by_user_id uniqueidentifier NULL,
        closed_at datetime2(3) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_cases_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_cases_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('workflow.discharge_refusal_cases', 'U') IS NULL
BEGIN
    CREATE TABLE workflow.discharge_refusal_cases (
        discharge_refusal_case_id uniqueidentifier NOT NULL CONSTRAINT PK_discharge_refusal_cases PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        case_id uniqueidentifier NOT NULL,
        discharge_status nvarchar(64) NOT NULL,
        discharge_alternative nvarchar(64) NULL,
        rights_acknowledgment_doc_path nvarchar(1024) NULL,
        refusal_form_doc_path nvarchar(1024) NULL,
        signature_method nvarchar(64) NULL,
        signature_timestamp datetime2(3) NULL,
        signature_device nvarchar(128) NULL,
        signature_ip_address nvarchar(64) NULL,
        signature_hash nvarchar(256) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_discharge_refusal_cases_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_discharge_refusal_cases_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('workflow.discharge_refusal_workflows', 'U') IS NULL
BEGIN
    CREATE TABLE workflow.discharge_refusal_workflows (
        workflow_id uniqueidentifier NOT NULL CONSTRAINT PK_discharge_refusal_workflows PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        discharge_refusal_case_id uniqueidentifier NOT NULL,
        status nvarchar(64) NOT NULL,
        case_status nvarchar(128) NOT NULL,
        current_stage nvarchar(128) NOT NULL,
        discharge_decision_at datetime2(3) NULL,
        refusal_started_at datetime2(3) NULL,
        initial_communication_at datetime2(3) NULL,
        support_and_intervention_at datetime2(3) NULL,
        social_services_referred_at datetime2(3) NULL,
        refusal_form_generated_at datetime2(3) NULL,
        financial_notice_generated_at datetime2(3) NULL,
        escalation_due_at datetime2(3) NULL,
        escalated_at datetime2(3) NULL,
        closed_at datetime2(3) NULL,
        patient_name nvarchar(255) NULL,
        patient_id_number nvarchar(64) NULL,
        medical_record_number nvarchar(64) NULL,
        room_number nvarchar(64) NULL,
        attending_physician nvarchar(255) NULL,
        refusal_reason nvarchar(max) NULL,
        discussion_summary nvarchar(max) NULL,
        insurance_coverage_status nvarchar(64) NULL,
        responsible_department nvarchar(128) NULL,
        responsible_person nvarchar(255) NULL,
        next_action nvarchar(max) NULL,
        nursing_notes nvarchar(max) NULL,
        patient_affairs_notes nvarchar(max) NULL,
        social_services_notes nvarchar(max) NULL,
        quality_notes nvarchar(max) NULL,
        compliance_notes nvarchar(max) NULL,
        legal_notes nvarchar(max) NULL,
        financial_notice_issued bit NOT NULL CONSTRAINT DF_workflow_financial_notice_issued DEFAULT (0),
        financial_notice_acknowledged bit NOT NULL CONSTRAINT DF_workflow_financial_notice_ack DEFAULT (0),
        refusal_form_signed bit NOT NULL CONSTRAINT DF_workflow_refusal_form_signed DEFAULT (0),
        patient_signature nvarchar(max) NULL,
        representative_signature nvarchar(max) NULL,
        witness_mode bit NOT NULL CONSTRAINT DF_workflow_witness_mode DEFAULT (0),
        witness1_name nvarchar(255) NULL,
        witness1_role nvarchar(128) NULL,
        witness1_signature nvarchar(max) NULL,
        witness2_name nvarchar(255) NULL,
        witness2_role nvarchar(128) NULL,
        witness2_signature nvarchar(max) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_workflow_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_workflow_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('workflow.discharge_case_documentation', 'U') IS NULL
BEGIN
    CREATE TABLE workflow.discharge_case_documentation (
        case_documentation_id uniqueidentifier NOT NULL CONSTRAINT PK_discharge_case_documentation PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        workflow_id uniqueidentifier NOT NULL,
        decision_recorded_at datetime2(3) NULL,
        discussion_summary nvarchar(max) NULL,
        refusal_reasons nvarchar(max) NULL,
        forms_issued nvarchar(max) NULL,
        social_administrative_interventions nvarchar(max) NULL,
        last_validated_at datetime2(3) NULL,
        last_validation_status nvarchar(64) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_case_doc_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_case_doc_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

/* =========================
   DOCUMENTS
   ========================= */
IF OBJECT_ID('documents.documents', 'U') IS NULL
BEGIN
    CREATE TABLE documents.documents (
        document_id uniqueidentifier NOT NULL CONSTRAINT PK_documents PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        case_id uniqueidentifier NULL,
        discharge_refusal_case_id uniqueidentifier NULL,
        workflow_id uniqueidentifier NULL,
        document_type nvarchar(64) NOT NULL,
        status nvarchar(64) NOT NULL,
        document_code nvarchar(64) NULL,
        title_en nvarchar(255) NOT NULL,
        title_ar nvarchar(255) NULL,
        template_key nvarchar(128) NOT NULL,
        template_version nvarchar(32) NOT NULL,
        file_name nvarchar(512) NOT NULL,
        mime_type nvarchar(128) NOT NULL,
        storage_path nvarchar(1024) NULL,
        preview_html nvarchar(max) NULL,
        payload_json nvarchar(max) NULL,
        size_bytes bigint NOT NULL CONSTRAINT DF_documents_size_bytes DEFAULT (0),
        generated_by_user_id uniqueidentifier NULL,
        generated_at datetime2(3) NOT NULL CONSTRAINT DF_documents_generated_at DEFAULT SYSUTCDATETIME(),
        signed_by_user_id uniqueidentifier NULL,
        signed_at datetime2(3) NULL,
        metadata_json nvarchar(max) NULL,
        is_deleted bit NOT NULL CONSTRAINT DF_documents_is_deleted DEFAULT (0),
        deleted_at datetime2(3) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_documents_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_documents_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('documents.document_signatures', 'U') IS NULL
BEGIN
    CREATE TABLE documents.document_signatures (
        document_signature_id uniqueidentifier NOT NULL CONSTRAINT PK_document_signatures PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        document_id uniqueidentifier NOT NULL,
        signature_method nvarchar(64) NOT NULL,
        signer_name nvarchar(255) NULL,
        signer_role nvarchar(128) NULL,
        signature_hash nvarchar(256) NULL,
        signature_payload_json nvarchar(max) NULL,
        otp_verified bit NOT NULL CONSTRAINT DF_document_signatures_otp_verified DEFAULT (0),
        otp_verified_at datetime2(3) NULL,
        archived_status bit NOT NULL CONSTRAINT DF_document_signatures_archived_status DEFAULT (0),
        archived_at datetime2(3) NULL,
        archived_by_user_id uniqueidentifier NULL,
        signed_by_user_id uniqueidentifier NULL,
        signed_at datetime2(3) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_document_signatures_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_document_signatures_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('documents.document_otp_challenges', 'U') IS NULL
BEGIN
    CREATE TABLE documents.document_otp_challenges (
        otp_challenge_id uniqueidentifier NOT NULL CONSTRAINT PK_document_otp_challenges PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        document_id uniqueidentifier NOT NULL,
        challenge_id nvarchar(128) NOT NULL,
        provider nvarchar(64) NOT NULL,
        delivery_status nvarchar(64) NOT NULL,
        masked_phone nvarchar(64) NULL,
        otp_code_hash nvarchar(256) NULL,
        sent_by_user_id uniqueidentifier NULL,
        sent_at datetime2(3) NOT NULL CONSTRAINT DF_document_otp_sent_at DEFAULT SYSUTCDATETIME(),
        verified bit NOT NULL CONSTRAINT DF_document_otp_verified DEFAULT (0),
        verified_at datetime2(3) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_document_otp_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_document_otp_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('documents.signature_ack_sessions', 'U') IS NULL
BEGIN
    CREATE TABLE documents.signature_ack_sessions (
        session_id uniqueidentifier NOT NULL CONSTRAINT PK_signature_ack_sessions PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        case_id uniqueidentifier NOT NULL,
        document_type nvarchar(64) NOT NULL,
        template_version nvarchar(64) NULL,
        document_hash nvarchar(256) NULL,
        acknowledgment_method nvarchar(64) NOT NULL,
        verification_status nvarchar(64) NOT NULL,
        patient_name nvarchar(255) NULL,
        patient_id_number nvarchar(64) NULL,
        medical_record_number nvarchar(64) NULL,
        provider_result_json nvarchar(max) NULL,
        proof_metadata_json nvarchar(max) NULL,
        rendered_html nvarchar(max) NULL,
        context_json nvarchar(max) NULL,
        workflow_document_id uniqueidentifier NULL,
        verified_at datetime2(3) NULL,
        created_by_user_id uniqueidentifier NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_signature_ack_sessions_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_signature_ack_sessions_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('documents.evidence_bundles', 'U') IS NULL
BEGIN
    CREATE TABLE documents.evidence_bundles (
        evidence_bundle_id uniqueidentifier NOT NULL CONSTRAINT PK_evidence_bundles PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        case_id uniqueidentifier NOT NULL,
        session_id uniqueidentifier NULL,
        checksum_hash nvarchar(256) NOT NULL,
        evidence_json nvarchar(max) NOT NULL,
        stored_path nvarchar(1024) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_evidence_bundles_created_at DEFAULT SYSUTCDATETIME()
    );
END
GO

/* =========================
   LEGAL
   ========================= */
IF OBJECT_ID('legal.legal_escalation_cases', 'U') IS NULL
BEGIN
    CREATE TABLE legal.legal_escalation_cases (
        legal_escalation_case_id uniqueidentifier NOT NULL CONSTRAINT PK_legal_escalation_cases PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        case_id uniqueidentifier NOT NULL,
        discharge_refusal_case_id uniqueidentifier NULL,
        status nvarchar(64) NOT NULL,
        priority nvarchar(32) NOT NULL,
        risk_level nvarchar(32) NULL,
        assigned_counsel nvarchar(255) NULL,
        follow_up_date datetime2(3) NULL,
        reason nvarchar(max) NULL,
        escalated_at datetime2(3) NULL,
        resolved_at datetime2(3) NULL,
        resolution_notes nvarchar(max) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_legal_cases_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_legal_cases_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('legal.legal_escalation_notes', 'U') IS NULL
BEGIN
    CREATE TABLE legal.legal_escalation_notes (
        legal_escalation_note_id uniqueidentifier NOT NULL CONSTRAINT PK_legal_escalation_notes PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        legal_escalation_case_id uniqueidentifier NOT NULL,
        note_type nvarchar(64) NOT NULL,
        note_text nvarchar(max) NOT NULL,
        author_user_id uniqueidentifier NULL,
        author_role nvarchar(64) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_legal_notes_created_at DEFAULT SYSUTCDATETIME()
    );
END
GO

/* =========================
   AUDIT
   ========================= */
IF OBJECT_ID('audit.audit_logs', 'U') IS NULL
BEGIN
    CREATE TABLE audit.audit_logs (
        audit_log_id uniqueidentifier NOT NULL CONSTRAINT PK_audit_logs PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        user_id uniqueidentifier NOT NULL,
        entity_type nvarchar(64) NOT NULL,
        entity_id nvarchar(64) NOT NULL,
        action nvarchar(128) NOT NULL,
        details nvarchar(max) NULL,
        case_id uniqueidentifier NULL,
        document_id uniqueidentifier NULL,
        ip_address nvarchar(64) NULL,
        user_agent nvarchar(512) NULL,
        metadata_json nvarchar(max) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_audit_logs_created_at DEFAULT SYSUTCDATETIME()
    );
END
GO

/* =========================
   COMPLIANCE (SHC CONDITIONAL DOMAIN)
   ========================= */
IF OBJECT_ID('compliance.home_care_plans', 'U') IS NULL
BEGIN
    CREATE TABLE compliance.home_care_plans (
        home_care_plan_id uniqueidentifier NOT NULL CONSTRAINT PK_home_care_plans PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        case_id uniqueidentifier NOT NULL,
        discharge_refusal_case_id uniqueidentifier NOT NULL,
        care_type nvarchar(64) NOT NULL,
        equipment_required_json nvarchar(max) NOT NULL,
        care_provider nvarchar(64) NOT NULL,
        agreement_doc_path nvarchar(1024) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_home_care_plans_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_home_care_plans_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('compliance.equipment_requests', 'U') IS NULL
BEGIN
    CREATE TABLE compliance.equipment_requests (
        equipment_request_id uniqueidentifier NOT NULL CONSTRAINT PK_equipment_requests PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        case_id uniqueidentifier NOT NULL,
        discharge_refusal_case_id uniqueidentifier NOT NULL,
        requested_equipment nvarchar(255) NOT NULL,
        department nvarchar(128) NOT NULL,
        status nvarchar(32) NOT NULL,
        request_doc_path nvarchar(1024) NULL,
        temporary_approval_doc_path nvarchar(1024) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_equipment_requests_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_equipment_requests_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('compliance.transfer_requests', 'U') IS NULL
BEGIN
    CREATE TABLE compliance.transfer_requests (
        transfer_request_id uniqueidentifier NOT NULL CONSTRAINT PK_transfer_requests PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        case_id uniqueidentifier NOT NULL,
        discharge_refusal_case_id uniqueidentifier NOT NULL,
        receiving_hospital nvarchar(255) NOT NULL,
        transfer_reason nvarchar(max) NOT NULL,
        medical_stability_confirmation bit NOT NULL,
        authorization_doc_path nvarchar(1024) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_transfer_requests_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_transfer_requests_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('compliance.patient_financial_liability', 'U') IS NULL
BEGIN
    CREATE TABLE compliance.patient_financial_liability (
        patient_financial_liability_id uniqueidentifier NOT NULL CONSTRAINT PK_patient_financial_liability PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NOT NULL,
        case_id uniqueidentifier NOT NULL,
        discharge_refusal_case_id uniqueidentifier NOT NULL,
        notice_doc_path nvarchar(1024) NULL,
        accepted bit NOT NULL CONSTRAINT DF_patient_financial_liability_accepted DEFAULT (0),
        signed_at datetime2(3) NULL,
        signature_method nvarchar(64) NULL,
        signature_hash nvarchar(256) NULL,
        created_at datetime2(3) NOT NULL CONSTRAINT DF_patient_financial_liability_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_patient_financial_liability_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

/* =========================
   INTEGRATION
   ========================= */
IF OBJECT_ID('integration.integration_system_references', 'U') IS NULL
BEGIN
    CREATE TABLE integration.integration_system_references (
        integration_system_reference_id uniqueidentifier NOT NULL CONSTRAINT PK_integration_system_references PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        tenant_id uniqueidentifier NULL,
        system_code nvarchar(64) NOT NULL,
        enabled bit NOT NULL,
        endpoint_pattern nvarchar(512) NULL,
        resources_json nvarchar(max) NULL,
        metadata_json nvarchar(max) NULL,
        observed_at datetime2(3) NOT NULL CONSTRAINT DF_integration_refs_observed_at DEFAULT SYSUTCDATETIME(),
        created_at datetime2(3) NOT NULL CONSTRAINT DF_integration_refs_created_at DEFAULT SYSUTCDATETIME(),
        updated_at datetime2(3) NOT NULL CONSTRAINT DF_integration_refs_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

-- Deferred tables (not part of immediate rollout):
-- billing.plans
-- billing.subscriptions
-- billing.usage_records
-- billing.invoices
-- billing.subscription_events
