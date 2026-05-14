#!/usr/bin/env node
/**
 * Run all numbered SQL migration files against the configured database.
 *
 * Uses DATABASE_URL_UNPOOLED (direct connection) when available so that
 * DDL statements work correctly even when the runtime DATABASE_URL points
 * to a PgBouncer / Neon pooled endpoint.
 *
 * All migration files use "IF NOT EXISTS" guards, so running them multiple
 * times is safe (idempotent).
 *
 * Skipped automatically when:
 *  - DATABASE_URL / DATABASE_URL_UNPOOLED are not set
 *  - The URL still contains the placeholder "change-me"
 *  - The URL points to localhost / 127.0.0.1 (local dev — handled by dev workflow)
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'prisma', 'migrations');

function resolveBinary(command) {
  if (process.platform === 'win32') {
    if (command === 'npx') return 'npx.cmd';
    if (command === 'npm') return 'npm.cmd';
  }
  return command;
}

/** Use the direct (unpooled) URL for DDL; fall back to regular DATABASE_URL. */
const directUrl =
  (process.env.DATABASE_URL_UNPOOLED || '').trim() ||
  (process.env.DATABASE_URL || '').trim();

function isLocalOrPlaceholder(url) {
  if (!url) return true;
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('change-me')
  );
}

if (isLocalOrPlaceholder(directUrl)) {
  console.log('[sql-migrations] Skipping — local/placeholder DB URL detected.');
  process.exit(0);
}

if (!fs.existsSync(MIGRATIONS_DIR)) {
  console.log('[sql-migrations] No migrations directory found, skipping.');
  process.exit(0);
}

const migrationFiles = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.log('[sql-migrations] No SQL migration files found, skipping.');
  process.exit(0);
}

console.log(`[sql-migrations] Running ${migrationFiles.length} SQL migration file(s)...`);

let warnings = 0;

for (const file of migrationFiles) {
  const filePath = path.join(MIGRATIONS_DIR, file);
  const sqlBody = fs.readFileSync(filePath, 'utf8');
  const checksum = crypto.createHash('sha256').update(sqlBody).digest('hex');
  const safeFileName = file.replace(/'/g, "''");
  const safeChecksum = checksum.replace(/'/g, "''");
  const wrappedSql = `
CREATE TABLE IF NOT EXISTS schema_migration_registry (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  existing_checksum TEXT;
BEGIN
  SELECT checksum INTO existing_checksum
  FROM schema_migration_registry
  WHERE filename = '${safeFileName}';

  IF existing_checksum IS NOT NULL AND existing_checksum <> '${safeChecksum}' THEN
    RAISE EXCEPTION 'Checksum mismatch for migration % (existing %, incoming %)', '${safeFileName}', existing_checksum, '${safeChecksum}';
  END IF;
END $$;

${sqlBody}

INSERT INTO schema_migration_registry (filename, checksum, applied_at)
VALUES ('${safeFileName}', '${safeChecksum}', NOW())
ON CONFLICT (filename)
DO UPDATE SET
  checksum = EXCLUDED.checksum,
  applied_at = schema_migration_registry.applied_at;
`;
  const tempFile = path.join(os.tmpdir(), `wathiqcare-migration-${Date.now()}-${file}`);
  fs.writeFileSync(tempFile, wrappedSql, 'utf8');

  process.stdout.write(`[sql-migrations]   ${file} ... `);

  try {
    const result = spawnSync(resolveBinary('npx'), ['prisma', 'db', 'execute', `--file=${tempFile}`, `--url=${directUrl}`], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.resolve(__dirname, '..'),
    });

    if (result.status !== 0) {
      throw new Error((result.stderr || '').toString() || `Exit code ${result.status}`);
    }

    process.stdout.write('OK\n');
  } catch (err) {
    const msg = (err.message || '').trim().replace(/\n/g, ' ').slice(0, 300);
    process.stdout.write(`WARN: ${msg}\n`);
    warnings++;
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // no-op
    }
  }
}

if (warnings > 0) {
  console.log(
    `[sql-migrations] Completed with ${warnings} warning(s). ` +
      `Warnings are expected for tables/columns that already exist.`,
  );
} else {
  console.log('[sql-migrations] All migration files executed successfully.');
}
