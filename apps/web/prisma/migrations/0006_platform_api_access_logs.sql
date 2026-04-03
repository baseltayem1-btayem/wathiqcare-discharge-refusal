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
