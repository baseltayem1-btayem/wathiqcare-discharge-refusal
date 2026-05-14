#!/usr/bin/env node
/**
 * WathiqCare Online - Security Env Audit
 *
 * Usage: node scripts/security-env-audit.mjs
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

const ENV_GITIGNORE_RULES = ['.env', '.env*.local'];
const ARTIFACT_DIRS = ['apps/web/.next', 'apps/web/artifacts', 'artifacts'];
const MANIFEST_FILES = [
  'apps/web/.next/routes-manifest.json',
  'apps/web/.next/server/app-paths-manifest.json',
  'apps/web/.next/server/pages-manifest.json',
];
const SENSITIVE_ENV_KEYS = [
  'DATABASE_URL',
  'DATABASE_URL_POOLED',
  'DATABASE_URL_UNPOOLED',
  'NEXTAUTH_SECRET',
  'JWT_SECRET_KEY',
  'PDFFILLER_API_KEY',
  'TAQNYAT_API_KEY',
  'TAQNIAT_API_KEY',
  'VERCEL_OIDC_TOKEN',
];

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function parseEnvValue(raw) {
  let value = String(raw || '').trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.trim();
}

function getSensitiveValuesFromEnvFiles() {
  const envFiles = ['apps/web/.env.local', 'apps/web/.env.production.local', '.env'];
  const values = [];

  for (const file of envFiles) {
    const content = readIfExists(path.join(ROOT, file));
    if (!content) continue;

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const idx = line.indexOf('=');
      const key = line.slice(0, idx).trim();
      const value = parseEnvValue(line.slice(idx + 1));

      if (!SENSITIVE_ENV_KEYS.includes(key)) continue;
      if (!value || value.length < 12 || value.includes('change-me')) continue;
      values.push({ key, value });
    }
  }

  return values;
}

function scanFileForSecretHints(filePath, sensitiveValues) {
  const content = readIfExists(filePath);
  if (!content) {
    return [];
  }

  const found = [];
  for (const entry of sensitiveValues) {
    if (entry.value && content.includes(entry.value)) {
      found.push(entry.key);
    }
  }
  return found;
}

function walkFiles(startDir, maxFiles = 4000) {
  const output = [];
  if (!fs.existsSync(startDir)) {
    return output;
  }

  const queue = [startDir];
  while (queue.length > 0 && output.length < maxFiles) {
    const current = queue.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      const items = fs.readdirSync(current);
      for (const item of items) {
        queue.push(path.join(current, item));
      }
      continue;
    }
    output.push(current);
  }

  return output;
}

function auditGitignore() {
  const gitignorePath = path.join(ROOT, '.gitignore');
  const content = readIfExists(gitignorePath);
  if (!content) {
    return { ok: false, reason: '.gitignore missing' };
  }

  const missing = ENV_GITIGNORE_RULES.filter((rule) => !content.includes(rule));
  return {
    ok: missing.length === 0,
    reason: missing.length === 0 ? '' : `Missing .gitignore env rules: ${missing.join(', ')}`,
  };
}

function auditBuildArtifacts(sensitiveValues) {
  const findings = [];
  for (const dir of ARTIFACT_DIRS) {
    const absDir = path.join(ROOT, dir);
    const files = walkFiles(absDir);
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      const hits = scanFileForSecretHints(file, sensitiveValues);
      if (hits.length > 0) {
        findings.push({ file: rel, hits });
      }
    }
  }
  return findings;
}

function auditManifests(sensitiveValues) {
  const findings = [];
  for (const file of MANIFEST_FILES) {
    const abs = path.join(ROOT, file);
    const hits = scanFileForSecretHints(abs, sensitiveValues);
    if (hits.length > 0) {
      findings.push({ file, hits });
    }
  }
  return findings;
}

function auditPublicEnvVariables() {
  const envFiles = ['apps/web/.env.local', 'apps/web/.env.production.local', '.env'];
  const findings = [];

  for (const file of envFiles) {
    const abs = path.join(ROOT, file);
    const content = readIfExists(abs);
    if (!content) continue;

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const key = line.split('=')[0].trim();
      if (key.startsWith('NEXT_PUBLIC_') && /SECRET|TOKEN|KEY|DATABASE_URL/.test(key)) {
        findings.push({ file, key });
      }
    }
  }

  return findings;
}

function main() {
  const issues = [];
  const sensitiveValues = getSensitiveValuesFromEnvFiles();

  const gitignore = auditGitignore();
  if (!gitignore.ok) {
    issues.push(gitignore.reason);
  }

  const artifactLeaks = auditBuildArtifacts(sensitiveValues);
  for (const leak of artifactLeaks) {
    issues.push(`Secret hint found in artifact: ${leak.file} (${leak.hits.join(', ')})`);
  }

  const manifestLeaks = auditManifests(sensitiveValues);
  for (const leak of manifestLeaks) {
    issues.push(`Secret hint found in manifest: ${leak.file} (${leak.hits.join(', ')})`);
  }

  const publicEnvLeaks = auditPublicEnvVariables();
  for (const leak of publicEnvLeaks) {
    issues.push(`Potential public secret env var in ${leak.file}: ${leak.key}`);
  }

  if (issues.length === 0) {
    console.log('SECURITY_ENV_AUDIT: PASS');
    process.exit(0);
  }

  console.error('SECURITY_ENV_AUDIT: FAIL');
  for (const issue of issues) {
    console.error(` - ${issue}`);
  }
  process.exit(1);
}

main();
