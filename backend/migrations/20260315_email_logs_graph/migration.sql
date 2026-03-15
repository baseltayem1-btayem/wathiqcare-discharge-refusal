-- Email logs for Microsoft Graph outbound notifications

BEGIN;

CREATE TABLE IF NOT EXISTS email_logs (
  id VARCHAR PRIMARY KEY,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  case_id VARCHAR NULL REFERENCES discharge_cases(id),
  patient_id VARCHAR NULL REFERENCES patients(id),
  recipient_email TEXT NOT NULL,
  cc TEXT NULL,
  subject VARCHAR NOT NULL,
  template_name VARCHAR NULL,
  status VARCHAR NOT NULL,
  provider VARCHAR NOT NULL DEFAULT 'microsoft_graph',
  sent_at TIMESTAMP NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  error_message TEXT NULL,
  attachment_metadata TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_case ON email_logs (tenant_id, case_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs (created_at DESC);

COMMIT;
