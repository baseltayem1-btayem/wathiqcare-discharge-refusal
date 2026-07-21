-- Migration 0031: Conditional witness policy — human witness requirements
-- and witness signature evidence records.
-- Additive only. Safe to run multiple times.

-- ---------------------------------------------------------------------------
-- Witness requirement records (one independent record per required witness)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consent_witness_requirements (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  witness_index INT NOT NULL,
  required_role TEXT NOT NULL
    CHECK (required_role IN ('NURSING_REPRESENTATIVE','PATIENT_EXPERIENCE_REPRESENTATIVE')),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ASSIGNED','SIGNED','REVOKED')),
  policy_version TEXT NOT NULL,
  assigned_user_id TEXT,
  assigned_at TIMESTAMPTZ,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_consent_witness_requirements_doc_index
    UNIQUE (tenant_id, consent_document_id, witness_index)
);

CREATE INDEX IF NOT EXISTS idx_consent_witness_requirements_doc
  ON consent_witness_requirements (tenant_id, consent_document_id, status);

-- ---------------------------------------------------------------------------
-- Witness signature evidence records (independent of patient e-auth evidence)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consent_witness_signatures (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  consent_document_id TEXT NOT NULL REFERENCES consent_documents(id) ON DELETE CASCADE,
  witness_requirement_id TEXT NOT NULL REFERENCES consent_witness_requirements(id) ON DELETE RESTRICT,
  witness_user_id TEXT NOT NULL,
  employee_id TEXT,
  witness_role TEXT NOT NULL
    CHECK (witness_role IN ('NURSING_REPRESENTATIVE','PATIENT_EXPERIENCE_REPRESENTATIVE')),
  department TEXT,
  attestation_version TEXT NOT NULL,
  signature_id TEXT NOT NULL,
  authentication_reference TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL,
  signed_at_ksa TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  ip_hash TEXT,
  user_agent_hash TEXT,
  audit_event_id TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_consent_witness_signatures_tenant_idempotency
    UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT uq_consent_witness_signatures_requirement
    UNIQUE (witness_requirement_id)
);

CREATE INDEX IF NOT EXISTS idx_consent_witness_signatures_doc
  ON consent_witness_signatures (tenant_id, consent_document_id);
