BEGIN;

CREATE TABLE IF NOT EXISTS discharge_decision_events (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  mrn VARCHAR NULL,
  encounter_number VARCHAR NULL,
  admission_number VARCHAR NULL,
  discharge_order_number VARCHAR NULL,
  physician_id VARCHAR NULL REFERENCES users(id),
  physician_name VARCHAR NULL,
  department_unit VARCHAR NULL,
  diagnosis_summary TEXT NULL,
  clinical_summary_source_ref VARCHAR NULL,
  decision_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  source_system VARCHAR NOT NULL DEFAULT 'manual',
  sync_mode VARCHAR NOT NULL DEFAULT 'manual',
  legal_state VARCHAR NOT NULL DEFAULT 'DRAFT',
  notification_state VARCHAR NOT NULL DEFAULT 'NOT_GENERATED',
  patient_response_state VARCHAR NOT NULL DEFAULT 'PENDING',
  signature_state VARCHAR NOT NULL DEFAULT 'PENDING',
  escalation_state VARCHAR NOT NULL DEFAULT 'NONE',
  final_package_state VARCHAR NOT NULL DEFAULT 'PENDING',
  status VARCHAR NOT NULL DEFAULT 'active',
  version VARCHAR NOT NULL DEFAULT '1',
  created_by VARCHAR NULL REFERENCES users(id),
  state_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discharge_decision_events_tenant_case
  ON discharge_decision_events (tenant_id, case_id);
CREATE INDEX IF NOT EXISTS idx_discharge_decision_events_legal_state
  ON discharge_decision_events (legal_state);

CREATE TABLE IF NOT EXISTS discharge_decision_documents (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  event_id VARCHAR NOT NULL REFERENCES discharge_decision_events(id),
  language VARCHAR NOT NULL DEFAULT 'ar',
  document_version VARCHAR NOT NULL DEFAULT '1.0.0',
  hospital_header_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  patient_section_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  medical_section_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  legal_statement_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_section_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_section_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_section_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  legal_footer_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT NULL,
  pdf_url VARCHAR NULL,
  verification_code VARCHAR NULL,
  document_hash VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discharge_decision_documents_case
  ON discharge_decision_documents (tenant_id, case_id);
CREATE INDEX IF NOT EXISTS idx_discharge_decision_documents_event
  ON discharge_decision_documents (event_id);

CREATE TABLE IF NOT EXISTS patient_notice_presentations (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  event_id VARCHAR NOT NULL REFERENCES discharge_decision_events(id),
  mode VARCHAR NOT NULL DEFAULT 'tablet',
  language VARCHAR NOT NULL DEFAULT 'ar',
  notice_method VARCHAR NOT NULL DEFAULT 'in_person',
  presenter_name VARCHAR NULL,
  presenter_role VARCHAR NULL,
  identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  interpreter_used BOOLEAN NOT NULL DEFAULT FALSE,
  interpreter_name VARCHAR NULL,
  opened_at TIMESTAMP NULL,
  first_viewed_at TIMESTAMP NULL,
  viewed_duration_seconds DOUBLE PRECISION NULL,
  action_taken_at TIMESTAMP NULL,
  device_info_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_reference VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'presented',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_notice_presentations_case
  ON patient_notice_presentations (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS patient_responses (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  event_id VARCHAR NOT NULL REFERENCES discharge_decision_events(id),
  response_type VARCHAR NOT NULL,
  refusal_reason VARCHAR NULL,
  refusal_narrative TEXT NULL,
  inability_reason VARCHAR NULL,
  requires_witness BOOLEAN NOT NULL DEFAULT FALSE,
  legally_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  status VARCHAR NOT NULL DEFAULT 'recorded',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_responses_case
  ON patient_responses (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS signer_identities (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  response_id VARCHAR NULL REFERENCES patient_responses(id),
  full_name VARCHAR NOT NULL,
  signer_type VARCHAR NOT NULL,
  relationship_to_patient VARCHAR NULL,
  id_type VARCHAR NULL,
  id_number VARCHAR NULL,
  mobile_number VARCHAR NULL,
  language_used VARCHAR NULL,
  witness_required BOOLEAN NOT NULL DEFAULT FALSE,
  staff_present_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR NOT NULL DEFAULT 'active',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signer_identities_case
  ON signer_identities (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS signature_artifacts (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  signer_identity_id VARCHAR NOT NULL REFERENCES signer_identities(id),
  document_ref VARCHAR NULL,
  signature_payload TEXT NOT NULL,
  signature_hash VARCHAR NOT NULL,
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR NOT NULL DEFAULT 'captured',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signature_artifacts_case
  ON signature_artifacts (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS home_healthcare_agreement_templates (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  name VARCHAR NOT NULL,
  language VARCHAR NOT NULL DEFAULT 'ar',
  fixed_clauses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  options_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR NOT NULL DEFAULT 'active',
  version VARCHAR NOT NULL DEFAULT '1',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS home_healthcare_agreement_instances (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  template_id VARCHAR NULL REFERENCES home_healthcare_agreement_templates(id),
  agreement_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT NULL,
  pdf_url VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_healthcare_agreement_instances_case
  ON home_healthcare_agreement_instances (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS medical_equipment_lease_templates (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  name VARCHAR NOT NULL,
  language VARCHAR NOT NULL DEFAULT 'ar',
  fixed_clauses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  options_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR NOT NULL DEFAULT 'active',
  version VARCHAR NOT NULL DEFAULT '1',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medical_equipment_lease_instances (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  template_id VARCHAR NULL REFERENCES medical_equipment_lease_templates(id),
  lease_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT NULL,
  pdf_url VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_equipment_lease_instances_case
  ON medical_equipment_lease_instances (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS financial_liability_acknowledgment_templates (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  name VARCHAR NOT NULL,
  language VARCHAR NOT NULL DEFAULT 'ar',
  fixed_clauses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  options_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR NOT NULL DEFAULT 'active',
  version VARCHAR NOT NULL DEFAULT '1',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_liability_acknowledgment_instances (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  event_id VARCHAR NULL REFERENCES discharge_decision_events(id),
  template_id VARCHAR NULL REFERENCES financial_liability_acknowledgment_templates(id),
  acknowledgment_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT NULL,
  pdf_url VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_liability_ack_instances_case
  ON financial_liability_acknowledgment_instances (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS promissory_note_templates (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  name VARCHAR NOT NULL,
  language VARCHAR NOT NULL DEFAULT 'ar',
  fixed_clauses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  options_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR NOT NULL DEFAULT 'active',
  version VARCHAR NOT NULL DEFAULT '1',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promissory_note_instances (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  template_id VARCHAR NULL REFERENCES promissory_note_templates(id),
  linked_financial_ack_id VARCHAR NULL REFERENCES financial_liability_acknowledgment_instances(id),
  amount_numeric DOUBLE PRECISION NOT NULL,
  amount_text_ar TEXT NOT NULL,
  promissory_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT NULL,
  pdf_url VARCHAR NULL,
  verification_code VARCHAR NULL,
  document_hash VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promissory_note_instances_case
  ON promissory_note_instances (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS legal_undertaking_templates (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  name VARCHAR NOT NULL,
  language VARCHAR NOT NULL DEFAULT 'ar',
  fixed_clauses_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR NOT NULL DEFAULT 'active',
  version VARCHAR NOT NULL DEFAULT '1',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_undertaking_instances (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  template_id VARCHAR NULL REFERENCES legal_undertaking_templates(id),
  undertaking_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  rendered_html TEXT NULL,
  pdf_url VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_undertaking_instances_case
  ON legal_undertaking_instances (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS evidence_packages (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  package_reference VARCHAR NOT NULL UNIQUE,
  generated_by VARCHAR NULL REFERENCES users(id),
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  bundle_url VARCHAR NULL,
  package_index_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR NOT NULL DEFAULT 'generated',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_case
  ON evidence_packages (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS escalation_events (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  event_id VARCHAR NULL REFERENCES discharge_decision_events(id),
  escalation_level VARCHAR NOT NULL,
  due_at TIMESTAMP NULL,
  escalated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  target_role VARCHAR NULL,
  notes TEXT NULL,
  status VARCHAR NOT NULL DEFAULT 'open',
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_events_case
  ON escalation_events (tenant_id, case_id);

COMMIT;
