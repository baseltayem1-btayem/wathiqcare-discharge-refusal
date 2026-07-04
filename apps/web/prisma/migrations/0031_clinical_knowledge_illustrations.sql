-- Clinical Knowledge Illustrations — Additive Migration
-- Adds tenant-scoped anatomical / procedural educational illustrations with
-- a standalone medical-review workflow. No existing tables are modified or dropped.

-- ── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "ClinicalKnowledgeIllustrationStatus" AS ENUM (
  'draft',
  'medical_review',
  'approved',
  'rejected'
);

-- ── Clinical Knowledge Illustration ───────────────────────────────────────────

CREATE TABLE "clinical_knowledge_illustrations" (
  "id"                            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "tenant_id"                     TEXT NOT NULL,
  "procedure_id"                  TEXT NOT NULL,
  "procedure_name_en"             TEXT NOT NULL,
  "procedure_name_ar"             TEXT NOT NULL,
  "specialty"                     TEXT,
  "anatomy_region"                TEXT,
  "anatomy_image_url"             TEXT,
  "procedure_image_url"           TEXT,
  "anatomy_prompt_en"             TEXT,
  "anatomy_prompt_ar"             TEXT,
  "procedure_prompt_en"           TEXT,
  "procedure_prompt_ar"           TEXT,
  "patient_display_disclaimer_en" TEXT,
  "patient_display_disclaimer_ar" TEXT,
  "source"                        TEXT,
  "version"                       TEXT,
  "patient_facing"                BOOLEAN NOT NULL DEFAULT true,
  "image_review_status"           "ClinicalKnowledgeIllustrationStatus" NOT NULL DEFAULT 'draft',
  "reviewed_by"                   TEXT,
  "reviewed_at"                   TIMESTAMP,
  "effective_date"                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiry_date"                   TIMESTAMP,
  "created_by_user_id"            TEXT NOT NULL,
  "created_at"                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clinical_knowledge_illustrations_tenant_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "clinical_knowledge_illustrations_procedure_fk" FOREIGN KEY ("procedure_id") REFERENCES "clinical_procedures"("id") ON DELETE RESTRICT
);

CREATE INDEX "idx_clinical_knowledge_illustrations_tenant_procedure" ON "clinical_knowledge_illustrations"("tenant_id", "procedure_id");
CREATE INDEX "idx_clinical_knowledge_illustrations_tenant_status" ON "clinical_knowledge_illustrations"("tenant_id", "image_review_status");
CREATE INDEX "idx_clinical_knowledge_illustrations_tenant_procedure_status_dates" ON "clinical_knowledge_illustrations"("tenant_id", "procedure_id", "image_review_status", "effective_date", "expiry_date");
