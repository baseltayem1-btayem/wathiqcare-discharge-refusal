-- Create clinical_consent_forms table required by the ConsentForm Prisma model.
-- This table is referenced by existing migrations 0028, 0029, and 0032,
-- but was never created by a numbered SQL migration.

-- Guarded enum creation: safe to re-run if types already exist.
DO $$
BEGIN
    CREATE TYPE "ClinicalKnowledgeConsentFormType" AS ENUM (
        'PROCEDURE_CONSENT',
        'ANESTHESIA_CONSENT',
        'BLOOD_TRANSFUSION_CONSENT',
        'HIGH_RISK_PROCEDURE_CONSENT',
        'DIAGNOSTIC_IMAGING_CONSENT',
        'RESEARCH_CLINICAL_TRIAL_CONSENT',
        'TELEMEDICINE_CONSENT',
        'VACCINATION_CONSENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE "ClinicalKnowledgeRiskLevel" AS ENUM (
        'STANDARD',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
    CREATE TYPE "ClinicalKnowledgeStatus" AS ENUM (
        'DRAFT',
        'UNDER_REVIEW',
        'MEDICALLY_APPROVED',
        'LEGALLY_APPROVED',
        'PUBLISHED',
        'SUPERSEDED',
        'ARCHIVED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "clinical_consent_forms" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "form_type" "ClinicalKnowledgeConsentFormType" NOT NULL,
    "risk_level" "ClinicalKnowledgeRiskLevel" NOT NULL DEFAULT 'STANDARD',
    "status" "ClinicalKnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "version" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "governance_snapshot" JSONB,
    "pdf_template_url" TEXT,
    "metadata" JSONB,
    "requires_witness" BOOLEAN NOT NULL DEFAULT false,
    "requires_interpreter" BOOLEAN NOT NULL DEFAULT false,
    "created_by_user_id" TEXT NOT NULL,
    "published_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_consent_forms_pkey" PRIMARY KEY ("id")
);

-- Indexes required by the Prisma schema @@index and @@unique directives.
CREATE INDEX IF NOT EXISTS "clinical_consent_forms_tenant_id_status_idx" ON "clinical_consent_forms"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "clinical_consent_forms_tenant_id_form_type_status_idx" ON "clinical_consent_forms"("tenant_id", "form_type", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "clinical_consent_forms_tenant_id_code_version_key" ON "clinical_consent_forms"("tenant_id", "code", "version");

-- Foreign key to tenants, guarded so it does not fail if the constraint already exists.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'clinical_consent_forms_tenant_id_fkey'
          AND conrelid = '"clinical_consent_forms"'::regclass
    ) THEN
        ALTER TABLE "clinical_consent_forms"
            ADD CONSTRAINT "clinical_consent_forms_tenant_id_fkey"
            FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
