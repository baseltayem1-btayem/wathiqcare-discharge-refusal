DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserType') THEN
        CREATE TYPE "UserType" AS ENUM ('PLATFORM_ADMIN', 'TENANT_ADMIN', 'TENANT_USER');
    END IF;
END
$$;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "user_type" "UserType" NOT NULL DEFAULT 'TENANT_USER';

UPDATE "users"
SET "user_type" = 'PLATFORM_ADMIN'
WHERE lower("email") = 'admin@wathiqcare.online'
   OR lower("role") IN ('platform_admin', 'platform_superadmin');

UPDATE "users"
SET "user_type" = 'TENANT_ADMIN'
WHERE "user_type" = 'TENANT_USER'
  AND lower("role") IN ('tenant_owner', 'tenant_admin', 'legal_admin', 'it_admin', 'medical_director', 'finance_officer');
