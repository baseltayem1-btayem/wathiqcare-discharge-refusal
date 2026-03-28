-- Discharge Refusal MVP Schema Migration
-- Adds/extends discharge_refusal case model and escalation fields

BEGIN;

ALTER TABLE IF EXISTS discharge_cases
  ADD COLUMN IF NOT EXISTS type VARCHAR DEFAULT 'discharge_refusal',
  ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS escalation_due_2h TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS escalation_due_6h TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS escalation_due_24h TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP NULL;

-- Add/extend indexes for escalation fields if needed
CREATE INDEX IF NOT EXISTS idx_discharge_cases_escalation_due_2h ON discharge_cases (escalation_due_2h);
CREATE INDEX IF NOT EXISTS idx_discharge_cases_escalation_due_6h ON discharge_cases (escalation_due_6h);
CREATE INDEX IF NOT EXISTS idx_discharge_cases_escalation_due_24h ON discharge_cases (escalation_due_24h);

COMMIT;

-- Down migration
-- To rollback, drop the columns (if safe)
-- (Manual review recommended before running down in production)
-- ALTER TABLE discharge_cases
--   DROP COLUMN IF EXISTS type,
--   DROP COLUMN IF EXISTS status,
--   DROP COLUMN IF EXISTS escalation_due_2h,
--   DROP COLUMN IF EXISTS escalation_due_6h,
--   DROP COLUMN IF EXISTS escalation_due_24h,
--   DROP COLUMN IF EXISTS escalated_at,
--   DROP COLUMN IF EXISTS closed_at;
