CREATE TABLE IF NOT EXISTS trakcare_integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  user_id uuid,
  endpoint text NOT NULL,
  method text NOT NULL,
  request_id text,
  correlation_id text,
  mrn text,
  external_encounter_id text,
  source_transaction_id text,
  status_code integer,
  outcome text NOT NULL,
  error_code text,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  duration_ms integer,
  request_payload jsonb,
  response_payload jsonb,
  redacted_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trakcare_integration_logs_tenant_created
  ON trakcare_integration_logs(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trakcare_integration_logs_tenant_mrn_created
  ON trakcare_integration_logs(tenant_id, mrn, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_external_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  patient_mrn text NOT NULL,
  external_system text NOT NULL DEFAULT 'TRAKCARE',
  external_patient_id text NOT NULL,
  national_id text,
  iqama_number text,
  source_transaction_id text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_external_refs_external
  ON patient_external_references(tenant_id, external_system, external_patient_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_external_refs_mrn
  ON patient_external_references(tenant_id, external_system, patient_mrn);

CREATE INDEX IF NOT EXISTS idx_patient_external_refs_tenant_mrn
  ON patient_external_references(tenant_id, patient_mrn);

CREATE TABLE IF NOT EXISTS encounter_external_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
  patient_external_reference_id uuid REFERENCES patient_external_references(id) ON DELETE SET NULL,
  external_system text NOT NULL DEFAULT 'TRAKCARE',
  external_encounter_id text NOT NULL,
  encounter_number text,
  external_practitioner_id text,
  department text,
  admission_date timestamptz,
  source_transaction_id text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_encounter_external_refs_external
  ON encounter_external_references(tenant_id, external_system, external_encounter_id);

CREATE INDEX IF NOT EXISTS idx_encounter_external_refs_tenant_number
  ON encounter_external_references(tenant_id, encounter_number);

CREATE INDEX IF NOT EXISTS idx_encounter_external_refs_tenant_tx
  ON encounter_external_references(tenant_id, source_transaction_id);

CREATE TABLE IF NOT EXISTS consent_source_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id uuid NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  source_system text NOT NULL DEFAULT 'TRAKCARE',
  source_type text NOT NULL,
  source_transaction_id text,
  captured_by_user_id uuid,
  captured_at timestamptz NOT NULL DEFAULT now(),
  is_manual_override boolean NOT NULL DEFAULT false,
  override_reason text,
  snapshot jsonb NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_source_snapshots_doc_created
  ON consent_source_snapshots(tenant_id, consent_document_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consent_source_snapshots_tenant_tx
  ON consent_source_snapshots(tenant_id, source_transaction_id);
