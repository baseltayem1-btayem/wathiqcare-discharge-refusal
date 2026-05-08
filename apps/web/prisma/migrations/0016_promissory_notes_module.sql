-- Migration 0016: Add production persistence for electronic promissory notes module.
-- Safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PromissoryNoteStatus') THEN
    CREATE TYPE "PromissoryNoteStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SETTLED', 'VOID', 'OVERDUE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS promissory_notes (
  id TEXT NOT NULL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  note_number TEXT NOT NULL,
  debtor_name TEXT NOT NULL,
  debtor_id_number TEXT,
  issuer_name TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  due_date TIMESTAMPTZ NOT NULL,
  status "PromissoryNoteStatus" NOT NULL DEFAULT 'DRAFT',
  signed_at TIMESTAMPTZ,
  document_version TEXT,
  document_hash TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_promissory_notes_tenant_note_number UNIQUE (tenant_id, note_number)
);

CREATE INDEX IF NOT EXISTS idx_promissory_notes_tenant_case_created
  ON promissory_notes (tenant_id, case_id, created_at);

CREATE INDEX IF NOT EXISTS idx_promissory_notes_tenant_status_due
  ON promissory_notes (tenant_id, status, due_date);
