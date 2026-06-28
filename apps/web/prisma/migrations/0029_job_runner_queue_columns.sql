-- Add queue locking / retry columns required by the module background-jobs runner.
-- These columns are omitted from the Prisma schema because webhook_events is
-- managed via raw SQL; the runner uses raw queries.

ALTER TABLE webhook_events
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_we_unprocessed_locked
  ON webhook_events (processed, locked_until, received_at)
  WHERE processed = FALSE;
