-- 0023_module_usage_events.sql
-- Tenant/module scoped analytics events for isolated application usage tracking.

CREATE TABLE IF NOT EXISTS module_usage_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL,
  module_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  document_id TEXT NULL,
  request_id TEXT NULL,
  correlation_id TEXT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT module_usage_events_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT module_usage_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS module_usage_events_id_key
  ON module_usage_events (id);

CREATE INDEX IF NOT EXISTS module_usage_events_tenant_module_occurred_idx
  ON module_usage_events (tenant_id, module_key, occurred_at DESC);

CREATE INDEX IF NOT EXISTS module_usage_events_tenant_module_action_idx
  ON module_usage_events (tenant_id, module_key, action_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS module_usage_events_tenant_user_occurred_idx
  ON module_usage_events (tenant_id, user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS module_usage_events_correlation_idx
  ON module_usage_events (correlation_id);

CREATE INDEX IF NOT EXISTS module_usage_events_request_idx
  ON module_usage_events (request_id);
