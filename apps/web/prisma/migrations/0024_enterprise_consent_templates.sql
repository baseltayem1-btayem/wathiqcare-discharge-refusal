-- Enterprise consent template governance extension

ALTER TABLE consent_templates
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS requires_witness BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_guardian BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_interpreter BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_separate_consent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE consent_template_versions
  ADD COLUMN IF NOT EXISTS legal_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_immutable BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS consent_template_localizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  template_version_id UUID NOT NULL REFERENCES consent_template_versions(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  direction TEXT NOT NULL,
  title TEXT NOT NULL,
  full_body TEXT NOT NULL,
  sections_json JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_consent_template_localizations_version_language UNIQUE (template_version_id, language)
);

CREATE INDEX IF NOT EXISTS idx_consent_template_localizations_tenant_language
  ON consent_template_localizations (tenant_id, language);
