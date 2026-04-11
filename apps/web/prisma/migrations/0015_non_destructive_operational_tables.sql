-- Migration 0015: Non-destructive backfill for operational workflow tables.
-- Purpose: create only missing Prisma-mapped tables/enums without dropping data.
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationChannel') THEN
    CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationStatus') THEN
    CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS equipment_requests (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  discharge_refusal_case_id TEXT NOT NULL REFERENCES discharge_refusal_cases(id) ON DELETE CASCADE,
  requested_equipment TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_doc_path TEXT,
  temporary_approval_doc_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_requests_tenant_case
  ON equipment_requests (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS transfer_requests (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  discharge_refusal_case_id TEXT NOT NULL REFERENCES discharge_refusal_cases(id) ON DELETE CASCADE,
  receiving_hospital TEXT NOT NULL,
  transfer_reason TEXT NOT NULL,
  medical_stability_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  authorization_doc_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_tenant_case
  ON transfer_requests (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS patient_financial_liability (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  discharge_refusal_case_id TEXT NOT NULL REFERENCES discharge_refusal_cases(id) ON DELETE CASCADE,
  notice_doc_path TEXT,
  accepted BOOLEAN NOT NULL DEFAULT FALSE,
  signed_at TIMESTAMPTZ,
  signature_method TEXT,
  signature_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_financial_liability_tenant_case
  ON patient_financial_liability (tenant_id, case_id);

CREATE TABLE IF NOT EXISTS case_assignment_history (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  from_user_id TEXT,
  to_user_id TEXT,
  from_department "OperationDepartment",
  to_department "OperationDepartment" NOT NULL,
  reason TEXT,
  reassigned_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reassigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_assignment_history_tenant_case_reassigned
  ON case_assignment_history (tenant_id, case_id, reassigned_at);

CREATE INDEX IF NOT EXISTS idx_case_assignment_history_tenant_department_reassigned
  ON case_assignment_history (tenant_id, to_department, reassigned_at);

CREATE TABLE IF NOT EXISTS case_step_events (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  step_code TEXT NOT NULL,
  stage_code TEXT NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_department "OperationDepartment",
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_step_events_tenant_case_created
  ON case_step_events (tenant_id, case_id, created_at);

CREATE INDEX IF NOT EXISTS idx_case_step_events_tenant_stage_created
  ON case_step_events (tenant_id, stage_code, created_at);

CREATE TABLE IF NOT EXISTS operation_notifications (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  triggered_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  channel "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operation_notifications_tenant_recipient_read
  ON operation_notifications (tenant_id, recipient_user_id, read_at);

CREATE INDEX IF NOT EXISTS idx_operation_notifications_tenant_case_created
  ON operation_notifications (tenant_id, case_id, created_at);

CREATE INDEX IF NOT EXISTS idx_operation_notifications_tenant_event_created
  ON operation_notifications (tenant_id, event_type, created_at);

CREATE TABLE IF NOT EXISTS department_sla_configs (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department "OperationDepartment" NOT NULL,
  step_code TEXT NOT NULL,
  target_minutes INTEGER NOT NULL DEFAULT 240,
  warn_before_minutes INTEGER NOT NULL DEFAULT 60,
  escalate_after_minutes INTEGER NOT NULL DEFAULT 0,
  escalation_department "OperationDepartment",
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_department_sla_configs UNIQUE (tenant_id, department, step_code)
);

CREATE INDEX IF NOT EXISTS idx_department_sla_configs_tenant_department_active
  ON department_sla_configs (tenant_id, department, is_active);
