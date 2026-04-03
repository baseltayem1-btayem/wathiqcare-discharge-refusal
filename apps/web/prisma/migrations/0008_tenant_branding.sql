CREATE TABLE IF NOT EXISTS tenant_branding (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  display_name TEXT NULL,
  legal_name TEXT NULL,
  license_number TEXT NULL,
  commercial_registration_number TEXT NULL,
  tax_number TEXT NULL,
  contact_email TEXT NULL,
  contact_phone TEXT NULL,
  address_line1 TEXT NULL,
  address_line2 TEXT NULL,
  city TEXT NULL,
  country TEXT NULL,
  postal_code TEXT NULL,
  website_url TEXT NULL,
  logo_url TEXT NULL,
  document_header_text TEXT NULL,
  document_footer_text TEXT NULL,
  legal_disclaimer TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_tenant_id
  ON tenant_branding(tenant_id);
