-- Consent Collaboration Team
-- Stores default clinical collaboration recipients per tenant/department.

CREATE TABLE IF NOT EXISTS "consent_collaboration_teams" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "department_name" TEXT NOT NULL DEFAULT 'General',
  "anesthesiologist_user_id" TEXT,
  "surgeon_user_id" TEXT,
  "nursing_user_id" TEXT,
  "legal_reviewer_user_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "consent_collaboration_teams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "consent_collaboration_teams_tenant_department_key"
ON "consent_collaboration_teams"("tenant_id", "department_name");

CREATE INDEX IF NOT EXISTS "consent_collaboration_teams_tenant_active_idx"
ON "consent_collaboration_teams"("tenant_id", "is_active");