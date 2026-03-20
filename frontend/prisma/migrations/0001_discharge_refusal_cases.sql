-- Migration: Create discharge_refusal_cases table if missing
-- Run this against the deployed database: psql $DATABASE_URL -f this_file.sql

CREATE TABLE IF NOT EXISTS discharge_refusal_cases (
    id                              TEXT        NOT NULL PRIMARY KEY,
    tenant_id                       TEXT        NOT NULL,
    case_id                         TEXT        NOT NULL,
    discharge_status                TEXT        NOT NULL,
    discharge_alternative           TEXT,
    rights_acknowledgment_doc_path  TEXT,
    refusal_form_doc_path           TEXT,
    signature_method                TEXT,
    signature_timestamp             TIMESTAMPTZ,
    signature_device                TEXT,
    signature_ip_address            TEXT,
    signature_hash                  TEXT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_drc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_drc_case   FOREIGN KEY (case_id)   REFERENCES cases(id)   ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_drc_tenant_case ON discharge_refusal_cases (tenant_id, case_id);
