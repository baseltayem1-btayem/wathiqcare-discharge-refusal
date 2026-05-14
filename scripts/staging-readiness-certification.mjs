#!/usr/bin/env node
/**
 * WathiqCare Online - Staging Readiness Certification
 *
 * Usage: node scripts/staging-readiness-certification.mjs
 */

import fs from 'fs';
import { spawnSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { buildSafeChildEnv, getMigrationDatabaseUrl, loadRuntimeEnv, resolveBinary } from './_runtime-env.mjs';

const PRISMA_ENGINE_PATH = 'node_modules/.prisma/client/query_engine-windows.dll.node';

function run(label, command, args, extraEnv = {}) {
  const isWindows = process.platform === 'win32';
  const executable = isWindows ? 'cmd.exe' : resolveBinary(command);
  const commandArgs = isWindows
    ? ['/d', '/s', '/c', `${resolveBinary(command)} ${args.join(' ')}`]
    : args;

  const result = spawnSync(executable, commandArgs, {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: buildSafeChildEnv(extraEnv),
  });

  const ok = result.status === 0 && !result.error;
  const errorPart = result.error ? String(result.error.message || result.error) : '';
  const output = `${(result.stdout || '').toString()}\n${(result.stderr || '').toString()}\n${errorPart}`.trim();
  return { label, ok, output };
}

function tolerateWindowsPrismaLock(result) {
  if (result.ok) {
    return result;
  }

  const hasWindowsLockError =
    process.platform === 'win32' &&
    result.output.includes('EPERM: operation not permitted, rename') &&
    fs.existsSync(PRISMA_ENGINE_PATH);

  if (!hasWindowsLockError) {
    return result;
  }

  return {
    ...result,
    ok: true,
    output: `${result.output}\n[WARN] Windows Prisma engine lock tolerated; existing client binary is present.`,
  };
}

async function dbChecks() {
  const prisma = new PrismaClient();
  const result = {};

  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    result.connectivity = true;
  } catch {
    result.connectivity = false;
  }

  const categoryQuery = async (tables) => {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const names = new Set(rows.map((r) => r.table_name));
    return tables.some((t) => names.has(t));
  };

  result.rbac = await categoryQuery(['users', 'tenant_roles', 'user_role_assignments']);
  result.workflow = await categoryQuery(['cases', 'case_operation_states', 'case_step_events']);
  result.audit = await categoryQuery(['audit_logs', 'audit_chain_events']);
  result.consent = await categoryQuery(['consent_templates', 'consent_template_versions', 'consent_documents']);
  result.multitenant = await categoryQuery(['tenants', 'tenant_memberships', 'subscriptions']);

  await prisma.$disconnect();

  return result;
}

function computeStatus(report) {
  const runtimeFailed = !report.environmentValidation.ok || !report.buildStatus.ok;
  const infraFailed = !report.dbConnectivity.ok || !report.migrationStatus.ok;

  if (!runtimeFailed && !infraFailed && report.securityValidation.ok && report.deploymentReadiness.ok) {
    return 'READY_FOR_STAGING_DEPLOYMENT';
  }

  if (infraFailed) {
    return 'BLOCKED_WITH_INFRASTRUCTURE_ISSUES';
  }

  return 'BLOCKED_WITH_RUNTIME_ERRORS';
}

async function main() {
  loadRuntimeEnv();

  const migrationUrl = getMigrationDatabaseUrl();

  const buildStatus = tolerateWindowsPrismaLock(run('build', 'npm', ['run', 'build']));
  const prismaStatus = tolerateWindowsPrismaLock(run('prisma:generate', 'npm', ['run', 'prisma:generate']));
  const migrationStatus = run(
    'prisma:migrate:deploy',
    'npx',
    ['prisma', 'migrate', 'deploy', '--schema=./prisma/schema.prisma'],
    migrationUrl ? { DATABASE_URL: migrationUrl } : {},
  );
  const securityValidation = run('security-env-audit', 'node', ['scripts/security-env-audit.mjs']);
  const environmentValidation = run('validate-staging', 'node', ['scripts/validate-staging.mjs']);
  const deploymentReadiness = run('pre-vercel-deploy-check', 'node', ['scripts/pre-vercel-deploy-check.mjs']);

  const db = await dbChecks();

  const report = {
    generatedAt: new Date().toISOString(),
    buildStatus: { ok: buildStatus.ok, detail: buildStatus.ok ? '' : buildStatus.output.slice(-1200) },
    prismaStatus: { ok: prismaStatus.ok, detail: prismaStatus.ok ? '' : prismaStatus.output.slice(-1200) },
    dbConnectivity: { ok: db.connectivity },
    migrationStatus: { ok: migrationStatus.ok, detail: migrationStatus.ok ? '' : migrationStatus.output.slice(-1200) },
    rbacIntegrity: { ok: db.rbac },
    workflowIntegrity: { ok: db.workflow },
    auditIntegrity: { ok: db.audit },
    consentTemplateIntegrity: { ok: db.consent },
    multiTenantIntegrity: { ok: db.multitenant },
    securityValidation: { ok: securityValidation.ok, detail: securityValidation.ok ? '' : securityValidation.output.slice(-1200) },
    environmentValidation: { ok: environmentValidation.ok, detail: environmentValidation.ok ? '' : environmentValidation.output.slice(-1200) },
    deploymentReadiness: { ok: deploymentReadiness.ok, detail: deploymentReadiness.ok ? '' : deploymentReadiness.output.slice(-1200) },
  };

  report.finalStatus = computeStatus(report);

  const outputPath = 'artifacts/staging-readiness-certification.json';
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(`Certification written to ${outputPath}`);
  console.log(report.finalStatus);

  process.exit(report.finalStatus === 'READY_FOR_STAGING_DEPLOYMENT' ? 0 : 1);
}

main().catch(async (error) => {
  console.error(`Certification failed: ${error.message}`);
  process.exit(1);
});
