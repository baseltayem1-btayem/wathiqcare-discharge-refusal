BEGIN;

CREATE TABLE IF NOT EXISTS integration_connectors (
    id                        VARCHAR PRIMARY KEY,
    connector_key             VARCHAR NOT NULL UNIQUE,
    connector_name            VARCHAR NOT NULL UNIQUE,
    connection_url            VARCHAR NULL,
    auth_type                 VARCHAR NOT NULL DEFAULT 'none',
    auth_username             VARCHAR NULL,
    auth_password             VARCHAR NULL,
    auth_token                VARCHAR NULL,
    api_key                   VARCHAR NULL,
    enabled                   BOOLEAN NOT NULL DEFAULT FALSE,
    sync_interval_minutes     INTEGER NOT NULL DEFAULT 15,
    timeout_seconds           INTEGER NOT NULL DEFAULT 20,
    retry_count               INTEGER NOT NULL DEFAULT 1,
    retry_backoff_seconds     INTEGER NOT NULL DEFAULT 2,
    resource_set_json         JSONB NULL,
    metadata_json             JSONB NULL,
    last_health_status        VARCHAR NULL,
    last_health_checked_at    TIMESTAMP NULL,
    last_success_at           TIMESTAMP NULL,
    last_error                TEXT NULL,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_connector_key_not_empty CHECK (length(trim(connector_key)) > 0),
    CONSTRAINT chk_connector_name_not_empty CHECK (length(trim(connector_name)) > 0),
    CONSTRAINT chk_sync_interval_positive CHECK (sync_interval_minutes > 0),
    CONSTRAINT chk_timeout_positive CHECK (timeout_seconds > 0),
    CONSTRAINT chk_retry_nonnegative CHECK (retry_count >= 0),
    CONSTRAINT chk_retry_backoff_nonnegative CHECK (retry_backoff_seconds >= 0)
);

