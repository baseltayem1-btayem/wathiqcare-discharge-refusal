-- Migration 0017: Medical Consent Library Engine foundation.
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentTemplateStatus') THEN
    CREATE TYPE "ConsentTemplateStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'ARCHIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentDocumentStatus') THEN
    CREATE TYPE "ConsentDocumentStatus" AS ENUM (
      'DRAFT',
      'AI_DRAFT',
      'PHYSICIAN_REVIEW',
      'APPROVED',
      'READY_FOR_SIGNATURE',
      'SIGNED',
      'FINALIZED',
      'ARCHIVED',
      'VOID'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentSectionKind') THEN
    CREATE TYPE "ConsentSectionKind" AS ENUM (
      'FIXED_LEGAL',
      'DYNAMIC_MEDICAL',
      'AUTO_POPULATED',
      'SIGNATURE',
      'WITNESS',
      'INTERPRETER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentSignatureRole') THEN
    CREATE TYPE "ConsentSignatureRole" AS ENUM (
      'PATIENT',
      'PHYSICIAN',
      'WITNESS',
      'INTERPRETER',
      'GUARDIAN'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS consent_categories (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_consent_categories_tenant_code UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS consent_templates (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES consent_categories(id) ON DELETE SET NULL,
  template_code TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  specialty TEXT NOT NULL,
  department TEXT,
  status "ConsentTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  current_version_id TEXT,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary_ar TEXT,
  summary_en TEXT,
  is_ai_assist_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_consent_templates_tenant_template_code UNIQUE (tenant_id, template_code)
);

CREATE TABLE IF NOT EXISTS consent_template_versions (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES consent_templates(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  status "ConsentTemplateStatus" NOT NULL DEFAULT 'DRAFT',
  legal_text_ar TEXT NOT NULL,
  legal_text_en TEXT NOT NULL,
  pdpl_text_ar TEXT NOT NULL,
  pdpl_text_en TEXT NOT NULL,
  witness_decl_ar TEXT NOT NULL,
  witness_decl_en TEXT NOT NULL,
  physician_cert_ar TEXT NOT NULL,
  physician_cert_en TEXT NOT NULL,
  ai_warning_ar TEXT NOT NULL,
  ai_warning_en TEXT NOT NULL,
  created_by_user_id TEXT,
  approved_by_user_id TEXT,
  approved_at TIMESTAMPTZ,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_consent_template_versions_template_version UNIQUE (template_id, version_number)
);

CREATE TABLE IF NOT EXISTS consent_template_sections (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_version_id TEXT NOT NULL REFERENCES consent_template_versions(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  section_kind "ConsentSectionKind" NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_editable_by_physician BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_consent_template_sections_version_key UNIQUE (template_version_id, section_key)
);

CREATE TABLE IF NOT EXISTS consent_ai_prompts (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  prompt_ar TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  version_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_documents (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES consent_templates(id) ON DELETE CASCADE,
  template_version_id TEXT NOT NULL REFERENCES consent_template_versions(id) ON DELETE RESTRICT,
  consent_reference TEXT NOT NULL,
  status "ConsentDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  language TEXT NOT NULL DEFAULT 'bilingual',
  patient_name TEXT NOT NULL,
  mrn TEXT,
  dob TEXT,
  gender TEXT,
  physician_name TEXT NOT NULL,
  physician_license TEXT,
  physician_specialty TEXT NOT NULL,
  department TEXT,
  diagnosis TEXT,
  planned_procedure TEXT,
  admission_details TEXT,
  procedure_details TEXT,
  risks_ar TEXT,
  risks_en TEXT,
  side_effects_ar TEXT,
  side_effects_en TEXT,
  alternatives_ar TEXT,
  alternatives_en TEXT,
  refusal_risks_ar TEXT,
  refusal_risks_en TEXT,
  expected_outcomes_ar TEXT,
  expected_outcomes_en TEXT,
  physician_notes_ar TEXT,
  physician_notes_en TEXT,
  legal_text_ar TEXT NOT NULL,
  legal_text_en TEXT NOT NULL,
  pdpl_text_ar TEXT NOT NULL,
  pdpl_text_en TEXT NOT NULL,
  witness_decl_ar TEXT NOT NULL,
  witness_decl_en TEXT NOT NULL,
  physician_cert_ar TEXT NOT NULL,
  physician_cert_en TEXT NOT NULL,
  ai_warning_ar TEXT NOT NULL,
  ai_warning_en TEXT NOT NULL,
  ai_generated_at TIMESTAMPTZ,
  ai_generated_by_user_id TEXT,
  ai_validated_at TIMESTAMPTZ,
  ai_validated_by_user_id TEXT,
  approved_at TIMESTAMPTZ,
  approved_by_user_id TEXT,
  finalized_at TIMESTAMPTZ,
  finalized_by_user_id TEXT,
  immutable_pdf_url TEXT,
  immutable_pdf_hash TEXT,
  qr_payload TEXT,
  document_version TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_consent_documents_tenant_reference UNIQUE (tenant_id, consent_reference)
);

CREATE TABLE IF NOT EXISTS consent_document_sections (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  source_template_section_id TEXT,
  section_key TEXT NOT NULL,
  section_kind "ConsentSectionKind" NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  is_editable_by_physician BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_document_signatures (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  role "ConsentSignatureRole" NOT NULL,
  signer_name TEXT NOT NULL,
  signer_id_number TEXT,
  signer_license TEXT,
  signature_method "ConsentMethod" NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_audit_events (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT REFERENCES consent_documents(id) ON DELETE SET NULL,
  template_id TEXT REFERENCES consent_templates(id) ON DELETE SET NULL,
  template_version_id TEXT REFERENCES consent_template_versions(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  source TEXT,
  actor_user_id TEXT,
  actor_role TEXT,
  summary TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_categories_tenant_active_sort
  ON consent_categories (tenant_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_consent_templates_tenant_status_specialty
  ON consent_templates (tenant_id, status, specialty);

CREATE INDEX IF NOT EXISTS idx_consent_templates_tenant_type
  ON consent_templates (tenant_id, consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_template_versions_tenant_status_updated
  ON consent_template_versions (tenant_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_consent_template_versions_tenant_template_version
  ON consent_template_versions (tenant_id, template_id, version_number);

CREATE INDEX IF NOT EXISTS idx_consent_template_sections_tenant_version_sort
  ON consent_template_sections (tenant_id, template_version_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_consent_ai_prompts_tenant_specialty_type_active
  ON consent_ai_prompts (tenant_id, specialty, consent_type, is_active);

CREATE INDEX IF NOT EXISTS idx_consent_documents_tenant_case_status_created
  ON consent_documents (tenant_id, case_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_consent_documents_tenant_template_version
  ON consent_documents (tenant_id, template_id, template_version_id);

CREATE INDEX IF NOT EXISTS idx_consent_document_sections_tenant_doc_sort
  ON consent_document_sections (tenant_id, consent_document_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_consent_document_signatures_tenant_doc_role_signed
  ON consent_document_signatures (tenant_id, consent_document_id, role, signed_at);

CREATE INDEX IF NOT EXISTS idx_consent_audit_events_tenant_created
  ON consent_audit_events (tenant_id, created_at);

CREATE INDEX IF NOT EXISTS idx_consent_audit_events_tenant_doc_created
  ON consent_audit_events (tenant_id, consent_document_id, created_at);

CREATE INDEX IF NOT EXISTS idx_consent_audit_events_tenant_template_version
  ON consent_audit_events (tenant_id, template_id, template_version_id);
