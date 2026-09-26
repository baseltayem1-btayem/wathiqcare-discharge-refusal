ALTER TABLE signing_secure_tokens ALTER COLUMN token DROP NOT NULL;

UPDATE signing_secure_tokens
SET revoked_at = COALESCE(revoked_at, NOW()),
    token = NULL,
    token_hash = NULL
WHERE token_hash IS NULL AND token IS NOT NULL;
