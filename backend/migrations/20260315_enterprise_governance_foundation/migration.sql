BEGIN;

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name_en VARCHAR NOT NULL,
  name_ar VARCHAR NOT NULL,
  parent_code VARCHAR NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata_json JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departments_code_active ON departments (code, is_active);

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_medical', 'medical', 'Medical', 'الطبي', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'medical');

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_nursing', 'nursing', 'Nursing', 'التمريض', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'nursing');

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_finance', 'finance', 'Finance', 'المالية', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'finance');

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_social_services', 'social_services', 'Social Services', 'الخدمات الاجتماعية', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'social_services');

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_legal_affairs', 'legal_affairs', 'Legal Affairs', 'الشؤون القانونية', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'legal_affairs');

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_compliance', 'compliance', 'Compliance', 'الامتثال', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'compliance');

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_patient_relations', 'patient_relations', 'Patient Relations', 'علاقات المرضى', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'patient_relations');

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_administration', 'administration', 'Administration', 'الإدارة', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'administration');

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_home_healthcare', 'home_healthcare', 'Home Healthcare', 'الرعاية الصحية المنزلية', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'home_healthcare');

INSERT INTO departments (id, code, name_en, name_ar, is_active)
SELECT 'dept_case_management', 'case_management', 'Case Management', 'إدارة الحالات', TRUE
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'case_management');

