-- Add optional metadata JSON column to ConsentForm to persist tenant-scoped
-- field-mapping verification status without affecting signature mappings.
ALTER TABLE "clinical_consent_forms"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;
