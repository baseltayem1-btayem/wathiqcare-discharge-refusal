-- SaaS foundation migration for PostgreSQL
-- Incremental and compatibility-safe for existing SQLAlchemy string-id tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanCode') THEN
    CREATE TYPE "PlanCode" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingInterval') THEN
    CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipRole') THEN
    CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'BILLING', 'MEMBER', 'VIEWER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MembershipStatus') THEN
    CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvitationStatus') THEN
    CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseStatus') THEN
    CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'ARCHIVED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseType') THEN
    CREATE TYPE "CaseType" AS ENUM ('GENERAL', 'DISCHARGE_REFUSAL');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentType') THEN
    CREATE TYPE "DocumentType" AS ENUM ('CASE_FILE', 'DISCHARGE_REFUSAL_FORM', 'FINANCIAL_RESPONSIBILITY_NOTICE', 'OTHER');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
    CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'GENERATED', 'SIGNED', 'ARCHIVED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UsageMetric') THEN
    CREATE TYPE "UsageMetric" AS ENUM ('ACTIVE_USERS', 'CASES', 'DOCUMENTS', 'STORAGE_BYTES', 'API_REQUESTS');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceStatus') THEN
    CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionEventType') THEN
    CREATE TYPE "SubscriptionEventType" AS ENUM (
      'CREATED',
      'UPDATED',
      'RENEWED',
      'CANCELED',
      'PAST_DUE',
      'PLAN_CHANGED',
      'SEAT_CHANGED',
      'PAYMENT_FAILED',
      'PAYMENT_SUCCEEDED'
    );
  END IF;
END $$;

-- Core tables may already exist from SQLAlchemy init flow.
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  domain TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  hashed_password TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Existing table hardening for compatibility with SQLAlchemy runtime.
ALTER TABLE IF EXISTS tenants
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS audit_logs
  ADD COLUMN IF NOT EXISTS case_id TEXT,
  ADD COLUMN IF NOT EXISTS document_id TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS metadata_json JSONB;

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code "PlanCode" NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER NOT NULL DEFAULT 0,
  seat_limit INTEGER NOT NULL DEFAULT 5,
  features JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  billing_interval "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  seat_limit INTEGER NOT NULL DEFAULT 5,
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  metadata JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE TABLE IF NOT EXISTS tenant_memberships (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role "MembershipRole" NOT NULL,
  status "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_status ON tenant_memberships(tenant_id, status);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role "MembershipRole" NOT NULL,
  status "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_tenant_status ON invitations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_number TEXT,
  case_type "CaseType" NOT NULL DEFAULT 'GENERAL',
  title TEXT,
  status "CaseStatus" NOT NULL DEFAULT 'OPEN',
  workflow_type TEXT,
  patient_name TEXT,
  patient_id_number TEXT,
  medical_record_no TEXT,
  room_number TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  metadata JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, case_number)
);

CREATE INDEX IF NOT EXISTS idx_cases_tenant_status ON cases(tenant_id, status);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  document_type "DocumentType" NOT NULL,
  status "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  document_code TEXT,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  template_key TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT,
  preview_html TEXT,
  payload_json JSONB NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  generated_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  signed_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_type ON documents(tenant_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_case_id'
  ) THEN
    ALTER TABLE IF EXISTS audit_logs
      ADD CONSTRAINT fk_audit_logs_case_id FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_document_id'
  ) THEN
    ALTER TABLE IF EXISTS audit_logs
      ADD CONSTRAINT fk_audit_logs_document_id FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric "UsageMetric" NOT NULL,
  value BIGINT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'count',
  period_date DATE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE (tenant_id, metric, period_date)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_tenant_recorded ON usage_records(tenant_id, recorded_at);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  amount_due_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  external_invoice_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);

CREATE TABLE IF NOT EXISTS subscription_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  event_type "SubscriptionEventType" NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_user_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Normalize legacy snake_case enum columns (from earlier SQL iterations)
-- to Prisma enum type names expected by the generated client.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'code' AND udt_name = 'plan_code_enum'
  ) THEN
    ALTER TABLE plans
      ALTER COLUMN code TYPE "PlanCode" USING code::text::"PlanCode";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'status' AND udt_name = 'subscription_status_enum'
  ) THEN
    ALTER TABLE subscriptions
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE "SubscriptionStatus" USING status::text::"SubscriptionStatus",
      ALTER COLUMN status SET DEFAULT 'TRIALING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'billing_interval' AND udt_name = 'billing_interval_enum'
  ) THEN
    ALTER TABLE subscriptions
      ALTER COLUMN billing_interval DROP DEFAULT,
      ALTER COLUMN billing_interval TYPE "BillingInterval" USING billing_interval::text::"BillingInterval",
      ALTER COLUMN billing_interval SET DEFAULT 'MONTHLY';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_memberships' AND column_name = 'role' AND udt_name = 'membership_role_enum'
  ) THEN
    ALTER TABLE tenant_memberships
      ALTER COLUMN role TYPE "MembershipRole" USING role::text::"MembershipRole";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_memberships' AND column_name = 'status' AND udt_name = 'membership_status_enum'
  ) THEN
    ALTER TABLE tenant_memberships
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE "MembershipStatus" USING status::text::"MembershipStatus",
      ALTER COLUMN status SET DEFAULT 'ACTIVE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'role' AND udt_name = 'membership_role_enum'
  ) THEN
    ALTER TABLE invitations
      ALTER COLUMN role TYPE "MembershipRole" USING role::text::"MembershipRole";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invitations' AND column_name = 'status' AND udt_name = 'invitation_status_enum'
  ) THEN
    ALTER TABLE invitations
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE "InvitationStatus" USING status::text::"InvitationStatus",
      ALTER COLUMN status SET DEFAULT 'PENDING';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'case_type' AND udt_name = 'case_type_enum'
  ) THEN
    ALTER TABLE cases
      ALTER COLUMN case_type DROP DEFAULT,
      ALTER COLUMN case_type TYPE "CaseType" USING case_type::text::"CaseType",
      ALTER COLUMN case_type SET DEFAULT 'GENERAL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'status' AND udt_name = 'case_status_enum'
  ) THEN
    ALTER TABLE cases
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE "CaseStatus" USING status::text::"CaseStatus",
      ALTER COLUMN status SET DEFAULT 'OPEN';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'document_type' AND udt_name = 'document_type_enum'
  ) THEN
    ALTER TABLE documents
      ALTER COLUMN document_type TYPE "DocumentType" USING document_type::text::"DocumentType";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'status' AND udt_name = 'document_status_enum'
  ) THEN
    ALTER TABLE documents
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE "DocumentStatus" USING status::text::"DocumentStatus",
      ALTER COLUMN status SET DEFAULT 'DRAFT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usage_records' AND column_name = 'metric' AND udt_name = 'usage_metric_enum'
  ) THEN
    ALTER TABLE usage_records
      ALTER COLUMN metric TYPE "UsageMetric" USING metric::text::"UsageMetric";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'status' AND udt_name = 'invoice_status_enum'
  ) THEN
    ALTER TABLE invoices
      ALTER COLUMN status DROP DEFAULT,
      ALTER COLUMN status TYPE "InvoiceStatus" USING status::text::"InvoiceStatus",
      ALTER COLUMN status SET DEFAULT 'DRAFT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscription_events' AND column_name = 'event_type' AND udt_name = 'subscription_event_type_enum'
  ) THEN
    ALTER TABLE subscription_events
      ALTER COLUMN event_type TYPE "SubscriptionEventType" USING event_type::text::"SubscriptionEventType";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant_occurred ON subscription_events(tenant_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription ON subscription_events(subscription_id);
