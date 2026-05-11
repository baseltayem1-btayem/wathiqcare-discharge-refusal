-- Migration 0018: Phase 2 medico-legal consent intelligence.
-- Safe/idempotent where practical.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname IN ('ConsentTemplateStatus', 'consenttemplatestatus')
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname IN ('ConsentTemplateStatus', 'consenttemplatestatus')
        AND e.enumlabel = 'UNDER_REVIEW'
    ) THEN
      ALTER TYPE "ConsentTemplateStatus" ADD VALUE 'UNDER_REVIEW';
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname IN ('ConsentTemplateStatus', 'consenttemplatestatus')
        AND e.enumlabel = 'RETIRED'
    ) THEN
      ALTER TYPE "ConsentTemplateStatus" ADD VALUE 'RETIRED';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentRiskClass') THEN
    CREATE TYPE "ConsentRiskClass" AS ENUM ('COMMON', 'LESS_COMMON', 'RARE', 'SERIOUS', 'LIFE_THREATENING');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentRiskSeverity') THEN
    CREATE TYPE "ConsentRiskSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentAlertLevel') THEN
    CREATE TYPE "ConsentAlertLevel" AS ENUM ('INFO', 'WARNING', 'HIGH_ALERT', 'LEGAL_CRITICAL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentCommitteeType') THEN
    CREATE TYPE "ConsentCommitteeType" AS ENUM ('LEGAL', 'MEDICAL', 'QUALITY', 'COMPLIANCE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentReviewDecision') THEN
    CREATE TYPE "ConsentReviewDecision" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentEvidenceCopyType') THEN
    CREATE TYPE "ConsentEvidenceCopyType" AS ENUM ('PATIENT_COPY', 'MEDICAL_RECORD_COPY', 'LEGAL_ARCHIVE_COPY');
  END IF;
END $$;

ALTER TABLE consent_documents
  ADD COLUMN IF NOT EXISTS audit_checksum TEXT,
  ADD COLUMN IF NOT EXISTS generated_by_model TEXT,
  ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS legal_hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS consent_prompt_registry (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  procedure_key TEXT,
  prompt_ar TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT '1.0',
  generator_model TEXT NOT NULL DEFAULT 'gpt-5.3-codex',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_wording_repository (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  procedure_key TEXT,
  wording_type TEXT NOT NULL,
  wording_ar TEXT NOT NULL,
  wording_en TEXT NOT NULL,
  approved_by_user_id TEXT,
  approved_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_procedure_catalog (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  procedure_code TEXT NOT NULL,
  cpt_code TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  anesthesia_implications_ar TEXT,
  anesthesia_implications_en TEXT,
  post_procedure_ar TEXT,
  post_procedure_en TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_consent_procedure_catalog_tenant_code UNIQUE (tenant_id, procedure_code)
);

CREATE TABLE IF NOT EXISTS consent_procedure_risk_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_id TEXT NOT NULL REFERENCES consent_procedure_catalog(id) ON DELETE CASCADE,
  risk_key TEXT NOT NULL,
  risk_class "ConsentRiskClass" NOT NULL,
  severity "ConsentRiskSeverity" NOT NULL,
  alert_level "ConsentAlertLevel" NOT NULL DEFAULT 'INFO',
  probability_indicator NUMERIC(5,2),
  is_mandatory_disclosure BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  wording_ar TEXT NOT NULL,
  wording_en TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_procedure_alternatives (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_id TEXT NOT NULL REFERENCES consent_procedure_catalog(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  wording_ar TEXT NOT NULL,
  wording_en TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_procedure_refusal_consequences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_id TEXT NOT NULL REFERENCES consent_procedure_catalog(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  wording_ar TEXT NOT NULL,
  wording_en TEXT NOT NULL,
  is_legally_critical BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_procedure_outcomes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_id TEXT NOT NULL REFERENCES consent_procedure_catalog(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  wording_ar TEXT NOT NULL,
  wording_en TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_document_risks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  source_procedure_risk_id TEXT,
  risk_class "ConsentRiskClass" NOT NULL,
  severity "ConsentRiskSeverity" NOT NULL,
  alert_level "ConsentAlertLevel" NOT NULL DEFAULT 'INFO',
  probability_indicator NUMERIC(5,2),
  is_mandatory_disclosure BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  wording_ar TEXT NOT NULL,
  wording_en TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_generated_paragraphs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  source TEXT NOT NULL,
  specialty TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  generator_model TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  physician_approval_status TEXT NOT NULL DEFAULT 'PENDING',
  content_ar TEXT,
  content_en TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_timeline_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor_user_id TEXT,
  actor_role TEXT,
  device_info TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_committee_reviews (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT REFERENCES consent_documents(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES consent_templates(id) ON DELETE SET NULL,
  template_version_id TEXT REFERENCES consent_template_versions(id) ON DELETE SET NULL,
  committee_type "ConsentCommitteeType" NOT NULL,
  decision "ConsentReviewDecision" NOT NULL DEFAULT 'PENDING',
  reviewer_user_id TEXT,
  comments_ar TEXT,
  comments_en TEXT,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_evidence_packages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  copy_type "ConsentEvidenceCopyType" NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT,
  checksum_hash TEXT NOT NULL,
  generated_by TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS consent_emr_mappings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  adapter_key TEXT NOT NULL,
  diagnosis_code TEXT,
  procedure_code TEXT,
  physician_identifier TEXT,
  encounter_identifier TEXT,
  allergies_snapshot JSONB,
  medications_snapshot JSONB,
  consent_history_ref TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_prompt_registry_lookup
  ON consent_prompt_registry (tenant_id, specialty, consent_type, is_active);

CREATE INDEX IF NOT EXISTS idx_consent_wording_repository_lookup
  ON consent_wording_repository (tenant_id, specialty, consent_type, wording_type, is_active);

CREATE INDEX IF NOT EXISTS idx_consent_procedure_catalog_lookup
  ON consent_procedure_catalog (tenant_id, specialty, is_active);

CREATE INDEX IF NOT EXISTS idx_consent_procedure_risk_items_lookup
  ON consent_procedure_risk_items (tenant_id, procedure_id, risk_class, sort_order);

CREATE INDEX IF NOT EXISTS idx_consent_document_risks_lookup
  ON consent_document_risks (tenant_id, consent_document_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_consent_generated_paragraphs_lookup
  ON consent_generated_paragraphs (tenant_id, consent_document_id, generated_at);

CREATE INDEX IF NOT EXISTS idx_consent_timeline_events_lookup
  ON consent_timeline_events (tenant_id, consent_document_id, created_at);

CREATE INDEX IF NOT EXISTS idx_consent_committee_reviews_lookup
  ON consent_committee_reviews (tenant_id, committee_type, decision);

CREATE INDEX IF NOT EXISTS idx_consent_evidence_packages_lookup
  ON consent_evidence_packages (tenant_id, consent_document_id, copy_type);

CREATE INDEX IF NOT EXISTS idx_consent_emr_mappings_lookup
  ON consent_emr_mappings (tenant_id, adapter_key, procedure_code);
