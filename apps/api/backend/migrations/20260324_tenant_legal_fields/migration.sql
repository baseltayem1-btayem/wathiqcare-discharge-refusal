BEGIN;

-- Add legal identity fields to the tenants table.
-- These fields are required for court-ready document generation
-- (header, footer, signature blocks) per Saudi MOH / CBAHI standards.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS logo_url      VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS moh_license   VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS cr_number     VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS city          VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS address       VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS po_box        VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS postal_code   VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR NULL;

COMMENT ON COLUMN tenants.logo_url      IS 'Tenant logo — URL or base64 data URI';
COMMENT ON COLUMN tenants.moh_license   IS 'Saudi Ministry of Health license number';
COMMENT ON COLUMN tenants.cr_number     IS 'Commercial Registration (CR) number';
COMMENT ON COLUMN tenants.city          IS 'City where the facility is located';
COMMENT ON COLUMN tenants.address       IS 'Full street / building address';
COMMENT ON COLUMN tenants.po_box        IS 'P.O. Box number';
COMMENT ON COLUMN tenants.postal_code   IS 'Postal/ZIP code';
COMMENT ON COLUMN tenants.contact_email IS 'Official contact e-mail address';
COMMENT ON COLUMN tenants.contact_phone IS 'Official contact phone number';

COMMIT;
