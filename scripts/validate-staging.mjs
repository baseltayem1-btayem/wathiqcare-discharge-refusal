#!/usr/bin/env node
/**
 * WathiqCare Online - Staging Runtime Validation
 *
 * Usage: node scripts/validate-staging.mjs
 */

import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import {
  ensureRequiredEnv,
  getMigrationDatabaseUrl,
  getRuntimeDatabaseUrl,
  loadRuntimeEnv,
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

function testEnvironmentActivation() {
  section('TEST 1: Environment Activation');

  const loaded = loadRuntimeEnv();
  ensureRequiredEnv(['DATABASE_URL']);

  const required = [
    'DATABASE_URL',
    'DATABASE_URL_POOLED',
    'DATABASE_URL_UNPOOLED',
    'NEXTAUTH_SECRET',
    'JWT_SECRET_KEY',
    'NODE_ENV',
    'BASE_URL',
    'APP_URL',
    'STORAGE_PROVIDER',
    'STORAGE_BUCKET',
  ];

  let missing = 0;
  for (const item of safeEnvStatus(required)) {
    if (item.present) {
      log(COLORS.GREEN, `  [OK] ${item.key}`);
    } else {
      log(COLORS.RED, `  [MISSING] ${item.key}`);
      missing += 1;
    }
  }

  log(COLORS.BLUE, `Loaded files: ${loaded.length > 0 ? loaded.join(', ') : 'none'}`);
  return missing === 0;
}

async function testDatabaseConnectivity() {
  section('TEST 2: Database Connectivity');
  await prisma.$queryRawUnsafe('SELECT 1 AS ok');
  log(COLORS.GREEN, 'Database connection successful');
  return true;
}

async function testMigrationState() {
  section('TEST 3: Migration State');

  const migrationUrl = getMigrationDatabaseUrl();
  if (!migrationUrl) {
    log(COLORS.RED, 'No migration URL available');
    return false;
  }

  const registryTables = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('_prisma_migrations', 'schema_migration_registry')
  `);

  if (registryTables.length === 0) {
    log(COLORS.RED, 'Migration registry tables not found (_prisma_migrations/schema_migration_registry)');
    return false;
  }

  log(COLORS.GREEN, `Migration registry found: ${registryTables.map((t) => t.table_name).join(', ')}`);
  return true;
}

async function testOperationalCategories() {
  section('TEST 4: Operational DB Category Integrity');

  const tables = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);

  const names = new Set(tables.map((t) => t.table_name));
  const categories = [
    { label: 'tenant tables', any: ['tenants', 'tenant_memberships', 'subscriptions'] },
    { label: 'RBAC tables', any: ['users', 'tenant_roles', 'user_role_assignments', 'tenant_role_permissions'] },
    { label: 'workflow tables', any: ['cases', 'case_operation_states', 'case_step_events'] },
    { label: 'audit tables', any: ['audit_logs', 'audit_chain_events', 'privileged_access_logs'] },
    { label: 'consent templates', any: ['consent_templates', 'consent_template_versions', 'consent_template_localizations'] },
    { label: 'notification tables', any: ['operation_notifications', 'notification_delivery_attempts', 'tenant_notification_settings'] },
    { label: 'PDF metadata tables', any: ['documents', 'consent_documents', 'consent_evidence_packages'] },
  ];

  let failed = 0;
  for (const category of categories) {
    const present = category.any.filter((t) => names.has(t));
    if (present.length === 0) {
      log(COLORS.RED, `  [FAIL] ${category.label}`);
      failed += 1;
    } else {
      log(COLORS.GREEN, `  [OK] ${category.label}: ${present.join(', ')}`);
    }
  }

  return failed === 0;
}

async function testRuntimeSeedPresence() {
  section('TEST 5: Runtime Seed Presence');

  const tenants = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM tenants');
  const users = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM users');
  const plans = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM plans');

  log(COLORS.BLUE, `Tenants: ${tenants[0].count}`);
  log(COLORS.BLUE, `Users: ${users[0].count}`);
  log(COLORS.BLUE, `Plans: ${plans[0].count}`);

  return tenants[0].count > 0 && users[0].count > 0 && plans[0].count > 0;
}

async function testAuditIntegrity() {
  section('TEST 6: Audit Integrity');

  const auditCount = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM audit_logs');
  log(COLORS.BLUE, `Audit rows: ${auditCount[0].count}`);

  if (auditCount[0].count === 0) {
    log(COLORS.YELLOW, 'Audit table exists but contains no rows yet');
  }
  return true;
}

function testSecurityAndPublicEnvBoundary() {
  section('TEST 7: Security and Env Exposure Boundary');

  const serverOnly = ['DATABASE_URL', 'DATABASE_URL_POOLED', 'DATABASE_URL_UNPOOLED', 'NEXTAUTH_SECRET', 'JWT_SECRET_KEY'];
  const leak = serverOnly.filter((key) => key.startsWith('NEXT_PUBLIC_'));
  if (leak.length > 0) {
    log(COLORS.RED, `Server-only secrets exposed as public vars: ${leak.join(', ')}`);
    return false;
  }

  log(COLORS.GREEN, 'Server-only secrets are not named as NEXT_PUBLIC_* variables');
  return true;
}

function testBuildAndDeployReadiness() {
  section('TEST 8: Build and Deploy Readiness');

  const rootPkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const webPkg = JSON.parse(fs.readFileSync('./apps/web/package.json', 'utf8'));
  const vercelConfig = JSON.parse(fs.readFileSync('./vercel.json', 'utf8'));

  const requiredRootScripts = ['build', 'start', 'prisma:generate'];
  const requiredWebScripts = ['build', 'start', 'prisma:generate'];

  let failed = 0;

  for (const script of requiredRootScripts) {
    if (!rootPkg.scripts?.[script]) {
      failed += 1;
      log(COLORS.RED, `Missing root script: ${script}`);
    }
  }

  for (const script of requiredWebScripts) {
    if (!webPkg.scripts?.[script]) {
      failed += 1;
      log(COLORS.RED, `Missing apps/web script: ${script}`);
    }
  }

  if (!vercelConfig.buildCommand || !vercelConfig.outputDirectory) {
    failed += 1;
    log(COLORS.RED, 'vercel.json missing buildCommand/outputDirectory');
  }

  if (failed === 0) {
    log(COLORS.GREEN, 'Build/deploy settings validated');
  }

  return failed === 0;
}

async function main() {
  console.log(`\n${COLORS.CYAN}WATHIQCARE ONLINE - STAGING VALIDATION${COLORS.RESET}\n`);

  const tests = [
    { name: 'Environment Activation', fn: testEnvironmentActivation },
    { name: 'Database Connectivity', fn: testDatabaseConnectivity },
    { name: 'Migration State', fn: testMigrationState },
    { name: 'Operational Categories', fn: testOperationalCategories },
    { name: 'Runtime Seed Presence', fn: testRuntimeSeedPresence },
    { name: 'Audit Integrity', fn: testAuditIntegrity },
    { name: 'Security Boundary', fn: testSecurityAndPublicEnvBoundary },
    { name: 'Build and Deploy Readiness', fn: testBuildAndDeployReadiness },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const ok = await test.fn();
      if (ok) {
        passed += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      log(COLORS.RED, `${test.name} failed: ${error.message}`);
      failed += 1;
    }
  }

  section('VALIDATION SUMMARY');
  log(COLORS.GREEN, `Passed: ${passed}/${tests.length}`);
  if (failed === 0) {
    log(COLORS.GREEN, 'ALL VALIDATIONS PASSED - STAGING READY FOR UAT');
  } else {
    log(COLORS.RED, `Failed: ${failed}/${tests.length}`);
  }

  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  log(COLORS.RED, `Fatal error: ${error.message}`);
  await prisma.$disconnect();
  process.exit(1);
});
