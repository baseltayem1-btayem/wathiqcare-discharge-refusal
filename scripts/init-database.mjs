#!/usr/bin/env node
/**
 * WathiqCare Online - Runtime Database Initialization
 *
 * Usage: node scripts/init-database.mjs
 */

import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import fs from 'fs';
import {
  buildSafeChildEnv,
  ensureRequiredEnv,
  getMigrationDatabaseUrl,
  getRuntimeDatabaseUrl,
  loadRuntimeEnv,
  resolveBinary,
  safeEnvStatus,
} from './_runtime-env.mjs';

const prisma = new PrismaClient();

const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function section(title) {
  console.log(`\n${COLORS.CYAN}${'='.repeat(64)}${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${title}${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${'='.repeat(64)}${COLORS.RESET}\n`);
}

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
        reject(new Error(`Command failed: ${command} ${args.join(' ')} (exit ${code})`));
      }
    });
  });
}

function printSafeEnvStatus() {
  section('STEP 1: Runtime Environment Activation');

  const loaded = loadRuntimeEnv();
  const required = [
    'DATABASE_URL',
    'DATABASE_URL_POOLED',
    'DATABASE_URL_UNPOOLED',
    'NEXTAUTH_SECRET',
    'JWT_SECRET_KEY',
    'BASE_URL',
    'APP_URL',
    'STORAGE_PROVIDER',
    'STORAGE_BUCKET',
  ];

  for (const item of safeEnvStatus(required)) {
    const color = item.present ? COLORS.GREEN : COLORS.RED;
    const marker = item.present ? 'OK' : 'MISSING';
    log(color, `  [${marker}] ${item.key}`);
  }

  if (loaded.length > 0) {
    log(COLORS.BLUE, `Loaded env files: ${loaded.join(', ')}`);
  } else {
    log(COLORS.YELLOW, 'No env files loaded from default locations; using shell env only');
  }

  ensureRequiredEnv(['DATABASE_URL']);
  log(COLORS.GREEN, 'Fail-fast validation passed: DATABASE_URL is set');
}

async function testDatabaseConnectivity() {
  section('STEP 2: Neon PostgreSQL Connectivity');
  await prisma.$queryRawUnsafe('SELECT 1 AS ok');
  log(COLORS.GREEN, 'Database connectivity is healthy');
}

async function runPrismaGenerate() {
  section('STEP 3: Prisma Client Generation');
  try {
    await runCommand('npx', ['prisma', 'generate', '--schema=./prisma/schema.prisma']);
    log(COLORS.GREEN, 'Prisma client generated');
    return;
  } catch (error) {
    const clientEnginePath = 'node_modules/.prisma/client/query_engine-windows.dll.node';
    if (process.platform === 'win32' && fs.existsSync(clientEnginePath)) {
      log(
        COLORS.YELLOW,
        `Prisma generate hit Windows file lock; existing client detected at ${clientEnginePath}. Continuing.`,
      );
      return;
    }
    throw error;
  }
}

async function runMigrations() {
  section('STEP 4: Migration Deployment');
  const migrationUrl = getMigrationDatabaseUrl();
  if (!migrationUrl) {
    throw new Error('No migration database URL available (DATABASE_URL_UNPOOLED/DATABASE_URL)');
  }

  await runCommand(
    'npx',
    ['prisma', 'migrate', 'deploy', '--schema=./prisma/schema.prisma'],
    { DATABASE_URL: migrationUrl },
  );
  log(COLORS.GREEN, 'Prisma migrations applied');
}

async function runSeed() {
  section('STEP 5: Seed Execution');
  await runCommand('node', ['prisma/seed.js']);
  log(COLORS.GREEN, 'Seed execution completed');
}

async function checkDatabaseHealth() {
  section('STEP 6: Runtime Database Health Check');

  const runtimeUrl = getRuntimeDatabaseUrl();
  if (!runtimeUrl) {
    throw new Error('No runtime database URL available');
  }

  const dbStats = await prisma.$queryRawUnsafe(`
    SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      now() AS checked_at
  `);

  log(COLORS.GREEN, `Runtime DB ready (${dbStats[0].database_name}/${dbStats[0].schema_name})`);
}

async function validateOperationalTables() {
  section('STEP 7: Operational Table Integrity');

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);

  const tableNames = new Set(tables.map((t) => t.table_name));

  const groups = [
    {
      name: 'tenant tables',
      required: ['tenants', 'tenant_memberships', 'subscriptions'],
    },
    {
      name: 'RBAC tables',
      required: ['users', 'tenant_roles', 'user_role_assignments', 'tenant_role_permissions'],
    },
    {
      name: 'workflow tables',
      required: ['cases', 'case_operation_states', 'case_step_events'],
    },
    {
      name: 'audit tables',
      required: ['audit_logs', 'audit_chain_events', 'privileged_access_logs'],
    },
    {
      name: 'consent template tables',
      required: ['consent_templates', 'consent_template_versions', 'consent_template_localizations'],
    },
    {
      name: 'notification tables',
      required: ['operation_notifications', 'notification_delivery_attempts', 'tenant_notification_settings'],
    },
    {
      name: 'PDF metadata tables',
      required: ['documents', 'consent_documents', 'consent_evidence_packages'],
    },
  ];

  let failures = 0;
  for (const group of groups) {
    const present = group.required.filter((name) => tableNames.has(name));
    if (present.length === 0) {
      log(COLORS.RED, `  [FAIL] ${group.name}: none of expected tables found`);
      failures += 1;
      continue;
    }

    log(COLORS.GREEN, `  [OK] ${group.name}: ${present.join(', ')}`);
  }

  if (failures > 0) {
    throw new Error(`Operational table validation failed in ${failures} category(ies)`);
  }
}

async function main() {
  console.log(`
${COLORS.CYAN}WATHIQCARE ONLINE - RUNTIME DATABASE ACTIVATION${COLORS.RESET}
`);

  const steps = [
    printSafeEnvStatus,
    testDatabaseConnectivity,
    runPrismaGenerate,
    runMigrations,
    runSeed,
    checkDatabaseHealth,
    validateOperationalTables,
  ];

  let passed = 0;
  for (const step of steps) {
    await step();
    passed += 1;
  }

  section('INITIALIZATION SUMMARY');
  log(COLORS.GREEN, `Passed: ${passed}/${steps.length}`);
  log(COLORS.GREEN, 'Runtime activation completed successfully');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  log(COLORS.RED, `Runtime initialization failed: ${error.message}`);
  await prisma.$disconnect();
  process.exit(1);
});
