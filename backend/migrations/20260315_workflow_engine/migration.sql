BEGIN;

ALTER TABLE IF EXISTS discharge_cases
  ADD COLUMN IF NOT EXISTS case_number VARCHAR UNIQUE,
  ADD COLUMN IF NOT EXISTS patient_name VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS mrn VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS room_number VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS department VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS attending_physician_user_id VARCHAR NULL REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS attending_physician_name VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS current_stage_code VARCHAR NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS discharge_decision_date TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS discharge_plan_summary TEXT NULL,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS refused_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS workflow_stages (
  id VARCHAR PRIMARY KEY,
  code VARCHAR NOT NULL UNIQUE,
  name_en VARCHAR NOT NULL,
  name_ar VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  sort_order INTEGER NOT NULL,
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_transitions (
  id VARCHAR PRIMARY KEY,
  from_stage_code VARCHAR NOT NULL,
  action_code VARCHAR NOT NULL,
  to_stage_code VARCHAR NOT NULL,
  requires_comment BOOLEAN NOT NULL DEFAULT FALSE,
  requires_role VARCHAR NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_from_action
  ON workflow_transitions (from_stage_code, action_code);

CREATE TABLE IF NOT EXISTS discharge_execution_items (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id) ON DELETE CASCADE,
  item_type VARCHAR NOT NULL,
  target_team_code VARCHAR NOT NULL,
  description TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discharge_execution_items_case
  ON discharge_execution_items (case_id);

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR NOT NULL REFERENCES discharge_cases(id) ON DELETE CASCADE,
  stage_code VARCHAR NOT NULL,
  task_code VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT NULL,
  assigned_user_id VARCHAR NULL REFERENCES users(id),
  assigned_team_code VARCHAR NULL,
  assigned_role_code VARCHAR NULL,
  status VARCHAR NOT NULL,
  priority VARCHAR NOT NULL,
  due_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  completed_by VARCHAR NULL REFERENCES users(id),
  escalation_level INTEGER NOT NULL DEFAULT 0,
  parent_task_id VARCHAR NULL REFERENCES workflow_tasks(id),
  metadata_json JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_tasks_case_stage ON workflow_tasks (case_id, stage_code);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_user ON workflow_tasks (assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_team ON workflow_tasks (assigned_team_code);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks (status);

CREATE TABLE IF NOT EXISTS workflow_notifications (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR NULL REFERENCES discharge_cases(id) ON DELETE CASCADE,
  task_id VARCHAR NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  recipient_user_id VARCHAR NULL REFERENCES users(id),
  recipient_email VARCHAR NULL,
  recipient_team_code VARCHAR NULL,
  channel VARCHAR NOT NULL,
  notification_type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR NOT NULL,
  sent_at TIMESTAMP NULL,
  read_at TIMESTAMP NULL,
  error_message TEXT NULL,
  metadata_json JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_notifications_case ON workflow_notifications (case_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_task ON workflow_notifications (task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_user ON workflow_notifications (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_team ON workflow_notifications (recipient_team_code);

CREATE TABLE IF NOT EXISTS workflow_audit_logs (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR NULL REFERENCES discharge_cases(id) ON DELETE CASCADE,
  task_id VARCHAR NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
  actor_user_id VARCHAR NULL REFERENCES users(id),
  event_type VARCHAR NOT NULL,
  event_title VARCHAR NOT NULL,
  event_details TEXT NULL,
  metadata_json JSONB NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_audit_logs_case ON workflow_audit_logs (case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_logs_task ON workflow_audit_logs (task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS assignment_rules (
  id VARCHAR PRIMARY KEY,
  rule_code VARCHAR NOT NULL UNIQUE,
  event_code VARCHAR NOT NULL,
  target_stage_code VARCHAR NULL,
  target_team_code VARCHAR NULL,
  target_role_code VARCHAR NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_rules_event_stage
  ON assignment_rules (event_code, target_stage_code);

COMMIT;
