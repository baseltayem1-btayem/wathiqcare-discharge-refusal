CREATE TABLE IF NOT EXISTS education_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  package_key text NOT NULL,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  summary_ar text,
  summary_en text,
  clinical_domain text,
  procedure_code text,
  status text NOT NULL DEFAULT 'DRAFT',
  current_version_id uuid,
  created_by_user_id uuid,
  approved_by_user_id uuid,
  approved_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_education_packages_tenant_key
  ON education_packages(tenant_id, package_key);

CREATE INDEX IF NOT EXISTS idx_education_packages_tenant_status_updated
  ON education_packages(tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS education_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  education_package_id uuid NOT NULL REFERENCES education_packages(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'DRAFT',
  content_hash text,
  linked_template_ids jsonb,
  linked_template_version_ids jsonb,
  approved_by_user_id uuid,
  approved_at timestamptz,
  manifest_json jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_education_versions_package_number
  ON education_versions(education_package_id, version_number);

CREATE INDEX IF NOT EXISTS idx_education_versions_tenant_status_approved
  ON education_versions(tenant_id, status, approved_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_education_packages_current_version'
  ) THEN
    ALTER TABLE education_packages
      ADD CONSTRAINT fk_education_packages_current_version
      FOREIGN KEY (current_version_id)
      REFERENCES education_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS education_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  education_package_id uuid NOT NULL REFERENCES education_packages(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES education_versions(id) ON DELETE CASCADE,
  asset_key text NOT NULL,
  asset_type text NOT NULL,
  title text NOT NULL,
  locale text NOT NULL DEFAULT 'bilingual',
  source_uri text,
  thumbnail_uri text,
  content_hash text,
  sort_order integer NOT NULL DEFAULT 100,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_education_assets_version_key
  ON education_assets(version_id, asset_key);

CREATE INDEX IF NOT EXISTS idx_education_assets_package_sort
  ON education_assets(tenant_id, education_package_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_education_assets_tenant_type
  ON education_assets(tenant_id, asset_type);

CREATE TABLE IF NOT EXISTS education_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  education_package_id uuid NOT NULL REFERENCES education_packages(id) ON DELETE CASCADE,
  version_id uuid REFERENCES education_versions(id) ON DELETE SET NULL,
  action text NOT NULL,
  actor_user_id uuid,
  consent_template_id uuid,
  consent_template_version_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_audit_events_package_created
  ON education_audit_events(tenant_id, education_package_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_education_audit_events_action_created
  ON education_audit_events(tenant_id, action, created_at DESC);

CREATE TABLE IF NOT EXISTS education_evidence_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  education_package_id uuid NOT NULL REFERENCES education_packages(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES education_versions(id) ON DELETE CASCADE,
  consent_template_id uuid,
  consent_template_version_id uuid,
  evidence_hash text,
  package_summary text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_education_evidence_packages_package_generated
  ON education_evidence_packages(tenant_id, education_package_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_education_evidence_packages_template_version
  ON education_evidence_packages(tenant_id, consent_template_version_id);