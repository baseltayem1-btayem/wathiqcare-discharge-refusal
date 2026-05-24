CREATE TABLE IF NOT EXISTS procedure_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_code text NOT NULL,
  category text,
  specialty text,
  status text NOT NULL DEFAULT 'DRAFT',
  title_ar text NOT NULL,
  title_en text NOT NULL,
  summary_ar text,
  summary_en text,
  current_version_id uuid,
  is_published boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_procedure_education_tenant_code
  ON procedure_education(tenant_id, procedure_code);

CREATE INDEX IF NOT EXISTS idx_procedure_education_tenant_status_updated
  ON procedure_education(tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS procedure_education_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_education_id uuid NOT NULL REFERENCES procedure_education(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'DRAFT',
  published_by_user_id uuid,
  published_at timestamptz,
  changelog text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_procedure_education_versions_number
  ON procedure_education_versions(procedure_education_id, version_number);

CREATE INDEX IF NOT EXISTS idx_procedure_education_versions_tenant_status_published
  ON procedure_education_versions(tenant_id, status, published_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_procedure_education_current_version'
  ) THEN
    ALTER TABLE procedure_education
      ADD CONSTRAINT fk_procedure_education_current_version
      FOREIGN KEY (current_version_id)
      REFERENCES procedure_education_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS procedure_education_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_education_id uuid NOT NULL REFERENCES procedure_education(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES procedure_education_versions(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  body_ar text NOT NULL,
  body_en text NOT NULL,
  sort_order integer NOT NULL DEFAULT 100,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_procedure_education_sections_version_key
  ON procedure_education_sections(version_id, section_key);

CREATE INDEX IF NOT EXISTS idx_procedure_education_sections_sort
  ON procedure_education_sections(tenant_id, procedure_education_id, sort_order);

CREATE TABLE IF NOT EXISTS procedure_education_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_education_id uuid NOT NULL REFERENCES procedure_education(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES procedure_education_versions(id) ON DELETE CASCADE,
  section_id uuid REFERENCES procedure_education_sections(id) ON DELETE SET NULL,
  asset_type text NOT NULL,
  language text NOT NULL DEFAULT 'bilingual',
  title text NOT NULL,
  source_url text NOT NULL,
  thumbnail_url text,
  mime_type text,
  duration_seconds integer,
  sort_order integer NOT NULL DEFAULT 100,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedure_education_assets_sort
  ON procedure_education_assets(tenant_id, procedure_education_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_procedure_education_assets_type
  ON procedure_education_assets(tenant_id, asset_type);

CREATE TABLE IF NOT EXISTS procedure_education_localizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_education_id uuid NOT NULL REFERENCES procedure_education(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES procedure_education_versions(id) ON DELETE CASCADE,
  language text NOT NULL,
  direction text NOT NULL,
  localized_title text NOT NULL,
  localized_summary text,
  body_json jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_procedure_education_localizations_version_lang
  ON procedure_education_localizations(version_id, language);

CREATE INDEX IF NOT EXISTS idx_procedure_education_localizations_tenant_lang
  ON procedure_education_localizations(tenant_id, language);

CREATE TABLE IF NOT EXISTS procedure_education_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_education_id uuid NOT NULL REFERENCES procedure_education(id) ON DELETE CASCADE,
  version_id uuid REFERENCES procedure_education_versions(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT 'VIEWED',
  language text NOT NULL,
  version_label text,
  duration_seconds integer,
  actor_user_id uuid,
  metadata jsonb,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procedure_education_audit_viewed
  ON procedure_education_audit_events(tenant_id, procedure_education_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_procedure_education_audit_language
  ON procedure_education_audit_events(tenant_id, language, viewed_at DESC);
