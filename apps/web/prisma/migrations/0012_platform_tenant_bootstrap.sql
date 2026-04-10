-- Migration: Platform tenant bootstrap
-- Adds is_platform flag to tenants table and upserts the WathiqCare platform tenant.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS is_platform BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tenants_is_platform ON tenants (is_platform) WHERE is_platform = TRUE;

INSERT INTO tenants (id, name, code, is_active, is_platform, created_at, updated_at)
VALUES (
  gen_random_uuid()::TEXT,
  'WathiqCare Platform',
  'wathiqcare',
  TRUE,
  TRUE,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO UPDATE
  SET
    is_platform = TRUE,
    updated_at  = NOW();
