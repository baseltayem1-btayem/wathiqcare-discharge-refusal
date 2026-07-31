-- Migration 0030: Package 1 — Idempotency and duplicate prevention.
-- Additive only. Safe to run multiple times.
--
-- Compatibility note:
--   - Fresh deployments get UUID primary/foreign keys on signing tables and
--     TEXT status columns. Legacy deployments that already ran an earlier
--     version of this migration keep their existing table layout; only the
--     additive pieces (columns, checks, indexes) are applied.

-- ---------------------------------------------------------------------------
-- ConsentDocument idempotency columns
-- ---------------------------------------------------------------------------
ALTER TABLE consent_documents
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_fingerprint TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_consent_documents_tenant_idempotency_key
  ON consent_documents (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consent_documents_idempotency_key
  ON consent_documents (tenant_id, idempotency_key, idempotency_fingerprint);

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PatientMessageChannel') THEN
    CREATE TYPE "PatientMessageChannel" AS ENUM ('SMS', 'EMAIL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PatientMessageStatus') THEN
    CREATE TYPE "PatientMessageStatus" AS ENUM (
      'PENDING', 'CLAIMED', 'ACCEPTED', 'SENT', 'DELIVERED', 'FAILED', 'PERMANENT_FAILURE'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SigningSession table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  module_type TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  provider_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENT','PARTIALLY_SIGNED','COMPLETED','EXPIRED','REVOKED')),
  required_signers JSONB NOT NULL DEFAULT '[]',
  completed_signers JSONB NOT NULL DEFAULT '[]',
  signer_links JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  signed_pdf_key TEXT,
  initiated_by_id UUID NOT NULL,
  resend_count INT NOT NULL DEFAULT 0,
  last_resent_at TIMESTAMPTZ,
  idempotency_key TEXT,
  idempotency_fingerprint TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT signing_sessions_module_type_chk
    CHECK (module_type IN ('informed_consent', 'discharge_refusal', 'promissory_note'))
);

CREATE INDEX IF NOT EXISTS idx_signing_sessions_tenant_document
  ON signing_sessions (tenant_id, document_id);

CREATE INDEX IF NOT EXISTS idx_signing_sessions_tenant_document_status
  ON signing_sessions (tenant_id, document_id, status);

CREATE INDEX IF NOT EXISTS idx_signing_sessions_tenant_document_status_created
  ON signing_sessions (tenant_id, document_id, status, created_at);

-- New additive partial unique indexes with versioned names so we never replace legacy indexes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_signing_sessions_active_per_tenant_document_v1
  ON signing_sessions (tenant_id, document_id)
  WHERE status IN ('PENDING','SENT','PARTIALLY_SIGNED');

-- Reconcile an existing legacy signing_sessions table with all Package 1 columns.
ALTER TABLE signing_sessions
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT,
  ADD COLUMN IF NOT EXISTS resend_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_resent_at TIMESTAMPTZ;

-- Real unique idempotency index (partial, ignoring NULL keys).
CREATE UNIQUE INDEX IF NOT EXISTS uq_signing_sessions_tenant_idempotency_key_v1
  ON signing_sessions (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- SigningSecureToken table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signing_secure_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  token TEXT UNIQUE,
  token_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_on_use TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signing_secure_tokens_tenant_session
  ON signing_secure_tokens (tenant_id, session_id);

CREATE INDEX IF NOT EXISTS idx_signing_secure_tokens_hash
  ON signing_secure_tokens (token_hash)
  WHERE token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signing_secure_tokens_session_active
  ON signing_secure_tokens (session_id, revoked_at, used_at);

-- Additive column + validation checks for the new hash-only policy.
ALTER TABLE signing_secure_tokens
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_signing_secure_tokens_token_null'
      AND conrelid = 'signing_secure_tokens'::regclass
  ) THEN
    ALTER TABLE signing_secure_tokens
      ADD CONSTRAINT chk_signing_secure_tokens_token_null
      CHECK (token IS NULL) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_signing_secure_tokens_hash_not_null'
      AND conrelid = 'signing_secure_tokens'::regclass
  ) THEN
    ALTER TABLE signing_secure_tokens
      ADD CONSTRAINT chk_signing_secure_tokens_hash_not_null
      CHECK (token_hash IS NOT NULL) NOT VALID;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- PatientMessageDispatch outbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_message_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  signing_session_id UUID NOT NULL,
  channel "PatientMessageChannel" NOT NULL,
  idempotency_key TEXT NOT NULL,
  idempotency_fingerprint TEXT NOT NULL,
  recipient_hash TEXT NOT NULL,
  recipient_reference TEXT,
  status "PatientMessageStatus" NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  claimed_at TIMESTAMPTZ,
  claim_expires_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_message_id TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  metadata JSONB,

  CONSTRAINT uq_patient_message_dispatch_tenant_session_channel_key
    UNIQUE (tenant_id, signing_session_id, channel, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_patient_message_dispatches_tenant_status_next
  ON patient_message_dispatches (tenant_id, status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_patient_message_dispatches_tenant_session_channel
  ON patient_message_dispatches (tenant_id, signing_session_id, channel);


-- ---------------------------------------------------------------------------
-- Foreign keys (additive, NOT VALID, guarded for idempotent re-runs)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_signing_sessions_tenant_id'
      AND conrelid = 'signing_sessions'::regclass
  ) THEN
    ALTER TABLE signing_sessions
      ADD CONSTRAINT fk_signing_sessions_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_signing_sessions_document_id'
      AND conrelid = 'signing_sessions'::regclass
  ) THEN
    ALTER TABLE signing_sessions
      ADD CONSTRAINT fk_signing_sessions_document_id
      FOREIGN KEY (document_id) REFERENCES consent_documents(id)
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_signing_secure_tokens_session_id'
      AND conrelid = 'signing_secure_tokens'::regclass
  ) THEN
    ALTER TABLE signing_secure_tokens
      ADD CONSTRAINT fk_signing_secure_tokens_session_id
      FOREIGN KEY (session_id) REFERENCES signing_sessions(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_signing_secure_tokens_tenant_id'
      AND conrelid = 'signing_secure_tokens'::regclass
  ) THEN
    ALTER TABLE signing_secure_tokens
      ADD CONSTRAINT fk_signing_secure_tokens_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_patient_message_dispatches_tenant_id'
      AND conrelid = 'patient_message_dispatches'::regclass
  ) THEN
    ALTER TABLE patient_message_dispatches
      ADD CONSTRAINT fk_patient_message_dispatches_tenant_id
      FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_patient_message_dispatches_signing_session_id'
      AND conrelid = 'patient_message_dispatches'::regclass
  ) THEN
    ALTER TABLE patient_message_dispatches
      ADD CONSTRAINT fk_patient_message_dispatches_signing_session_id
      FOREIGN KEY (signing_session_id) REFERENCES signing_sessions(id)
      NOT VALID;
  END IF;
END $$;
