-- Migration 0010: Fallback notification system
-- Creates: dashboard_alerts, notification_delivery_attempts,
--          alert_acknowledgments, tenant_notification_settings

DO $$
BEGIN

-- ── dashboard_alerts ─────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'dashboard_alerts'
) THEN
    CREATE TABLE dashboard_alerts (
        id                  VARCHAR PRIMARY KEY,
        tenant_id           VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id             VARCHAR REFERENCES discharge_cases(id) ON DELETE SET NULL,
        alert_key           VARCHAR NOT NULL,
        alert_type          VARCHAR NOT NULL,
        severity            VARCHAR NOT NULL DEFAULT 'info',
        title               VARCHAR NOT NULL,
        message             TEXT    NOT NULL,
        case_deep_link      VARCHAR,
        is_acknowledged     BOOLEAN NOT NULL DEFAULT FALSE,
        acknowledged_by     VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        acknowledged_at     TIMESTAMP,
        created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata_json       JSONB
    );

    CREATE INDEX idx_dashboard_alerts_tenant   ON dashboard_alerts(tenant_id);
    CREATE INDEX idx_dashboard_alerts_case     ON dashboard_alerts(case_id);
    CREATE INDEX idx_dashboard_alerts_key      ON dashboard_alerts(alert_key);
    CREATE INDEX idx_dashboard_alerts_type     ON dashboard_alerts(alert_type);
    CREATE INDEX idx_dashboard_alerts_severity ON dashboard_alerts(severity);
    CREATE INDEX idx_dashboard_alerts_ack      ON dashboard_alerts(is_acknowledged);
    CREATE INDEX idx_dashboard_alerts_created  ON dashboard_alerts(created_at DESC);

    -- Prevent exact duplicate alerts per tenant+key
    CREATE UNIQUE INDEX uq_dashboard_alerts_key ON dashboard_alerts(tenant_id, alert_key);
END IF;

-- ── notification_delivery_attempts ───────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'notification_delivery_attempts'
) THEN
    CREATE TABLE notification_delivery_attempts (
        id                  VARCHAR PRIMARY KEY,
        tenant_id           VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id             VARCHAR REFERENCES discharge_cases(id) ON DELETE SET NULL,
        alert_id            VARCHAR REFERENCES dashboard_alerts(id) ON DELETE SET NULL,
        channel             VARCHAR NOT NULL,
        provider            VARCHAR,
        recipient           VARCHAR NOT NULL,
        notification_type   VARCHAR NOT NULL,
        status              VARCHAR NOT NULL DEFAULT 'pending',
        status_code         INTEGER,
        failure_reason      TEXT,
        attempted_at        TIMESTAMP NOT NULL DEFAULT NOW(),
        metadata_json       JSONB
    );

    CREATE INDEX idx_nda_tenant       ON notification_delivery_attempts(tenant_id);
    CREATE INDEX idx_nda_case         ON notification_delivery_attempts(case_id);
    CREATE INDEX idx_nda_alert        ON notification_delivery_attempts(alert_id);
    CREATE INDEX idx_nda_channel      ON notification_delivery_attempts(channel);
    CREATE INDEX idx_nda_status       ON notification_delivery_attempts(status);
    CREATE INDEX idx_nda_type         ON notification_delivery_attempts(notification_type);
    CREATE INDEX idx_nda_attempted_at ON notification_delivery_attempts(attempted_at DESC);
END IF;

-- ── alert_acknowledgments ────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'alert_acknowledgments'
) THEN
    CREATE TABLE alert_acknowledgments (
        id                VARCHAR PRIMARY KEY,
        alert_id          VARCHAR NOT NULL REFERENCES dashboard_alerts(id) ON DELETE CASCADE,
        tenant_id         VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        acknowledged_by   VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        acknowledged_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        note              TEXT
    );

    CREATE INDEX idx_alert_ack_alert  ON alert_acknowledgments(alert_id);
    CREATE INDEX idx_alert_ack_tenant ON alert_acknowledgments(tenant_id);
    CREATE INDEX idx_alert_ack_user   ON alert_acknowledgments(acknowledged_by);
END IF;

-- ── tenant_notification_settings ─────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'tenant_notification_settings'
) THEN
    CREATE TABLE tenant_notification_settings (
        id                                  VARCHAR PRIMARY KEY,
        tenant_id                           VARCHAR NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        email_enabled                       BOOLEAN NOT NULL DEFAULT TRUE,
        dashboard_enabled                   BOOLEAN NOT NULL DEFAULT TRUE,
        whatsapp_enabled                    BOOLEAN NOT NULL DEFAULT FALSE,
        whatsapp_sender_number              VARCHAR,
        legal_recipient_phones_json         JSONB,
        legal_recipient_emails_json         JSONB,
        compliance_recipient_emails_json    JSONB,
        notification_threshold_minutes      INTEGER NOT NULL DEFAULT 1440,
        escalation_threshold_minutes        INTEGER NOT NULL DEFAULT 2880,
        created_at                          TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at                          TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_tns_tenant ON tenant_notification_settings(tenant_id);
END IF;

END $$;
