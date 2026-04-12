-- Rollback: 20260412_sms_dispatch_evidence
-- NOTE: destructive for SMS evidence history.

BEGIN;

DROP TABLE IF EXISTS sms_dispatch_records;

COMMIT;
