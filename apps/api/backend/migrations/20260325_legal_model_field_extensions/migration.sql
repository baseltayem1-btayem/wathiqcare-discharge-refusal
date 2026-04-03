-- Migration: 20260325_legal_model_field_extensions
-- Purpose: Add proof-of-presentation fields to patient_notice_presentations,
--          extended identity fields to signer_identities,
--          and signature binding metadata to signature_artifacts
-- Safety: All ALTER TABLE ... ADD COLUMN IF NOT EXISTS — safe to re-run

BEGIN;

-- ─── patient_notice_presentations: proof-of-presentation hardening ───────────
ALTER TABLE patient_notice_presentations
  ADD COLUMN IF NOT EXISTS document_type VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS document_instance_id VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS presented_to_type VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS presented_to_name VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS presented_to_id_type VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS presented_to_id_number VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_view BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS witness_name VARCHAR NULL;

COMMENT ON COLUMN patient_notice_presentations.document_type
  IS 'Type of document presented: master_document, financial_ack, promissory_note, etc.';
COMMENT ON COLUMN patient_notice_presentations.presented_to_type
  IS 'Recipient category: patient, guardian, authorized_representative, family_member';
COMMENT ON COLUMN patient_notice_presentations.acknowledged_view
  IS 'Did the recipient formally acknowledge viewing the document?';

-- ─── signer_identities: extended legal-binding identity fields ───────────────
ALTER TABLE signer_identities
  ADD COLUMN IF NOT EXISTS arabic_full_name VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS nationality VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS address TEXT NULL,
  ADD COLUMN IF NOT EXISTS legal_capacity_indicator VARCHAR NULL,
  ADD COLUMN IF NOT EXISTS consent_confirmation_text_version VARCHAR NULL;

COMMENT ON COLUMN signer_identities.arabic_full_name
  IS 'Full legal name in Arabic script (for bilingual document embedding)';
COMMENT ON COLUMN signer_identities.legal_capacity_indicator
  IS 'Legal capacity status: competent, minor, guardian_required, incompetent';
COMMENT ON COLUMN signer_identities.consent_confirmation_text_version
  IS 'Version identifier of the consent text the signer acknowledged';

-- ─── signature_artifacts: binding metadata ───────────────────────────────────
ALTER TABLE signature_artifacts
  ADD COLUMN IF NOT EXISTS document_version VARCHAR NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS source_mode VARCHAR NOT NULL DEFAULT 'tablet',
  ADD COLUMN IF NOT EXISTS witness_id VARCHAR NULL REFERENCES signer_identities(id);

COMMENT ON COLUMN signature_artifacts.source_mode
  IS 'How the signature was captured: tablet, paper_scan, remote, witnessed_verbal';
COMMENT ON COLUMN signature_artifacts.witness_id
  IS 'FK to the signer_identity of the witness who observed the signing event';

COMMIT;
