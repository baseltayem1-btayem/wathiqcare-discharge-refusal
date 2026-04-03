BEGIN;

CREATE TABLE IF NOT EXISTS secure_discharge_links (
    id                VARCHAR      PRIMARY KEY,
    tenant_id         VARCHAR      NOT NULL REFERENCES tenants(id),
    case_id           VARCHAR      NOT NULL REFERENCES discharge_cases(id),
    created_by        VARCHAR      NOT NULL REFERENCES users(id),
    recipient_email   VARCHAR      NOT NULL,
    token_hash        VARCHAR      NOT NULL UNIQUE,
    expires_at        TIMESTAMP    NOT NULL,
    sent_via          VARCHAR      NOT NULL DEFAULT 'email',
    delivery_status   VARCHAR      NOT NULL DEFAULT 'pending',
    accessed_at       TIMESTAMP    NULL,
    revoked_at        TIMESTAMP    NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sdl_case_id    ON secure_discharge_links (case_id);
CREATE INDEX IF NOT EXISTS idx_sdl_tenant_id  ON secure_discharge_links (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sdl_token_hash ON secure_discharge_links (token_hash);

COMMIT;
