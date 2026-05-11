-- Migration 0021: Subscriber module access isolation control
-- Adds shared subscriber-module activation table for modular service separation.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriberModuleAccessStatus') THEN
    CREATE TYPE "SubscriberModuleAccessStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TRIAL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS subscriber_module_access (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  status "SubscriberModuleAccessStatus" NOT NULL DEFAULT 'INACTIVE',
  activated_by TEXT,
  activated_at TIMESTAMPTZ,
  deactivated_by TEXT,
  deactivated_at TIMESTAMPTZ,
  subscription_plan TEXT,
  expiry_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_subscriber_module_access_subscriber_module UNIQUE (subscriber_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_subscriber_module_access_subscriber_status
  ON subscriber_module_access (subscriber_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriber_module_access_module_status
  ON subscriber_module_access (module_key, status);

DO $$
DECLARE
  id_data_type TEXT;
  id_default TEXT;
BEGIN
  SELECT data_type, column_default
  INTO id_data_type, id_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'subscriber_module_access'
    AND column_name = 'id';

  IF id_data_type = 'text' AND id_default IS NULL THEN
    EXECUTE 'ALTER TABLE subscriber_module_access ALTER COLUMN id SET DEFAULT gen_random_uuid()::text';
  ELSIF id_data_type = 'uuid' AND id_default IS NULL THEN
    EXECUTE 'ALTER TABLE subscriber_module_access ALTER COLUMN id SET DEFAULT gen_random_uuid()';
  END IF;
END $$;

-- Backfill existing active tenants with ACTIVE status for current live modules.
INSERT INTO subscriber_module_access (
  subscriber_id,
  module_key,
  status,
  activated_at,
  created_at,
  updated_at,
  notes
)
SELECT
  t.id,
  m.module_key,
  CASE WHEN t.is_active THEN 'ACTIVE'::"SubscriberModuleAccessStatus" ELSE 'INACTIVE'::"SubscriberModuleAccessStatus" END,
  CASE WHEN t.is_active THEN NOW() ELSE NULL END,
  NOW(),
  NOW(),
  'Backfilled by migration 0021'
FROM tenants t
CROSS JOIN (
  VALUES
    ('informed-consents'),
    ('promissory-notes'),
    ('discharge-refusal')
) AS m(module_key)
ON CONFLICT (subscriber_id, module_key) DO NOTHING;
