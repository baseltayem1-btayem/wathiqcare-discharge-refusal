-- Migration 0014: Production backfill for legacy missing tables.
-- Idempotent by design (safe to run multiple times).

-- 1) Core tables previously reported missing in production

CREATE TABLE IF NOT EXISTS discharge_refusal_cases (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  discharge_status TEXT NOT NULL,
  discharge_alternative TEXT,
  rights_acknowledgment_doc_path TEXT,
  refusal_form_doc_path TEXT,
  signature_method TEXT,
  signature_timestamp TIMESTAMPTZ,
  signature_device TEXT,
  signature_ip_address TEXT,
  signature_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drc_tenant_case
  ON discharge_refusal_cases (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS tenant_branding (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  display_name TEXT NULL,
  legal_name TEXT NULL,
  license_number TEXT NULL,
  commercial_registration_number TEXT NULL,
  tax_number TEXT NULL,
  contact_email TEXT NULL,
  contact_phone TEXT NULL,
  address_line1 TEXT NULL,
  address_line2 TEXT NULL,
  city TEXT NULL,
  country TEXT NULL,
  postal_code TEXT NULL,
  website_url TEXT NULL,
  logo_url TEXT NULL,
  document_header_text TEXT NULL,
  document_footer_text TEXT NULL,
  legal_disclaimer TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant_id
  ON tenant_branding(tenant_id);

CREATE TABLE IF NOT EXISTS platform_api_access_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NULL,
  email TEXT NULL,
  role TEXT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_api_access_logs_created_at
  ON platform_api_access_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_api_access_logs_endpoint
  ON platform_api_access_logs (endpoint);

CREATE INDEX IF NOT EXISTS idx_platform_api_access_logs_result
  ON platform_api_access_logs (result);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_tenant_active
  ON departments (tenant_id, is_active);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_chain_events') THEN
    CREATE TABLE audit_chain_events (
      id VARCHAR PRIMARY KEY,
      tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      case_id VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
      event_type VARCHAR NOT NULL,
      actor_id VARCHAR,
      actor_role VARCHAR,
      source_ip VARCHAR,
      device_info VARCHAR,
      session_info VARCHAR,
      previous_hash VARCHAR,
      current_hash VARCHAR NOT NULL UNIQUE,
      payload_summary VARCHAR NOT NULL,
      document_version VARCHAR,
      metadata_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_audit_chain_events_case ON audit_chain_events(tenant_id, case_id, created_at ASC);
  END IF;
END $$;

-- 2) Operational tracker table that some production dashboards query.
-- Enum types are created only when missing.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperationDepartment') THEN
    CREATE TYPE "OperationDepartment" AS ENUM (
      'PHARMACY',
      'NURSING',
      'LEGAL',
      'LABORATORY',
      'RADIOLOGY',
      'CASE_MANAGEMENT',
      'PATIENT_RELATIONS',
      'BILLING_INSURANCE',
      'ADMIN_MEDICAL_DIRECTOR'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperationPriority') THEN
    CREATE TYPE "OperationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SlaState') THEN
    CREATE TYPE "SlaState" AS ENUM ('ON_TRACK', 'AT_RISK', 'BREACHED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EscalationLevel') THEN
    CREATE TYPE "EscalationLevel" AS ENUM ('NONE', 'SUPERVISOR', 'MANAGER', 'DIRECTOR');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS case_operation_states (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL DEFAULT 'CASE_CREATED',
  current_step TEXT NOT NULL DEFAULT 'case_created',
  assigned_to_user_id TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_department "OperationDepartment" NOT NULL DEFAULT 'CASE_MANAGEMENT',
  assignment_timestamp TIMESTAMPTZ NULL,
  waiting_time_minutes INTEGER NOT NULL DEFAULT 0,
  priority "OperationPriority" NOT NULL DEFAULT 'NORMAL',
  sla_deadline TIMESTAMPTZ NULL,
  sla_state "SlaState" NOT NULL DEFAULT 'ON_TRACK',
  escalation_level "EscalationLevel" NOT NULL DEFAULT 'NONE',
  last_action_at TIMESTAMPTZ NULL,
  last_action_by_user_id TEXT NULL,
  completed_steps_count INTEGER NOT NULL DEFAULT 0,
  total_steps_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_operation_states_dept_sla
  ON case_operation_states (tenant_id, assigned_department, sla_state);

CREATE INDEX IF NOT EXISTS idx_case_operation_states_assigned
  ON case_operation_states (tenant_id, assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_case_operation_states_priority_status
  ON case_operation_states (tenant_id, priority, status);
