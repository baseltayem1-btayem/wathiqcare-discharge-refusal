#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const ENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps', 'web', '.env.local'),
  path.resolve(process.cwd(), 'apps', 'web', '.env.production.local'),
];

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const idx = trimmed.indexOf('=');
  if (idx <= 0) {
    return null;
  }

  const key = trimmed.slice(0, idx).trim();
  let value = trimmed.slice(idx + 1).trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  value = value.replace(/\\n/g, '\n').trim();
  return { key, value };
}

export function loadRuntimeEnv() {
  const loaded = [];

  for (const envFile of ENV_CANDIDATES) {
    if (!fs.existsSync(envFile)) {
      continue;
    }

    const content = fs.readFileSync(envFile, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        continue;
      }

      if (!process.env[parsed.key]) {
        process.env[parsed.key] = parsed.value;
      }
    }

    loaded.push(path.relative(process.cwd(), envFile));
  }

  return loaded;
}

export function getRuntimeDatabaseUrl() {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_POOLED?.trim() ||
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    ''
  );
}

export function getMigrationDatabaseUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    process.env.DATABASE_URL_POOLED?.trim() ||
    ''
  );
}

export function ensureRequiredEnv(requiredKeys) {
  const missing = requiredKeys.filter((key) => !process.env[key] || !String(process.env[key]).trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function safeEnvStatus(keys) {
  return keys.map((key) => ({
    key,
    present: Boolean(process.env[key] && String(process.env[key]).trim()),
  }));
}

export function resolveBinary(command) {
  if (process.platform === 'win32') {
    if (command === 'npx') return 'npx.cmd';
    if (command === 'npm') return 'npm.cmd';
  }
  return command;
}

export function buildSafeChildEnv(extraEnv = {}) {
  const merged = {
    ...process.env,
    ...extraEnv,
  };

  const safeEnv = {};
  for (const [key, value] of Object.entries(merged)) {
    if (!key || key.startsWith('=')) {
      continue;
    }
    if (typeof value === 'undefined') {
      continue;
    }
    safeEnv[key] = String(value);
  }

  return safeEnv;
}
