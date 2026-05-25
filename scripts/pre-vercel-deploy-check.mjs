#!/usr/bin/env node
/**
 * WathiqCare Online - Pre-Vercel Deploy Check
 *
 * Usage: node scripts/pre-vercel-deploy-check.mjs
 */

import fs from 'fs';
import { execSync } from 'node:child_process';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function exists(path) {
  return fs.existsSync(path);
}

function hasMiddleware() {
  return exists('apps/web/middleware.ts') || exists('apps/web/src/middleware.ts');
}

function normalizeBranch(ref) {
  return (ref || '').replace(/^refs\/heads\//, '').trim();
}

function resolveCommitSha() {
  const envSha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || process.env.RELEASE_COMMIT_SHA || '').trim();
  if (envSha) {
    return envSha;
  }
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

function isBlockedProductionBranch(branchName) {
  if (!branchName) return false;
  return (
    branchName.startsWith('copilot/') ||
    branchName.startsWith('hotfix/') ||
    branchName.startsWith('tmp/') ||
    branchName.startsWith('temp/') ||
    branchName.startsWith('temporary/')
  );
}

function main() {
  const issues = [];

  const rootVercel = readJson('vercel.json');
  const webPkg = readJson('apps/web/package.json');
  const rootPkg = readJson('package.json');
  const vercelEnv = (process.env.VERCEL_ENV || process.env.VERCEL_TARGET_ENV || '').trim().toLowerCase();
  const branchRef = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF || process.env.GITHUB_REF_NAME || '';
  const branchName = normalizeBranch(branchRef);
  const commitSha = resolveCommitSha();

  if (!rootVercel.buildCommand) {
    issues.push('vercel.json missing buildCommand');
  }
  if (!rootVercel.outputDirectory) {
    issues.push('vercel.json missing outputDirectory');
  }
  if (rootVercel.framework !== 'nextjs') {
    issues.push('vercel.json framework should be nextjs');
  }

  if (!rootPkg.scripts?.build || !webPkg.scripts?.build) {
    issues.push('Missing build script in root or apps/web package.json');
  }

  if (!webPkg.dependencies?.next) {
    issues.push('Next.js dependency missing in apps/web');
  }

  if (!webPkg.dependencies?.['@prisma/client']) {
    issues.push('@prisma/client missing in apps/web dependencies');
  }

  if (!webPkg.devDependencies?.prisma) {
    issues.push('prisma missing in apps/web devDependencies');
  }

  if (!webPkg.scripts?.['prisma:generate']) {
    issues.push('apps/web prisma:generate script missing');
  }

  if (!exists('apps/web/next.config.js')) {
    issues.push('apps/web/next.config.js missing');
  }

  if (!exists('apps/web/app/api')) {
    issues.push('apps/web/app/api missing (API runtime not detected)');
  }

  if (vercelEnv === 'production') {
    if (branchName && branchName !== 'main') {
      issues.push(`Production deployment blocked: branch must be main, received ${branchName}`);
    }

    if (isBlockedProductionBranch(branchName)) {
      issues.push(`Production deployment blocked: branch prefix is not allowed (${branchName})`);
    }

    if (!commitSha) {
      issues.push('Production deployment blocked: commit SHA is missing from CI metadata');
    }
  }

  if (hasMiddleware()) {
    console.log('Middleware detected: yes');
  } else {
    console.log('Middleware detected: no (acceptable)');
  }

  if (issues.length > 0) {
    console.error('PRE_VERCEL_DEPLOY_CHECK: FAIL');
    for (const issue of issues) {
      console.error(` - ${issue}`);
    }
    process.exit(1);
  }

  console.log('PRE_VERCEL_DEPLOY_CHECK: PASS');
  console.log(`sourceBranch=${branchName || 'unknown'}`);
  console.log(`vercelEnv=${vercelEnv || 'unknown'}`);
  console.log(`buildCommand=${rootVercel.buildCommand}`);
  console.log(`outputDirectory=${rootVercel.outputDirectory}`);
  console.log('Next.js runtime compatibility: PASS');
  console.log('API runtime compatibility: PASS');
  console.log('Prisma binary compatibility: PASS (Node + @prisma/client + prisma present)');
}

main();
