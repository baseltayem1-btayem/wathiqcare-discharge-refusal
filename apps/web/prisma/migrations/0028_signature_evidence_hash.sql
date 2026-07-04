-- RC1 Gate 1.3B: Add signature evidence hash to consent signatures (non-destructive)
ALTER TABLE consent_document_signatures ADD COLUMN IF NOT EXISTS signature_hash TEXT;
