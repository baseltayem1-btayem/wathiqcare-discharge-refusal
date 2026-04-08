-- Migration 0011: Saudi PDPL / Medico-Legal compliance foundation
-- Creates: data_residency_rules, tenant_security_settings, consent_records,
-- data_subject_requests, retention_policies, retention_actions,
-- legal_readiness_checks, audit_chain_events, security_incidents,
-- backup_jobs, backup_restore_tests, report_access_logs, privileged_access_logs

DO $$
BEGIN

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'data_residency_rules'
) THEN
    CREATE TABLE data_residency_rules (
        id                       VARCHAR PRIMARY KEY,
        tenant_id                VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data_type                VARCHAR NOT NULL,
        residency_scope          VARCHAR NOT NULL DEFAULT 'KSA_ONLY',
        hosting_region           VARCHAR NOT NULL DEFAULT 'saudi-arabia-riyadh',
        export_allowed           BOOLEAN NOT NULL DEFAULT FALSE,
        anonymization_required   BOOLEAN NOT NULL DEFAULT TRUE,
        notes                    TEXT,
        created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at               TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_data_residency_rules UNIQUE (tenant_id, data_type)
    );
    CREATE INDEX idx_data_residency_rules_scope ON data_residency_rules(tenant_id, residency_scope);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_security_settings'
) THEN
    CREATE TABLE tenant_security_settings (
        id                         VARCHAR PRIMARY KEY,
        tenant_id                  VARCHAR NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        mfa_required_for_admins    BOOLEAN NOT NULL DEFAULT TRUE,
        mfa_required_for_privileged BOOLEAN NOT NULL DEFAULT TRUE,
        privileged_step_up_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        enforce_ksa_residency      BOOLEAN NOT NULL DEFAULT TRUE,
        export_approval_required   BOOLEAN NOT NULL DEFAULT TRUE,
        session_timeout_minutes    INTEGER NOT NULL DEFAULT 30,
        allowed_analytics_region   VARCHAR,
        created_at                 TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at                 TIMESTAMP NOT NULL DEFAULT NOW()
    );
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'consent_records'
) THEN
    CREATE TABLE consent_records (
        id                   VARCHAR PRIMARY KEY,
        tenant_id            VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id              VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        processing_purpose   VARCHAR NOT NULL,
        lawful_basis         VARCHAR NOT NULL,
        consent_type         VARCHAR NOT NULL,
        consent_method       VARCHAR NOT NULL,
        consented_at         TIMESTAMP NOT NULL DEFAULT NOW(),
        document_id          VARCHAR,
        document_version     VARCHAR,
        document_hash        VARCHAR,
        witness_name         VARCHAR,
        otp_reference        VARCHAR,
        status               VARCHAR NOT NULL DEFAULT 'captured',
        metadata             JSONB,
        created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_consent_records_case ON consent_records(tenant_id, case_id, consented_at DESC);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'data_subject_requests'
) THEN
    CREATE TABLE data_subject_requests (
        id                    VARCHAR PRIMARY KEY,
        tenant_id             VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id               VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
        request_type          VARCHAR NOT NULL,
        status                VARCHAR NOT NULL DEFAULT 'REQUESTED',
        requester_name        VARCHAR NOT NULL,
        requester_id_number   VARCHAR,
        request_reason        TEXT,
        requested_at          TIMESTAMP NOT NULL DEFAULT NOW(),
        identity_verified_at  TIMESTAMP,
        legal_reviewed_at     TIMESTAMP,
        due_at                TIMESTAMP NOT NULL,
        extended_due_at       TIMESTAMP,
        extension_reason      TEXT,
        executed_at           TIMESTAMP,
        closed_at             TIMESTAMP,
        metadata              JSONB,
        created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_data_subject_requests_due ON data_subject_requests(tenant_id, status, due_at);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'retention_policies'
) THEN
    CREATE TABLE retention_policies (
        id                      VARCHAR PRIMARY KEY,
        tenant_id               VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        data_type               VARCHAR NOT NULL,
        record_category         VARCHAR NOT NULL,
        retention_years         INTEGER NOT NULL DEFAULT 10,
        legal_hold_required     BOOLEAN NOT NULL DEFAULT TRUE,
        requires_legal_approval BOOLEAN NOT NULL DEFAULT TRUE,
        auto_delete_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
        secure_deletion_standard VARCHAR NOT NULL DEFAULT 'crypto-shred',
        created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_retention_policies UNIQUE (tenant_id, record_category)
    );
    CREATE INDEX idx_retention_policies_type ON retention_policies(tenant_id, data_type);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'retention_actions'
) THEN
    CREATE TABLE retention_actions (
        id              VARCHAR PRIMARY KEY,
        tenant_id       VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id         VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
        policy_id       VARCHAR REFERENCES retention_policies(id) ON DELETE SET NULL,
        target_type     VARCHAR NOT NULL,
        target_id       VARCHAR NOT NULL,
        status          VARCHAR NOT NULL DEFAULT 'PENDING',
        hold_reason     TEXT,
        scheduled_for   TIMESTAMP NOT NULL,
        approved_at     TIMESTAMP,
        executed_at     TIMESTAMP,
        evidence_json   JSONB,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_retention_actions_due ON retention_actions(tenant_id, status, scheduled_for);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'legal_readiness_checks'
) THEN
    CREATE TABLE legal_readiness_checks (
        id                 VARCHAR PRIMARY KEY,
        tenant_id          VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id            VARCHAR NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        status             VARCHAR NOT NULL DEFAULT 'BLOCKED',
        can_finalize       BOOLEAN NOT NULL DEFAULT FALSE,
        checklist_json     JSONB NOT NULL,
        blockers_json      JSONB,
        checked_by_user_id VARCHAR,
        checked_at         TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_legal_readiness_checks_case ON legal_readiness_checks(tenant_id, case_id, checked_at DESC);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_chain_events'
) THEN
    CREATE TABLE audit_chain_events (
        id               VARCHAR PRIMARY KEY,
        tenant_id        VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id          VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
        event_type       VARCHAR NOT NULL,
        actor_id         VARCHAR,
        actor_role       VARCHAR,
        source_ip        VARCHAR,
        device_info      VARCHAR,
        session_info     VARCHAR,
        previous_hash    VARCHAR,
        current_hash     VARCHAR NOT NULL UNIQUE,
        payload_summary  VARCHAR NOT NULL,
        document_version VARCHAR,
        metadata_json    JSONB,
        created_at       TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_audit_chain_events_case ON audit_chain_events(tenant_id, case_id, created_at ASC);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'security_incidents'
) THEN
    CREATE TABLE security_incidents (
        id                          VARCHAR PRIMARY KEY,
        tenant_id                   VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id                     VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
        severity                    VARCHAR NOT NULL,
        status                      VARCHAR NOT NULL DEFAULT 'DETECTED',
        title                       VARCHAR NOT NULL,
        summary                     TEXT NOT NULL,
        affected_scope              VARCHAR,
        detected_at                 TIMESTAMP NOT NULL DEFAULT NOW(),
        triaged_at                  TIMESTAMP,
        contained_at                TIMESTAMP,
        remediated_at               TIMESTAMP,
        recovered_at                TIMESTAMP,
        closed_at                   TIMESTAMP,
        client_notification_due_at  TIMESTAMP,
        regulator_notification_due_at TIMESTAMP,
        evidence_json               JSONB,
        post_incident_review        TEXT,
        created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at                  TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_security_incidents_status ON security_incidents(tenant_id, severity, status);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_jobs'
) THEN
    CREATE TABLE backup_jobs (
        id                  VARCHAR PRIMARY KEY,
        tenant_id           VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        classification      VARCHAR NOT NULL DEFAULT 'BACKUP',
        backup_type         VARCHAR NOT NULL,
        storage_location    VARCHAR NOT NULL,
        region              VARCHAR NOT NULL DEFAULT 'saudi-arabia-riyadh',
        encrypted           BOOLEAN NOT NULL DEFAULT TRUE,
        status              VARCHAR NOT NULL DEFAULT 'SCHEDULED',
        started_at          TIMESTAMP,
        completed_at        TIMESTAMP,
        restore_verified_at TIMESTAMP,
        rpo_target_minutes  INTEGER NOT NULL DEFAULT 60,
        rto_target_minutes  INTEGER NOT NULL DEFAULT 240,
        evidence_json       JSONB,
        created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_backup_jobs_status ON backup_jobs(tenant_id, status, created_at DESC);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_restore_tests'
) THEN
    CREATE TABLE backup_restore_tests (
        id              VARCHAR PRIMARY KEY,
        tenant_id       VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        backup_job_id   VARCHAR REFERENCES backup_jobs(id) ON DELETE SET NULL,
        result_status   VARCHAR NOT NULL,
        executed_at     TIMESTAMP NOT NULL DEFAULT NOW(),
        rpo_minutes     INTEGER,
        rto_minutes     INTEGER,
        notes           TEXT,
        evidence_json   JSONB
    );
    CREATE INDEX idx_backup_restore_tests_executed ON backup_restore_tests(tenant_id, executed_at DESC);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'report_access_logs'
) THEN
    CREATE TABLE report_access_logs (
        id                 VARCHAR PRIMARY KEY,
        tenant_id          VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id            VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
        report_key         VARCHAR NOT NULL,
        filter_summary     VARCHAR,
        export_format      VARCHAR,
        accessed_by_user_id VARCHAR,
        accessed_by_role   VARCHAR,
        source_ip          VARCHAR,
        metadata_json      JSONB,
        accessed_at        TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_report_access_logs_report ON report_access_logs(tenant_id, report_key, accessed_at DESC);
END IF;

IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'privileged_access_logs'
) THEN
    CREATE TABLE privileged_access_logs (
        id               VARCHAR PRIMARY KEY,
        tenant_id        VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        case_id          VARCHAR REFERENCES cases(id) ON DELETE SET NULL,
        action_key       VARCHAR NOT NULL,
        reason           TEXT,
        actor_user_id    VARCHAR,
        actor_role       VARCHAR,
        access_channel   VARCHAR,
        step_up_verified BOOLEAN NOT NULL DEFAULT FALSE,
        result           VARCHAR NOT NULL DEFAULT 'allowed',
        ip_address       VARCHAR,
        metadata_json    JSONB,
        created_at       TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_privileged_access_logs_action ON privileged_access_logs(tenant_id, action_key, created_at DESC);
END IF;

END $$;