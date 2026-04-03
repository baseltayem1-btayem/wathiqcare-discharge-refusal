CREATE TABLE IF NOT EXISTS tenant_allowed_domains (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_tenant_allowed_domains_domain ON tenant_allowed_domains (domain);

-- Normalize any existing data and pre-seed allowed domains from tenant primary domain.
UPDATE tenant_allowed_domains
SET domain = lower(trim(domain));

INSERT INTO tenant_allowed_domains (id, tenant_id, domain, is_active)
SELECT t.id || ':' || lower(trim(t.domain)), t.id, lower(trim(t.domain)), TRUE
FROM tenants t
WHERE t.domain IS NOT NULL
  AND trim(t.domain) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM tenant_allowed_domains tad
    WHERE tad.tenant_id = t.id
      AND tad.domain = lower(trim(t.domain))
  );
