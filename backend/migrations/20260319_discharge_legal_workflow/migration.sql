BEGIN;

ALTER TABLE IF EXISTS patients
  ADD COLUMN IF NOT EXISTS external_patient_id VARCHAR UNIQUE,
  ADD COLUMN IF NOT EXISTS full_name_ar VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS full_name_en VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS mobile VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS national_id VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS encounters (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  external_encounter_id VARCHAR UNIQUE,
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  mrn VARCHAR NULL,
  discharge_order_issued_at TIMESTAMP NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters (patient_id);

CREATE TABLE IF NOT EXISTS discharge_sessions (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  encounter_id VARCHAR NOT NULL REFERENCES encounters(id),
  token_hash VARCHAR NOT NULL UNIQUE,
  token_expires_at TIMESTAMP NOT NULL,
  access_status VARCHAR NOT NULL DEFAULT 'pending',
  workflow_status VARCHAR NOT NULL DEFAULT 'session_created',
  routing_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  initiated_by_user_id VARCHAR NULL REFERENCES users(id),
  source_system VARCHAR NOT NULL DEFAULT 'internal',
  opened_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  one_time_access BOOLEAN NOT NULL DEFAULT FALSE,
  otp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMP NULL,
  payment_required BOOLEAN NOT NULL DEFAULT FALSE,
  payment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_currency VARCHAR NOT NULL DEFAULT 'SAR',
  workflow_sequence JSONB NOT NULL DEFAULT '[]'::jsonb,
  public_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discharge_sessions_patient_id ON discharge_sessions (patient_id);
CREATE INDEX IF NOT EXISTS idx_discharge_sessions_encounter_id ON discharge_sessions (encounter_id);
CREATE INDEX IF NOT EXISTS idx_discharge_sessions_token_hash ON discharge_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_discharge_sessions_workflow_status ON discharge_sessions (workflow_status);

CREATE TABLE IF NOT EXISTS discharge_documents (
  id VARCHAR PRIMARY KEY,
  session_id VARCHAR NOT NULL REFERENCES discharge_sessions(id) ON DELETE CASCADE,
  document_type VARCHAR NOT NULL,
  document_version VARCHAR NOT NULL DEFAULT '1.0.0',
  language VARCHAR NOT NULL DEFAULT 'ar',
  content_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT NULL,
  pdf_url VARCHAR NULL,
  pdf_hash_sha256 VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  signed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discharge_documents_session_id ON discharge_documents (session_id);

CREATE TABLE IF NOT EXISTS signatures (
  id VARCHAR PRIMARY KEY,
  session_id VARCHAR NOT NULL REFERENCES discharge_sessions(id) ON DELETE CASCADE,
  document_id VARCHAR NULL REFERENCES discharge_documents(id) ON DELETE SET NULL,
  signer_name VARCHAR NOT NULL,
  signer_role VARCHAR NOT NULL,
  signature_storage_url VARCHAR NULL,
  signature_hash VARCHAR NOT NULL,
  ip_address VARCHAR NULL,
  user_agent TEXT NULL,
  device_fingerprint VARCHAR NULL,
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signatures_session_id ON signatures (session_id);

CREATE TABLE IF NOT EXISTS discharge_session_audit_logs (
  id VARCHAR PRIMARY KEY,
  session_id VARCHAR NULL REFERENCES discharge_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL,
  event_time TIMESTAMP NOT NULL DEFAULT NOW(),
  actor_type VARCHAR NOT NULL DEFAULT 'system',
  actor_id VARCHAR NULL,
  ip_address VARCHAR NULL,
  user_agent TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discharge_session_audit_logs_session_id ON discharge_session_audit_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_discharge_session_audit_logs_event_type ON discharge_session_audit_logs (event_type);

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY,
  session_id VARCHAR NOT NULL REFERENCES discharge_sessions(id) ON DELETE CASCADE,
  channel VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,
  recipient VARCHAR NOT NULL,
  template_key VARCHAR NOT NULL,
  message_body TEXT NOT NULL,
  provider_message_id VARCHAR NULL,
  delivery_status VARCHAR NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  failed_at TIMESTAMP NULL,
  failure_reason TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_session_id ON notifications (session_id);
CREATE INDEX IF NOT EXISTS idx_notifications_delivery_status ON notifications (delivery_status);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR PRIMARY KEY,
  session_id VARCHAR NOT NULL REFERENCES discharge_sessions(id) ON DELETE CASCADE,
  payment_purpose VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'SAR',
  status VARCHAR NOT NULL DEFAULT 'pending',
  provider_reference VARCHAR NULL,
  checkout_url VARCHAR NULL,
  paid_at TIMESTAMP NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments (session_id);

CREATE TABLE IF NOT EXISTS equipment_items (
  id VARCHAR PRIMARY KEY,
  session_id VARCHAR NOT NULL REFERENCES discharge_sessions(id) ON DELETE CASCADE,
  item_name VARCHAR NOT NULL,
  item_code VARCHAR NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  training_required BOOLEAN NOT NULL DEFAULT FALSE,
  return_required BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_required BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_amount NUMERIC(12,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_items_session_id ON equipment_items (session_id);

CREATE TABLE IF NOT EXISTS home_care_plans (
  id VARCHAR PRIMARY KEY,
  session_id VARCHAR NOT NULL REFERENCES discharge_sessions(id) ON DELETE CASCADE,
  provider_name VARCHAR NOT NULL,
  service_summary TEXT NOT NULL,
  start_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_care_plans_session_id ON home_care_plans (session_id);

CREATE TABLE IF NOT EXISTS refusal_liabilities (
  id VARCHAR PRIMARY KEY,
  session_id VARCHAR NOT NULL REFERENCES discharge_sessions(id) ON DELETE CASCADE,
  estimated_cost NUMERIC(12,2) NULL,
  liability_terms TEXT NOT NULL,
  requires_payment BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refusal_liabilities_session_id ON refusal_liabilities (session_id);

CREATE TABLE IF NOT EXISTS discharge_legal_templates (
  id VARCHAR PRIMARY KEY,
  template_key VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  language VARCHAR NOT NULL DEFAULT 'ar',
  version VARCHAR NOT NULL DEFAULT '1.0.0',
  body TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  status VARCHAR NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discharge_legal_templates_key ON discharge_legal_templates (template_key);
CREATE INDEX IF NOT EXISTS idx_discharge_legal_templates_published ON discharge_legal_templates (is_published);

COMMIT;
