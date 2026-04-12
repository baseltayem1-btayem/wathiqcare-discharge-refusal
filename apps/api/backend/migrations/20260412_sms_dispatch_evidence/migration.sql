-- Migration: 20260412_sms_dispatch_evidence
-- Purpose: Add durable SMS evidence records for compliance/audit retrieval
-- Safety: additive table + additive indexes only

BEGIN;

CREATE TABLE IF NOT EXISTS sms_dispatch_records (
  id VARCHAR PRIMARY KEY,
  case_id VARCHAR NULL REFERENCES discharge_cases(id) ON DELETE SET NULL,
  document_id VARCHAR NULL,
  recipient_phone_masked VARCHAR NOT NULL,
  recipient_role VARCHAR NULL,
  event_type VARCHAR NOT NULL,
  message_template_key VARCHAR NULL,
  message_template_version VARCHAR NULL,
  provider VARCHAR NOT NULL DEFAULT 'taqnyat',
  provider_message_id VARCHAR NULL,
  provider_status VARCHAR NOT NULL,
  internal_status VARCHAR NOT NULL,
  content_hash VARCHAR NOT NULL,
  requested_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP WITHOUT TIME ZONE NULL,
  failed_at TIMESTAMP WITHOUT TIME ZONE NULL,
  failure_reason TEXT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  metadata_json JSONB NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_dispatch_records_case_id ON sms_dispatch_records(case_id);
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_records_document_id ON sms_dispatch_records(document_id);
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_records_event_type ON sms_dispatch_records(event_type);
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_records_internal_status ON sms_dispatch_records(internal_status);
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_records_provider_message_id ON sms_dispatch_records(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_records_content_hash ON sms_dispatch_records(content_hash);
CREATE INDEX IF NOT EXISTS idx_sms_dispatch_records_requested_at ON sms_dispatch_records(requested_at);

COMMIT;
