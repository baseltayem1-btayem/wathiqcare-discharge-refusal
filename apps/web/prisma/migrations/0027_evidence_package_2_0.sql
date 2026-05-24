-- Phase 24: Evidence Package 2.0 foundation
-- Non-destructive, idempotent migration.

CREATE TABLE IF NOT EXISTS evidence_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id UUID NULL REFERENCES cases(id) ON DELETE SET NULL,
  consent_document_id UUID NULL REFERENCES consent_documents(id) ON DELETE SET NULL,
  mrn TEXT NULL,
  procedure_name TEXT NULL,
  education_version TEXT NULL,
  education_language TEXT NULL,
  education_viewed BOOLEAN NOT NULL DEFAULT FALSE,
  view_duration_seconds INTEGER NULL,
  consent_template TEXT NULL,
  consent_version TEXT NULL,
  consent_language TEXT NULL,
  consent_timestamp TIMESTAMPTZ NULL,
  signer_identity TEXT NULL,
  signature_timestamp TIMESTAMPTZ NULL,
  browser TEXT NULL,
  device_type TEXT NULL,
  ip_address TEXT NULL,
  otp_sent_time TIMESTAMPTZ NULL,
  otp_verification_time TIMESTAMPTZ NULL,
  otp_verification_status TEXT NULL,
  masked_mobile_number TEXT NULL,
  education_summary TEXT NULL,
  consent_summary TEXT NULL,
  timeline_summary TEXT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_tenant_generated
  ON evidence_packages(tenant_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_tenant_mrn
  ON evidence_packages(tenant_id, mrn);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_tenant_template
  ON evidence_packages(tenant_id, consent_template);

CREATE TABLE IF NOT EXISTS evidence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_id UUID NULL REFERENCES evidence_packages(id) ON DELETE SET NULL,
  case_id UUID NULL REFERENCES cases(id) ON DELETE SET NULL,
  consent_document_id UUID NULL REFERENCES consent_documents(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sequence_no INTEGER NULL,
  procedure_name TEXT NULL,
  education_version TEXT NULL,
  education_language TEXT NULL,
  assets_presented INTEGER NULL,
  images_presented INTEGER NULL,
  videos_presented INTEGER NULL,
  pdfs_presented INTEGER NULL,
  education_viewed BOOLEAN NULL,
  view_duration_seconds INTEGER NULL,
  consent_template TEXT NULL,
  consent_version TEXT NULL,
  consent_language TEXT NULL,
  consent_timestamp TIMESTAMPTZ NULL,
  signer_identity TEXT NULL,
  signature_timestamp TIMESTAMPTZ NULL,
  browser TEXT NULL,
  device_type TEXT NULL,
  ip_address TEXT NULL,
  otp_sent_time TIMESTAMPTZ NULL,
  otp_verification_time TIMESTAMPTZ NULL,
  otp_verification_status TEXT NULL,
  masked_mobile_number TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_events_tenant_type_time
  ON evidence_events(tenant_id, event_type, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_events_case_time
  ON evidence_events(tenant_id, case_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_events_consent_time
  ON evidence_events(tenant_id, consent_document_id, event_timestamp DESC);

CREATE TABLE IF NOT EXISTS evidence_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL UNIQUE REFERENCES evidence_packages(id) ON DELETE CASCADE,
  case_id UUID NULL REFERENCES cases(id) ON DELETE SET NULL,
  consent_document_id UUID NULL REFERENCES consent_documents(id) ON DELETE SET NULL,
  mrn TEXT NULL,
  timeline_json JSONB NOT NULL,
  summary_text TEXT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_timelines_tenant_generated
  ON evidence_timelines(tenant_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_timelines_tenant_mrn
  ON evidence_timelines(tenant_id, mrn);

CREATE TABLE IF NOT EXISTS evidence_asset_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES evidence_packages(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES evidence_events(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL,
  asset_category TEXT NULL,
  title TEXT NULL,
  source_url TEXT NULL,
  language TEXT NULL DEFAULT 'bilingual',
  presented BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_assets_package_sort
  ON evidence_asset_records(tenant_id, package_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_evidence_assets_tenant_type
  ON evidence_asset_records(tenant_id, asset_type);
