#!/usr/bin/env node
/**
 * WathiqCare Online - Database Runtime Activation Test
 *
 * Usage: node scripts/test-db-runtime.mjs
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import fs from 'fs';
import {
  buildSafeChildEnv,
  ensureRequiredEnv,
  getMigrationDatabaseUrl,
  loadRuntimeEnv,
  resolveBinary,
} from './_runtime-env.mjs';

const prisma = new PrismaClient();

function runCommand(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const executable = isWindows ? 'cmd.exe' : resolveBinary(command);
    const commandArgs = isWindows
      ? ['/d', '/s', '/c', `${resolveBinary(command)} ${args.join(' ')}`]
      : args;

    const child = spawn(executable, commandArgs, {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: buildSafeChildEnv(extraEnv),
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with exit ${code}`));
      }
    });
  });
}

async function validateCategory(label, expected) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);

  const names = new Set(rows.map((r) => r.table_name));
  const found = expected.filter((name) => names.has(name));
  if (found.length === 0) {
    throw new Error(`Category ${label} missing expected tables: ${expected.join(', ')}`);
  }

  console.log(`[OK] ${label}: ${found.join(', ')}`);
}

async function main() {
  console.log('=== WathiqCare DB Runtime Activation ===');

  const loaded = loadRuntimeEnv();
  console.log(`Loaded env files: ${loaded.length > 0 ? loaded.join(', ') : 'none'}`);

  ensureRequiredEnv(['DATABASE_URL']);

  try {
    await runCommand('npx', ['prisma', 'generate', '--schema=./prisma/schema.prisma']);
  } catch (error) {
    const clientEnginePath = 'node_modules/.prisma/client/query_engine-windows.dll.node';
    if (process.platform === 'win32' && fs.existsSync(clientEnginePath)) {
      console.log(`[WARN] Prisma generate hit Windows file lock; using existing client at ${clientEnginePath}`);
    } else {
      throw error;
    }
  }

  const migrationUrl = getMigrationDatabaseUrl();
  if (!migrationUrl) {
    throw new Error('No migration URL available');
  }

  await runCommand(
    'npx',
    ['prisma', 'migrate', 'deploy', '--schema=./prisma/schema.prisma'],
    { DATABASE_URL: migrationUrl },
  );

  await prisma.$queryRawUnsafe('SELECT 1');
  console.log('[OK] database health check');

  await runCommand('node', ['prisma/seed.js']);
  console.log('[OK] seed execution');

  await validateCategory('tenant tables', ['tenants', 'tenant_memberships', 'subscriptions']);
  await validateCategory('RBAC tables', ['users', 'tenant_roles', 'user_role_assignments', 'tenant_role_permissions']);
  await validateCategory('workflow tables', ['cases', 'case_operation_states', 'case_step_events']);
  await validateCategory('audit tables', ['audit_logs', 'audit_chain_events', 'privileged_access_logs']);
  await validateCategory('consent templates', ['consent_templates', 'consent_template_versions', 'consent_template_localizations']);
  await validateCategory('notification tables', ['operation_notifications', 'notification_delivery_attempts', 'tenant_notification_settings']);
  await validateCategory('PDF metadata tables', ['documents', 'consent_documents', 'consent_evidence_packages']);

  console.log('=== DB runtime activation succeeded ===');
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(`DB runtime activation failed: ${error.message}`);
  await prisma.$disconnect();
  process.exit(1);
});
