BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'discharge_cases'
  ) THEN
    ALTER TABLE discharge_cases
      ADD COLUMN IF NOT EXISTS clinical_payload_json TEXT NULL,
      ADD COLUMN IF NOT EXISTS legal_payload_json TEXT NULL,
      ADD COLUMN IF NOT EXISTS tenant_header_json TEXT NULL,
      ADD COLUMN IF NOT EXISTS legal_footer_text TEXT NULL,
      ADD COLUMN IF NOT EXISTS capacity_status VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS capacity_assessed_by VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS capacity_validated_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS risk_disclosure_completed_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS patient_signature_hash VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS physician_signature_hash VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS witness_signature_hash VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS guardian_signature_hash VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS signature_context_json TEXT NULL,
      ADD COLUMN IF NOT EXISTS artifact_version VARCHAR NOT NULL DEFAULT '1',
      ADD COLUMN IF NOT EXISTS finalized_hash VARCHAR NULL,
      ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS immutable_lock BOOLEAN NOT NULL DEFAULT FALSE;

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_discharge_cases_finalized_at ON discharge_cases (finalized_at)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_discharge_cases_capacity_status ON discharge_cases (capacity_status)';
  END IF;
END
$$;

COMMIT;
