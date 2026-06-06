-- Consent Collaboration Timeline
-- Extends existing case_step_events for consent-based communication, tasks, mentions, and audit-friendly timeline.

ALTER TABLE "case_step_events"
ADD COLUMN IF NOT EXISTS "communication_type" TEXT NOT NULL DEFAULT 'NOTE',
ADD COLUMN IF NOT EXISTS "message" TEXT,
ADD COLUMN IF NOT EXISTS "mentioned_user_id" TEXT,
ADD COLUMN IF NOT EXISTS "task_status" TEXT,
ADD COLUMN IF NOT EXISTS "visibility" TEXT NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS "due_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "idx_case_step_events_communication_type"
ON "case_step_events"("tenant_id", "communication_type", "created_at");

CREATE INDEX IF NOT EXISTS "idx_case_step_events_mentions_tasks"
ON "case_step_events"("tenant_id", "mentioned_user_id", "task_status");