CREATE TABLE IF NOT EXISTS admissions (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  admission_number VARCHAR NULL,
  department_code VARCHAR NULL REFERENCES departments(code),
  admitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  discharged_at TIMESTAMP NULL,
  status VARCHAR NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admissions_tenant_patient ON admissions (tenant_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_number ON admissions (admission_number);

ALTER TABLE IF EXISTS discharge_cases
  ADD COLUMN IF NOT EXISTS admission_id VARCHAR NULL REFERENCES admissions(id);

CREATE TABLE IF NOT EXISTS financial_liability_records (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  admission_id VARCHAR NULL REFERENCES admissions(id),
  case_id VARCHAR NULL REFERENCES discharge_cases(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NULL,
  currency VARCHAR NOT NULL DEFAULT 'SAR',
  reason TEXT NULL,
  status VARCHAR NOT NULL DEFAULT 'open',
  metadata_json JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_liability_case ON financial_liability_records (case_id);
CREATE INDEX IF NOT EXISTS idx_financial_liability_patient ON financial_liability_records (patient_id);

CREATE TABLE IF NOT EXISTS financial_guarantees (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  patient_id VARCHAR NOT NULL REFERENCES patients(id),
  admission_id VARCHAR NULL REFERENCES admissions(id),
  refusal_case_id VARCHAR NULL REFERENCES discharge_cases(id) ON DELETE SET NULL,
  financial_liability_record_id VARCHAR NULL REFERENCES financial_liability_records(id) ON DELETE SET NULL,
  guarantee_type VARCHAR NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'SAR',
  issue_date TIMESTAMP NULL,
  expiry_date TIMESTAMP NULL,
  issuing_authority VARCHAR NULL,
  obligor VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'draft',
  reference_number VARCHAR NULL,
  metadata_json JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_guarantees_case ON financial_guarantees (refusal_case_id);
CREATE INDEX IF NOT EXISTS idx_financial_guarantees_type_status ON financial_guarantees (guarantee_type, status);

CREATE TABLE IF NOT EXISTS integration_configs (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  integration_key VARCHAR NOT NULL,
  integration_type VARCHAR NOT NULL,
  provider_name VARCHAR NULL,
  endpoint_url VARCHAR NOT NULL,
  auth_type VARCHAR NOT NULL DEFAULT 'none',
  secret_reference VARCHAR NULL,
  status VARCHAR NOT NULL DEFAULT 'disabled',
  retry_policy_json JSONB NULL,
  timeout_seconds INTEGER NOT NULL DEFAULT 30,
  headers_json JSONB NULL,
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_integration_configs_tenant_key UNIQUE (tenant_id, integration_key)
);

CREATE INDEX IF NOT EXISTS idx_integration_configs_status ON integration_configs (status);

CREATE TABLE IF NOT EXISTS document_templates (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NULL REFERENCES tenants(id),
  template_key VARCHAR NOT NULL,
  language_code VARCHAR NOT NULL,
  template_type VARCHAR NOT NULL,
  version VARCHAR NOT NULL DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  title VARCHAR NOT NULL,
  document_code VARCHAR NULL,
  owner_department_code VARCHAR NULL REFERENCES departments(code),
  template_body TEXT NULL,
  renderer_hint VARCHAR NULL,
  metadata_json JSONB NULL,
  created_by VARCHAR NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_document_templates_tenant_key_lang_version UNIQUE (tenant_id, template_key, language_code, version)
);

CREATE INDEX IF NOT EXISTS idx_document_templates_lookup
  ON document_templates (template_key, language_code, template_type, is_active);

CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NULL REFERENCES tenants(id),
  setting_scope VARCHAR NOT NULL DEFAULT 'system',
  setting_key VARCHAR NOT NULL,
  value_json JSONB NOT NULL,
  description VARCHAR NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_system_settings_tenant_key UNIQUE (tenant_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_scope_key ON system_settings (setting_scope, setting_key);

INSERT INTO system_settings (id, tenant_id, setting_scope, setting_key, value_json, description, is_active)
SELECT 'setting_default_language', NULL, 'system', 'default_language', '"ar"'::jsonb, 'Default system language', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE tenant_id IS NULL AND setting_key = 'default_language');

INSERT INTO system_settings (id, tenant_id, setting_scope, setting_key, value_json, description, is_active)
SELECT 'setting_supported_languages', NULL, 'system', 'supported_languages', '["ar","en"]'::jsonb, 'Supported language codes', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE tenant_id IS NULL AND setting_key = 'supported_languages');

INSERT INTO system_settings (id, tenant_id, setting_scope, setting_key, value_json, description, is_active)
SELECT 'setting_escalation_thresholds', NULL, 'system', 'escalation_thresholds', '{"legal_hours":24,"compliance_hours":24}'::jsonb, 'Escalation threshold policy', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE tenant_id IS NULL AND setting_key = 'escalation_thresholds');

INSERT INTO system_settings (id, tenant_id, setting_scope, setting_key, value_json, description, is_active)
SELECT 'setting_document_defaults', NULL, 'system', 'document_version_defaults', '{"default_version":"1.0"}'::jsonb, 'Document version defaults', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE tenant_id IS NULL AND setting_key = 'document_version_defaults');

INSERT INTO system_settings (id, tenant_id, setting_scope, setting_key, value_json, description, is_active)
SELECT 'setting_audit_retention', NULL, 'system', 'audit_retention', '{"retention_days":3650}'::jsonb, 'Audit retention policy in days', TRUE
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE tenant_id IS NULL AND setting_key = 'audit_retention');

ALTER TABLE IF EXISTS workflow_tasks
  ADD COLUMN IF NOT EXISTS assigned_department_code VARCHAR NULL REFERENCES departments(code),
  ADD COLUMN IF NOT EXISTS escalation_department_code VARCHAR NULL REFERENCES departments(code);

ALTER TABLE IF EXISTS assignment_rules
  ADD COLUMN IF NOT EXISTS target_department_code VARCHAR NULL REFERENCES departments(code),
  ADD COLUMN IF NOT EXISTS target_user_id VARCHAR NULL REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS escalation_department_code VARCHAR NULL REFERENCES departments(code),
  ADD COLUMN IF NOT EXISTS escalation_role_code VARCHAR NULL;

ALTER TABLE IF EXISTS workflow_notifications
  ADD COLUMN IF NOT EXISTS recipient_department_code VARCHAR NULL REFERENCES departments(code);

ALTER TABLE IF EXISTS workflow_audit_logs
  ADD COLUMN IF NOT EXISTS actor_role VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS actor_department_code VARCHAR NULL REFERENCES departments(code),
  ADD COLUMN IF NOT EXISTS actor_ip VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR NOT NULL DEFAULT 'workflow_case',
  ADD COLUMN IF NOT EXISTS entity_id VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS payload_summary TEXT NULL,
  ADD COLUMN IF NOT EXISTS previous_hash VARCHAR NOT NULL DEFAULT 'GENESIS',
  ADD COLUMN IF NOT EXISTS immutable_hash VARCHAR NULL;

UPDATE workflow_audit_logs
SET immutable_hash = md5(
  COALESCE(id, '') || '|' || COALESCE(event_type, '') || '|' || COALESCE(created_at::text, '')
)
WHERE immutable_hash IS NULL;

ALTER TABLE workflow_audit_logs
  ALTER COLUMN immutable_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_audit_logs_immutable_hash
  ON workflow_audit_logs (immutable_hash);

CREATE INDEX IF NOT EXISTS idx_workflow_audit_logs_entity
  ON workflow_audit_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_audit_logs_actor_department
  ON workflow_audit_logs (actor_department_code, created_at DESC);

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS department_code VARCHAR NULL REFERENCES departments(code);

CREATE INDEX IF NOT EXISTS idx_users_department_code ON users (department_code);

COMMIT;
