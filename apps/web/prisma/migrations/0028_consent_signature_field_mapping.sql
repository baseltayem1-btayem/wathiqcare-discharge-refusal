CREATE TABLE IF NOT EXISTS consent_signature_field_mappings (
  id TEXT PRIMARY KEY,

  tenant_id TEXT NOT NULL,
  form_id TEXT NOT NULL,

  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL,
  role TEXT,
  label_en TEXT,
  label_ar TEXT,

  page_number INTEGER NOT NULL,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  width DOUBLE PRECISION NOT NULL,
  height DOUBLE PRECISION NOT NULL,

  coordinate_mode TEXT NOT NULL DEFAULT 'NORMALIZED',
  required BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  appearance JSONB,
  metadata JSONB,

  created_by_user_id TEXT,
  reviewed_by_user_id TEXT,
  approved_by_user_id TEXT,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT consent_signature_field_mappings_form_fk
    FOREIGN KEY (form_id)
    REFERENCES clinical_consent_forms(id)
    ON DELETE CASCADE,

  CONSTRAINT consent_signature_field_mappings_coordinate_mode_chk
    CHECK (coordinate_mode IN ('NORMALIZED')),

  CONSTRAINT consent_signature_field_mappings_page_number_chk
    CHECK (page_number >= 1),

  CONSTRAINT consent_signature_field_mappings_box_bounds_chk
    CHECK (
      x >= 0 AND x <= 1
      AND y >= 0 AND y <= 1
      AND width > 0 AND width <= 1
      AND height > 0 AND height <= 1
      AND x + width <= 1
      AND y + height <= 1
    )
);

CREATE INDEX IF NOT EXISTS idx_signature_mapping_form
  ON consent_signature_field_mappings (tenant_id, form_id);

CREATE INDEX IF NOT EXISTS idx_signature_mapping_type
  ON consent_signature_field_mappings (tenant_id, form_id, field_type);

CREATE INDEX IF NOT EXISTS idx_signature_mapping_active
  ON consent_signature_field_mappings (tenant_id, form_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_signature_mapping_active_field_key
  ON consent_signature_field_mappings (tenant_id, form_id, field_key)
  WHERE is_active = TRUE;
