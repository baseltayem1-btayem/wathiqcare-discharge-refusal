-- Migration: tenant auth configuration
-- Adds auth_config JSONB to tenants with secure defaults.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS auth_config JSONB NOT NULL DEFAULT '{"password_enabled": true, "microsoft_sso_enabled": false, "secure_link_enabled": false}'::jsonb;

UPDATE tenants
SET auth_config = COALESCE(auth_config, '{"password_enabled": true, "microsoft_sso_enabled": false, "secure_link_enabled": false}'::jsonb);
