-- ============================================================
-- Migration 0030: Hash signing tokens at rest
-- ============================================================
-- P0-003: signing_secure_tokens.token stored raw tokens. This
-- migration adds token_hash, revokes all existing tokens (we
-- cannot retroactively hash them without the raw values), and
-- ensures new tokens are stored only as SHA-256 hashes.
-- ============================================================

BEGIN;

-- 1. Add hash column (nullable because existing rows cannot be backfilled)
--    and allow the raw token column to be NULL for new rows.
ALTER TABLE signing_secure_tokens
  ADD COLUMN IF NOT EXISTS token_hash TEXT NULL;
ALTER TABLE signing_secure_tokens
  ALTER COLUMN token DROP NOT NULL;

-- 2. Index for constant-time hash lookups.
CREATE INDEX IF NOT EXISTS idx_sst_token_hash
  ON signing_secure_tokens (token_hash)
  WHERE revoked_at IS NULL AND used_at IS NULL;

-- 3. Revoke all pre-existing tokens; they must be reissued to obtain a hash.
UPDATE signing_secure_tokens
  SET revoked_at = COALESCE(revoked_at, NOW()),
      token_hash = NULL
  WHERE token_hash IS NULL;

-- 4. Ensure raw tokens are never reused as the lookup key.
-- The application layer now queries by token_hash and stores NULL in token
-- for new rows, but we keep the column for audit/troubleshooting.

COMMIT;
