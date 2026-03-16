-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FacilityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ESCALATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('DISCHARGE_REFUSAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CasePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "WorkflowVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "WorkflowEntityType" AS ENUM ('REFUSAL_CASE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AcknowledgmentRecipientType" AS ENUM ('PATIENT', 'REPRESENTATIVE');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('SMS', 'EMAIL', 'WHATSAPP', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "AcknowledgmentRequestStatus" AS ENUM ('PENDING', 'SENT', 'RESPONDED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "AcknowledgmentOutcome" AS ENUM ('ACCEPTED', 'REFUSED', 'PENDING', 'NO_RESPONSE', 'REPRESENTATIVE_UNAVAILABLE', 'AUTHORITY_DISPUTED', 'SIGNATURE_DECLINED', 'TECHNICAL_FAILURE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'WHATSAPP', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('PENDING', 'VERIFIED', 'EXPIRED', 'LOCKED', 'FAILED');

-- CreateEnum
CREATE TYPE "OtpAttemptResult" AS ENUM ('SUCCESS', 'FAILURE', 'EXPIRED', 'LOCKED');

-- CreateEnum
CREATE TYPE "VisibilityScope" AS ENUM ('LEGAL_ONLY', 'COMPLIANCE_ONLY', 'LEGAL_AND_COMPLIANCE');

-- CreateEnum
CREATE TYPE "DeleteBehavior" AS ENUM ('SOFT_DELETE', 'HARD_DELETE');

-- CreateEnum
CREATE TYPE "ArchiveBehavior" AS ENUM ('NONE', 'ARCHIVE', 'COLD_ARCHIVE');

-- CreateEnum
CREATE TYPE "ReportExportStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentApprovalStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentVisibilityLevel" AS ENUM ('INTERNAL', 'LEGAL', 'COMPLIANCE', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "AttachmentConfidentialityLevel" AS ENUM ('NORMAL', 'SENSITIVE', 'RESTRICTED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "default_language" TEXT NOT NULL DEFAULT 'ar',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "config_key" TEXT NOT NULL,
    "config_value_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "status" "FacilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "employee_code" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT,
    "external_auth_reference" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system_role" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "facility_id" TEXT,
    "department_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "national_id" TEXT,
    "date_of_birth" DATE,
    "gender" TEXT,
    "nationality" TEXT,
    "preferred_language" TEXT,
    "primary_phone" TEXT,
    "secondary_phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_contacts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "contact_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_representatives" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "representative_type" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "relationship_to_patient" TEXT NOT NULL,
    "id_type" TEXT,
    "id_number" TEXT,
    "authority_basis" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_representatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "encounter_number" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "department_id" TEXT,
    "admission_type" TEXT,
    "admission_date" TIMESTAMP(3),
    "discharge_expected_date" TIMESTAMP(3),
    "attending_physician_name" TEXT,
    "attending_physician_user_id" TEXT,
    "room" TEXT,
    "bed" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discharge_decisions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "refusal_case_id" TEXT,
    "decision_status" TEXT NOT NULL,
    "discharge_medically_appropriate" BOOLEAN NOT NULL,
    "decision_date" DATE NOT NULL,
    "decision_time" TEXT NOT NULL,
    "issued_by_user_id" TEXT NOT NULL,
    "clinical_remarks" TEXT,
    "reversal_indicator" BOOLEAN NOT NULL DEFAULT false,
    "reversal_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discharge_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discharge_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "refusal_case_id" TEXT,
    "destination" TEXT NOT NULL,
    "instructions_provided" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discharge_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discharge_plan_items" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "discharge_plan_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discharge_plan_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refusal_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "case_type" "CaseType" NOT NULL DEFAULT 'DISCHARGE_REFUSAL',
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CasePriority",
    "facility_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "current_owner_user_id" TEXT,
    "current_owner_department_id" TEXT,
    "initiated_by_user_id" TEXT NOT NULL,
    "closed_at" TIMESTAMP(3),
    "closure_reason" TEXT,
    "summary" TEXT,
    "workflow_version_id" TEXT,
    "current_stage_id" TEXT,
    "current_stage_code" TEXT,
    "escalated_to_legal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refusal_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refusal_reason_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refusal_reason_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refusal_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "refusal_recorded" BOOLEAN NOT NULL DEFAULT true,
    "refusal_date" DATE NOT NULL,
    "refusal_time" TEXT NOT NULL,
    "refusing_person_name" TEXT NOT NULL,
    "refusing_person_relationship" TEXT NOT NULL,
    "representative_id" TEXT,
    "reason_category_id" TEXT NOT NULL,
    "detailed_reason" TEXT,
    "consequences_explained" BOOLEAN NOT NULL DEFAULT false,
    "explanation_provided_by_user_id" TEXT,
    "immediate_escalation_required" BOOLEAN NOT NULL DEFAULT false,
    "risk_indicator" TEXT,
    "notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refusal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acknowledgment_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "recipient_type" "AcknowledgmentRecipientType" NOT NULL,
    "patient_id" TEXT,
    "representative_id" TEXT,
    "recipient_name" TEXT NOT NULL,
    "relationship_to_patient" TEXT,
    "delivery_method" "DeliveryMethod" NOT NULL,
    "status" "AcknowledgmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acknowledgment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acknowledgment_responses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "acknowledgment_request_id" TEXT NOT NULL,
    "outcome" "AcknowledgmentOutcome" NOT NULL,
    "response_date" DATE NOT NULL,
    "response_time" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "signature_captured" BOOLEAN NOT NULL DEFAULT false,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "witness_name" TEXT,
    "witness_role" TEXT,
    "notes" TEXT,
    "captured_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acknowledgment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entity_type" "WorkflowEntityType" NOT NULL DEFAULT 'REFUSAL_CASE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "WorkflowVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_stages" (
    "id" TEXT NOT NULL,
    "workflow_version_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "is_initial" BOOLEAN NOT NULL DEFAULT false,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transitions" (
    "id" TEXT NOT NULL,
    "workflow_version_id" TEXT NOT NULL,
    "from_stage_id" TEXT NOT NULL,
    "to_stage_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requires_comment" BOOLEAN NOT NULL DEFAULT false,
    "requires_document" BOOLEAN NOT NULL DEFAULT false,
    "requires_reason" BOOLEAN NOT NULL DEFAULT false,
    "auto_create_task" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_transition_roles" (
    "id" TEXT NOT NULL,
    "transition_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_transition_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_stage_history" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "from_stage_id" TEXT,
    "to_stage_id" TEXT NOT NULL,
    "transition_id" TEXT,
    "changed_by_user_id" TEXT NOT NULL,
    "comment" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "task_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to_user_id" TEXT,
    "assigned_to_role_id" TEXT,
    "assigned_to_department_id" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "completed_by_user_id" TEXT,
    "source_transition_id" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "escalation_stage" TEXT NOT NULL,
    "escalated_to_department_id" TEXT NOT NULL,
    "escalated_by_user_id" TEXT NOT NULL,
    "escalation_reason" TEXT NOT NULL,
    "escalation_outcome" TEXT,
    "notes" TEXT,
    "escalated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "template_source_path" TEXT NOT NULL,
    "approval_status" "DocumentApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "generated_by_user_id" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibility_level" "DocumentVisibilityLevel" NOT NULL DEFAULT 'INTERNAL',
    "metadata_json" JSONB,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_attachments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "confidentiality_level" "AttachmentConfidentialityLevel" NOT NULL DEFAULT 'NORMAL',
    "uploaded_by_user_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_user_id" TEXT,

    CONSTRAINT "case_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachment_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "case_attachment_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachment_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signature_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "acknowledgment_request_id" TEXT,
    "acknowledgment_response_id" TEXT,
    "signer_name" TEXT NOT NULL,
    "signer_type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "otp_request_id" TEXT,
    "signature_metadata_json" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signature_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "code" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "language" TEXT NOT NULL,
    "subject" TEXT,
    "body_template" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT,
    "task_id" TEXT,
    "recipient_user_id" TEXT,
    "recipient_phone" TEXT,
    "recipient_email" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "template_id" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "provider_reference" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT,
    "acknowledgment_request_id" TEXT,
    "recipient_phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "status" "OtpStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "otp_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_attempts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "otp_request_id" TEXT NOT NULL,
    "attempt_result" "OtpAttemptResult" NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "device_info" TEXT,

    CONSTRAINT "otp_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "direction" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "content_summary" TEXT,
    "provider_reference" TEXT,
    "status" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privileged_notes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "visibility_scope" "VisibilityScope" NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privileged_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_holds" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "refusal_case_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "released_by_user_id" TEXT,

    CONSTRAINT "legal_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL,
    "delete_behavior" "DeleteBehavior" NOT NULL,
    "archive_behavior" "ArchiveBehavior" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_email" TEXT,
    "actor_role_snapshot" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "metadata_json" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_entity_type" TEXT,
    "target_entity_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_exports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "filters_json" JSONB,
    "file_key" TEXT,
    "status" "ReportExportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics_events" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "reference_id" TEXT,
    "payload_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metrics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenant_settings_tenant_id_idx" ON "tenant_settings"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_config_key_key" ON "tenant_settings"("tenant_id", "config_key");

-- CreateIndex
CREATE INDEX "facilities_tenant_id_status_idx" ON "facilities"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_tenant_id_code_key" ON "facilities"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "departments_tenant_id_status_idx" ON "departments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "departments_facility_id_idx" ON "departments"("facility_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_facility_id_code_key" ON "departments"("tenant_id", "facility_id", "code");

-- CreateIndex
CREATE INDEX "users_tenant_id_status_idx" ON "users"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "users_employee_code_idx" ON "users"("employee_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "roles_code_idx" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_code_key" ON "roles"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "user_roles_tenant_id_user_id_idx" ON "user_roles"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_tenant_id_user_id_role_id_facility_id_department_key" ON "user_roles"("tenant_id", "user_id", "role_id", "facility_id", "department_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "patients_tenant_id_full_name_idx" ON "patients"("tenant_id", "full_name");

-- CreateIndex
CREATE INDEX "patients_tenant_id_national_id_idx" ON "patients"("tenant_id", "national_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_tenant_id_mrn_key" ON "patients"("tenant_id", "mrn");

-- CreateIndex
CREATE INDEX "patient_contacts_tenant_id_patient_id_idx" ON "patient_contacts"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "patient_representatives_tenant_id_patient_id_idx" ON "patient_representatives"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "patient_representatives_tenant_id_active_idx" ON "patient_representatives"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "encounters_tenant_id_patient_id_idx" ON "encounters"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "encounters_tenant_id_status_idx" ON "encounters"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_tenant_id_encounter_number_key" ON "encounters"("tenant_id", "encounter_number");

-- CreateIndex
CREATE INDEX "discharge_decisions_tenant_id_encounter_id_idx" ON "discharge_decisions"("tenant_id", "encounter_id");

-- CreateIndex
CREATE INDEX "discharge_decisions_tenant_id_refusal_case_id_idx" ON "discharge_decisions"("tenant_id", "refusal_case_id");

-- CreateIndex
CREATE INDEX "discharge_plans_tenant_id_encounter_id_idx" ON "discharge_plans"("tenant_id", "encounter_id");

-- CreateIndex
CREATE INDEX "discharge_plan_items_tenant_id_discharge_plan_id_idx" ON "discharge_plan_items"("tenant_id", "discharge_plan_id");

-- CreateIndex
CREATE INDEX "discharge_plan_items_tenant_id_item_type_idx" ON "discharge_plan_items"("tenant_id", "item_type");

-- CreateIndex
CREATE INDEX "refusal_cases_tenant_id_status_idx" ON "refusal_cases"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "refusal_cases_tenant_id_facility_id_idx" ON "refusal_cases"("tenant_id", "facility_id");

-- CreateIndex
CREATE INDEX "refusal_cases_tenant_id_department_id_idx" ON "refusal_cases"("tenant_id", "department_id");

-- CreateIndex
CREATE INDEX "refusal_cases_tenant_id_patient_id_idx" ON "refusal_cases"("tenant_id", "patient_id");

-- CreateIndex
CREATE INDEX "refusal_cases_tenant_id_encounter_id_idx" ON "refusal_cases"("tenant_id", "encounter_id");

-- CreateIndex
CREATE INDEX "refusal_cases_tenant_id_created_at_idx" ON "refusal_cases"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refusal_cases_tenant_id_case_number_key" ON "refusal_cases"("tenant_id", "case_number");

-- CreateIndex
CREATE INDEX "refusal_reason_categories_tenant_id_active_idx" ON "refusal_reason_categories"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "refusal_reason_categories_tenant_id_code_key" ON "refusal_reason_categories"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "refusal_events_tenant_id_refusal_case_id_idx" ON "refusal_events"("tenant_id", "refusal_case_id");

-- CreateIndex
CREATE INDEX "refusal_events_tenant_id_reason_category_id_idx" ON "refusal_events"("tenant_id", "reason_category_id");

-- CreateIndex
CREATE INDEX "acknowledgment_requests_tenant_id_refusal_case_id_idx" ON "acknowledgment_requests"("tenant_id", "refusal_case_id");

-- CreateIndex
CREATE INDEX "acknowledgment_requests_tenant_id_status_idx" ON "acknowledgment_requests"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "acknowledgment_responses_tenant_id_acknowledgment_request_i_idx" ON "acknowledgment_responses"("tenant_id", "acknowledgment_request_id");

-- CreateIndex
CREATE INDEX "acknowledgment_responses_tenant_id_outcome_idx" ON "acknowledgment_responses"("tenant_id", "outcome");

-- CreateIndex
CREATE INDEX "workflows_tenant_id_active_idx" ON "workflows"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_tenant_id_code_key" ON "workflows"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "workflow_versions_workflow_id_status_idx" ON "workflow_versions"("workflow_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_versions_workflow_id_version_number_key" ON "workflow_versions"("workflow_id", "version_number");

-- CreateIndex
CREATE INDEX "workflow_stages_workflow_version_id_sequence_idx" ON "workflow_stages"("workflow_version_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stages_workflow_version_id_code_key" ON "workflow_stages"("workflow_version_id", "code");

-- CreateIndex
CREATE INDEX "workflow_transitions_workflow_version_id_from_stage_id_idx" ON "workflow_transitions"("workflow_version_id", "from_stage_id");

-- CreateIndex
CREATE INDEX "workflow_transitions_to_stage_id_idx" ON "workflow_transitions"("to_stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_transitions_workflow_version_id_code_key" ON "workflow_transitions"("workflow_version_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_transition_roles_transition_id_role_id_key" ON "workflow_transition_roles"("transition_id", "role_id");

-- CreateIndex
CREATE INDEX "case_stage_history_tenant_id_refusal_case_id_changed_at_idx" ON "case_stage_history"("tenant_id", "refusal_case_id", "changed_at");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_refusal_case_id_idx" ON "tasks"("tenant_id", "refusal_case_id");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_status_due_at_idx" ON "tasks"("tenant_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_assigned_to_user_id_idx" ON "tasks"("tenant_id", "assigned_to_user_id");

-- CreateIndex
CREATE INDEX "tasks_tenant_id_assigned_to_department_id_idx" ON "tasks"("tenant_id", "assigned_to_department_id");

-- CreateIndex
CREATE INDEX "task_comments_tenant_id_task_id_idx" ON "task_comments"("tenant_id", "task_id");

-- CreateIndex
CREATE INDEX "escalation_events_tenant_id_refusal_case_id_escalated_at_idx" ON "escalation_events"("tenant_id", "refusal_case_id", "escalated_at");

-- CreateIndex
CREATE INDEX "document_templates_tenant_id_active_idx" ON "document_templates"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_tenant_id_code_version_key" ON "document_templates"("tenant_id", "code", "version");

-- CreateIndex
CREATE INDEX "generated_documents_tenant_id_refusal_case_id_idx" ON "generated_documents"("tenant_id", "refusal_case_id");

-- CreateIndex
CREATE INDEX "generated_documents_tenant_id_generated_at_idx" ON "generated_documents"("tenant_id", "generated_at");

-- CreateIndex
CREATE INDEX "case_attachments_tenant_id_refusal_case_id_idx" ON "case_attachments"("tenant_id", "refusal_case_id");

-- CreateIndex
CREATE INDEX "case_attachments_tenant_id_uploaded_at_idx" ON "case_attachments"("tenant_id", "uploaded_at");

-- CreateIndex
CREATE INDEX "attachment_versions_tenant_id_case_attachment_id_idx" ON "attachment_versions"("tenant_id", "case_attachment_id");

-- CreateIndex
CREATE UNIQUE INDEX "attachment_versions_case_attachment_id_version_number_key" ON "attachment_versions"("case_attachment_id", "version_number");

-- CreateIndex
CREATE INDEX "signature_events_tenant_id_refusal_case_id_occurred_at_idx" ON "signature_events"("tenant_id", "refusal_case_id", "occurred_at");

-- CreateIndex
CREATE INDEX "notification_templates_tenant_id_active_idx" ON "notification_templates"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_tenant_id_code_channel_language_key" ON "notification_templates"("tenant_id", "code", "channel", "language");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_status_created_at_idx" ON "notifications"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_tenant_id_refusal_case_id_idx" ON "notifications"("tenant_id", "refusal_case_id");

-- CreateIndex
CREATE INDEX "otp_requests_tenant_id_recipient_phone_status_idx" ON "otp_requests"("tenant_id", "recipient_phone", "status");

-- CreateIndex
CREATE INDEX "otp_requests_tenant_id_acknowledgment_request_id_idx" ON "otp_requests"("tenant_id", "acknowledgment_request_id");

-- CreateIndex
CREATE INDEX "otp_attempts_tenant_id_otp_request_id_attempted_at_idx" ON "otp_attempts"("tenant_id", "otp_request_id", "attempted_at");

-- CreateIndex
CREATE INDEX "communication_logs_tenant_id_logged_at_idx" ON "communication_logs"("tenant_id", "logged_at");

-- CreateIndex
CREATE INDEX "communication_logs_tenant_id_refusal_case_id_idx" ON "communication_logs"("tenant_id", "refusal_case_id");

-- CreateIndex
CREATE INDEX "privileged_notes_tenant_id_refusal_case_id_created_at_idx" ON "privileged_notes"("tenant_id", "refusal_case_id", "created_at");

-- CreateIndex
CREATE INDEX "legal_holds_tenant_id_refusal_case_id_active_idx" ON "legal_holds"("tenant_id", "refusal_case_id", "active");

-- CreateIndex
CREATE INDEX "retention_policies_tenant_id_active_idx" ON "retention_policies"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "retention_policies_tenant_id_entity_type_key" ON "retention_policies"("tenant_id", "entity_type");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_occurred_at_idx" ON "audit_logs"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_action_idx" ON "audit_logs"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "access_logs_tenant_id_user_id_occurred_at_idx" ON "access_logs"("tenant_id", "user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "report_exports_tenant_id_status_created_at_idx" ON "report_exports"("tenant_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "metrics_events_tenant_id_event_date_idx" ON "metrics_events"("tenant_id", "event_date");

-- CreateIndex
CREATE INDEX "metrics_events_tenant_id_event_type_idx" ON "metrics_events"("tenant_id", "event_type");

