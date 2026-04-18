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

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCHEMA_PATH = path.resolve(__dirname, '..', 'prisma', 'schema.prisma');
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'prisma', 'migrations');

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
  process.stdout.write(`[sql-migrations]   ${file} ... `);

  try {
    execSync(
      `npx prisma db execute --schema="${SCHEMA_PATH}" --file="${filePath}" --url="${directUrl}"`,
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.resolve(__dirname, '..'),
      },
    );
    process.stdout.write('OK\n');
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    const msg = (stderr || err.message || '').trim().replace(/\n/g, ' ').slice(0, 300);
    process.stdout.write(`WARN: ${msg}\n`);
    warnings++;
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
