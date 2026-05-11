-- 0022_feature_flag_overrides.sql
-- Persist feature flag overrides by scope (global, tenant, module)

DO $$ BEGIN
  CREATE TYPE "FeatureFlagScope" AS ENUM ('GLOBAL', 'TENANT', 'MODULE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "feature_flag_overrides" (
  "id" TEXT PRIMARY KEY,
  "scope" "FeatureFlagScope" NOT NULL,
  "scope_ref" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" BOOLEAN NOT NULL,
  "tenant_id" TEXT NULL,
  "module_key" TEXT NULL,
  "updated_by" TEXT NULL,
  "metadata" JSONB NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feature_flag_overrides_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "feature_flag_overrides"
  ADD COLUMN IF NOT EXISTS "scope" "FeatureFlagScope",
  ADD COLUMN IF NOT EXISTS "scope_ref" TEXT,
  ADD COLUMN IF NOT EXISTS "key" TEXT,
  ADD COLUMN IF NOT EXISTS "value" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "tenant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "module_key" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_by" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feature_flag_overrides'
      AND column_name = 'scope_ref'
      AND data_type = 'uuid'
  ) THEN
    EXECUTE 'ALTER TABLE "feature_flag_overrides" ALTER COLUMN "scope_ref" TYPE TEXT USING "scope_ref"::text';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feature_flag_overrides'
      AND column_name = 'tenant_id'
      AND data_type = 'uuid'
  ) THEN
    EXECUTE 'ALTER TABLE "feature_flag_overrides" ALTER COLUMN "tenant_id" TYPE TEXT USING "tenant_id"::text';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'feature_flag_overrides'
      AND column_name = 'updated_by'
      AND data_type = 'uuid'
  ) THEN
    EXECUTE 'ALTER TABLE "feature_flag_overrides" ALTER COLUMN "updated_by" TYPE TEXT USING "updated_by"::text';
  END IF;
END $$;

UPDATE "feature_flag_overrides"
SET
  "scope" = COALESCE("scope", 'TENANT'::"FeatureFlagScope"),
  "scope_ref" = COALESCE("scope_ref", COALESCE("tenant_id", 'global')),
  "key" = COALESCE("key", 'PLACEHOLDER_FLAG'),
  "value" = COALESCE("value", FALSE)
WHERE "scope" IS NULL
   OR "scope_ref" IS NULL
   OR "key" IS NULL
   OR "value" IS NULL;

ALTER TABLE "feature_flag_overrides"
  ALTER COLUMN "scope" SET NOT NULL,
  ALTER COLUMN "scope_ref" SET NOT NULL,
  ALTER COLUMN "key" SET NOT NULL,
  ALTER COLUMN "value" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "feature_flag_overrides_scope_scope_ref_key_key"
  ON "feature_flag_overrides" ("scope", "scope_ref", "key");

CREATE INDEX IF NOT EXISTS "feature_flag_overrides_tenant_id_module_key_key_idx"
  ON "feature_flag_overrides" ("tenant_id", "module_key", "key");

CREATE OR REPLACE FUNCTION set_feature_flag_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feature_flag_overrides_updated_at ON "feature_flag_overrides";
CREATE TRIGGER trg_feature_flag_overrides_updated_at
BEFORE UPDATE ON "feature_flag_overrides"
FOR EACH ROW
EXECUTE PROCEDURE set_feature_flag_overrides_updated_at();
