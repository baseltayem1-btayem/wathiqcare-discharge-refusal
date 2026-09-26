-- Migration 0031: Patient Journey Evidence, Audit and Outcome fields.
-- Forward-only, additive, idempotent. No destructive operations.

-- ---------------------------------------------------------------------------
-- Outcome enum
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsentSigningOutcome') THEN
    CREATE TYPE "ConsentSigningOutcome" AS ENUM (
      'PENDING',
      'CONSENTED',
      'REFUSED',
      'GUARDIAN_SIGNED',
      'WITHDRAWN'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- ConsentDocument: refusal, final PDF and patient-copy delivery tracking
-- ---------------------------------------------------------------------------
ALTER TABLE consent_documents
  ADD COLUMN IF NOT EXISTS outcome "ConsentSigningOutcome" DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS refusal_reason TEXT,
  ADD COLUMN IF NOT EXISTS refusal_risk_acknowledged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS final_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS final_pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS patient_copy_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS patient_copy_delivery_status TEXT;

CREATE INDEX IF NOT EXISTS idx_consent_documents_outcome
  ON consent_documents (tenant_id, outcome);

-- ---------------------------------------------------------------------------
-- ConsentDocumentSignature: guardian/substitute-decision-maker support
-- ---------------------------------------------------------------------------
ALTER TABLE consent_document_signatures
  ADD COLUMN IF NOT EXISTS signer_relationship TEXT,
  ADD COLUMN IF NOT EXISTS authority_document_url TEXT,
  ADD COLUMN IF NOT EXISTS outcome "ConsentSigningOutcome" DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_consent_document_signatures_outcome
  ON consent_document_signatures (tenant_id, outcome);

-- ---------------------------------------------------------------------------
-- SigningSession: OTP state, link-open, final PDF and outcome
-- ---------------------------------------------------------------------------
ALTER TABLE signing_sessions
  ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS otp_challenge_id TEXT,
  ADD COLUMN IF NOT EXISTS link_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS final_pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS outcome "ConsentSigningOutcome" DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS idx_signing_sessions_outcome
  ON signing_sessions (tenant_id, outcome);

-- ---------------------------------------------------------------------------
-- ConsentEvidencePackage: link to signing session, outcome, delivery status
-- ---------------------------------------------------------------------------
ALTER TABLE consent_evidence_packages
  ADD COLUMN IF NOT EXISTS signing_session_id UUID,
  ADD COLUMN IF NOT EXISTS outcome "ConsentSigningOutcome" DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT;

CREATE INDEX IF NOT EXISTS idx_consent_evidence_packages_signing_session
  ON consent_evidence_packages (signing_session_id);

-- ---------------------------------------------------------------------------
-- EvidencePackage (v2): link to signing session, final PDF hash, outcome
-- ---------------------------------------------------------------------------
ALTER TABLE evidence_packages
  ADD COLUMN IF NOT EXISTS signing_session_id UUID,
  ADD COLUMN IF NOT EXISTS outcome "ConsentSigningOutcome" DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS final_pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS patient_copy_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS patient_copy_delivery_status TEXT;

CREATE INDEX IF NOT EXISTS idx_evidence_packages_signing_session
  ON evidence_packages (signing_session_id);

-- ---------------------------------------------------------------------------
-- Foreign keys (additive, NOT VALID, guarded for idempotent re-runs)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_consent_evidence_packages_signing_session_id'
      AND conrelid = 'consent_evidence_packages'::regclass
  ) THEN
    ALTER TABLE consent_evidence_packages
      ADD CONSTRAINT fk_consent_evidence_packages_signing_session_id
      FOREIGN KEY (signing_session_id) REFERENCES signing_sessions(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_evidence_packages_signing_session_id'
      AND conrelid = 'evidence_packages'::regclass
  ) THEN
    ALTER TABLE evidence_packages
      ADD CONSTRAINT fk_evidence_packages_signing_session_id
      FOREIGN KEY (signing_session_id) REFERENCES signing_sessions(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;