CREATE TABLE IF NOT EXISTS integration_runs (
    id                    VARCHAR PRIMARY KEY,
    connector_id          VARCHAR NOT NULL REFERENCES integration_connectors(id) ON DELETE CASCADE,
    connector_key         VARCHAR NOT NULL,
    connector_name        VARCHAR NOT NULL,
    run_type              VARCHAR NOT NULL DEFAULT 'scheduled',
    status                VARCHAR NOT NULL DEFAULT 'queued',
    started_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at          TIMESTAMP NULL,
    records_processed     INTEGER NOT NULL DEFAULT 0,
    records_created       INTEGER NOT NULL DEFAULT 0,
    records_updated       INTEGER NOT NULL DEFAULT 0,
    records_failed        INTEGER NOT NULL DEFAULT 0,
    error_summary         TEXT NULL,
    triggered_by          VARCHAR NULL,
    details_json          JSONB NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_run_type_valid CHECK (run_type IN ('scheduled', 'manual')),
    CONSTRAINT chk_run_status_valid CHECK (status IN ('queued', 'running', 'success', 'failed', 'partial_success', 'disabled')),
    CONSTRAINT chk_records_processed_nonnegative CHECK (records_processed >= 0),
    CONSTRAINT chk_records_created_nonnegative CHECK (records_created >= 0),
    CONSTRAINT chk_records_updated_nonnegative CHECK (records_updated >= 0),
    CONSTRAINT chk_records_failed_nonnegative CHECK (records_failed >= 0),
    CONSTRAINT chk_completed_after_started CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE IF NOT EXISTS integration_run_items (
    id                VARCHAR PRIMARY KEY,
    run_id            VARCHAR NOT NULL REFERENCES integration_runs(id) ON DELETE CASCADE,
    connector_key     VARCHAR NOT NULL,
    resource_type     VARCHAR NOT NULL,
    external_id       VARCHAR NULL,
    status            VARCHAR NOT NULL DEFAULT 'success',
    message           TEXT NULL,
    payload_json      JSONB NULL,
    processed_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_item_status_valid CHECK (status IN ('success', 'failed', 'skipped'))
);

CREATE TABLE IF NOT EXISTS integration_errors (
    id                VARCHAR PRIMARY KEY,
    connector_id      VARCHAR NOT NULL REFERENCES integration_connectors(id) ON DELETE CASCADE,
    run_id            VARCHAR NULL REFERENCES integration_runs(id) ON DELETE SET NULL,
    connector_key     VARCHAR NOT NULL,
    connector_name    VARCHAR NOT NULL,
    severity          VARCHAR NOT NULL DEFAULT 'error',
    code              VARCHAR NULL,
    message           TEXT NOT NULL,
    details           TEXT NULL,
    occurred_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at       TIMESTAMP NULL,
    CONSTRAINT chk_error_severity_valid CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    CONSTRAINT chk_error_resolved_after_occurred CHECK (resolved_at IS NULL OR resolved_at >= occurred_at)
);

CREATE TABLE IF NOT EXISTS integration_alert_logs (
    id               VARCHAR PRIMARY KEY,
    alert_type       VARCHAR NOT NULL,
    alert_key        VARCHAR NOT NULL,
    connector_key    VARCHAR NULL,
    severity         VARCHAR NOT NULL DEFAULT 'warning',
    status           VARCHAR NOT NULL DEFAULT 'pending',
    channel          VARCHAR NOT NULL DEFAULT 'internal',
    target           VARCHAR NULL,
    message          TEXT NOT NULL,
    error_message    TEXT NULL,
    payload_json     JSONB NULL,
    is_suppressed    BOOLEAN NOT NULL DEFAULT FALSE,
    triggered_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    notified_at      TIMESTAMP NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_alert_severity_valid CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    CONSTRAINT chk_alert_status_valid CHECK (status IN ('pending', 'sent', 'failed', 'suppressed', 'skipped')),
    CONSTRAINT chk_alert_notified_after_triggered CHECK (notified_at IS NULL OR notified_at >= triggered_at)
);

CREATE INDEX IF NOT EXISTS idx_integration_connectors_connector_key ON integration_connectors(connector_key);
CREATE INDEX IF NOT EXISTS idx_integration_connectors_enabled ON integration_connectors(enabled);

CREATE INDEX IF NOT EXISTS idx_integration_runs_connector_id ON integration_runs(connector_id);
CREATE INDEX IF NOT EXISTS idx_integration_runs_connector_key ON integration_runs(connector_key);
CREATE INDEX IF NOT EXISTS idx_integration_runs_status ON integration_runs(status);
CREATE INDEX IF NOT EXISTS idx_integration_runs_started_at_desc ON integration_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_run_items_run_id ON integration_run_items(run_id);
CREATE INDEX IF NOT EXISTS idx_integration_run_items_connector_key ON integration_run_items(connector_key);
CREATE INDEX IF NOT EXISTS idx_integration_run_items_processed_at_desc ON integration_run_items(processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_errors_connector_id ON integration_errors(connector_id);
CREATE INDEX IF NOT EXISTS idx_integration_errors_connector_key ON integration_errors(connector_key);
CREATE INDEX IF NOT EXISTS idx_integration_errors_run_id ON integration_errors(run_id);
CREATE INDEX IF NOT EXISTS idx_integration_errors_occurred_at_desc ON integration_errors(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_alert_logs_alert_type ON integration_alert_logs(alert_type);
CREATE INDEX IF NOT EXISTS idx_integration_alert_logs_alert_key ON integration_alert_logs(alert_key);
CREATE INDEX IF NOT EXISTS idx_integration_alert_logs_connector_key ON integration_alert_logs(connector_key);
CREATE INDEX IF NOT EXISTS idx_integration_alert_logs_status ON integration_alert_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_alert_logs_triggered_at_desc ON integration_alert_logs(triggered_at DESC);

CREATE TABLE IF NOT EXISTS integration_sla_breaches (
    id                VARCHAR PRIMARY KEY,
    connector_key     VARCHAR NOT NULL,
    breach_type       VARCHAR NOT NULL,
    severity          VARCHAR NOT NULL DEFAULT 'warning',
    status            VARCHAR NOT NULL DEFAULT 'open',
    message           TEXT NOT NULL,
    metric_value      DOUBLE PRECISION NULL,
    threshold_value   DOUBLE PRECISION NULL,
    details_json      JSONB NULL,
    alert_dispatched  BOOLEAN NOT NULL DEFAULT FALSE,
    detected_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at       TIMESTAMP NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sla_breach_type_valid CHECK (breach_type IN ('delayed_sync', 'high_failure_rate', 'max_queue_time')),
    CONSTRAINT chk_sla_severity_valid CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    CONSTRAINT chk_sla_status_valid CHECK (status IN ('open', 'resolved')),
    CONSTRAINT chk_sla_resolved_after_detected CHECK (resolved_at IS NULL OR resolved_at >= detected_at)
);

CREATE INDEX IF NOT EXISTS idx_integration_sla_breaches_connector_key ON integration_sla_breaches(connector_key);
CREATE INDEX IF NOT EXISTS idx_integration_sla_breaches_breach_type ON integration_sla_breaches(breach_type);
CREATE INDEX IF NOT EXISTS idx_integration_sla_breaches_status ON integration_sla_breaches(status);
CREATE INDEX IF NOT EXISTS idx_integration_sla_breaches_detected_at_desc ON integration_sla_breaches(detected_at DESC);

INSERT INTO integration_connectors (
    id,
    connector_key,
    connector_name,
    enabled,
    sync_interval_minutes,
    timeout_seconds,
    retry_count,
    retry_backoff_seconds,
    created_at,
    updated_at
) VALUES
    ('connector-epic-emr', 'epic_emr', 'Epic EMR', FALSE, 30, 30, 1, 2, NOW(), NOW()),
    ('connector-cerner-millennium', 'cerner_millennium', 'Cerner Millennium', FALSE, 30, 30, 1, 2, NOW(), NOW()),
    ('connector-legacy-system', 'legacy_system', 'Legacy System', FALSE, 60, 45, 1, 2, NOW(), NOW()),
    ('connector-fhir-integration', 'fhir_integration', 'FHIR Integration', FALSE, 15, 20, 1, 2, NOW(), NOW())
ON CONFLICT (connector_key) DO NOTHING;

COMMIT;
