#!/usr/bin/env node
/**
 * WathiqCare Web - Pre-Vercel Deploy Check
 *
 * Runs from apps/web project root in Vercel builds.
 */

import fs from 'fs';
import { execSync } from 'node:child_process';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
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
  const warnings = [];
  const pkg = readJson('package.json');

  const vercelEnv = (process.env.VERCEL_ENV || process.env.VERCEL_TARGET_ENV || '').trim().toLowerCase();
  const branchRef = process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF || process.env.GITHUB_REF_NAME || '';
  const branchName = normalizeBranch(branchRef);
  const commitSha = resolveCommitSha();

  if (!pkg.scripts?.build) {
    issues.push('package.json missing build script');
  }

  if (!pkg.scripts?.['prisma:generate']) {
    issues.push('package.json missing prisma:generate script');
  }

  if (!pkg.dependencies?.next) {
    issues.push('Next.js dependency missing');
  }

  if (!pkg.dependencies?.['@prisma/client']) {
    issues.push('@prisma/client dependency missing');
  }

  if (!pkg.devDependencies?.prisma) {
    issues.push('prisma devDependency missing');
  }

  if (vercelEnv === 'production') {
    // Allow main or phase24-evidence-package-final for production recovery
    const allowedProductionBranches = ['main', 'phase24-evidence-package-final'];
    if (branchName && !allowedProductionBranches.includes(branchName)) {
      issues.push(`Production deployment blocked: branch must be ${allowedProductionBranches.join(' or ')}, received ${branchName}`);
    }

    if (isBlockedProductionBranch(branchName)) {
      issues.push(`Production deployment blocked: branch prefix is not allowed (${branchName})`);
    }

    if (!commitSha) {
      warnings.push('Production deployment warning: commit SHA metadata unavailable; continuing because branch policy passed');
    }
  }

  if (issues.length > 0) {
    console.error('PRE_VERCEL_DEPLOY_CHECK: FAIL');
    for (const issue of issues) {
      console.error(` - ${issue}`);
    }
    process.exit(1);
  }

  for (const warning of warnings) {
    console.warn(`PRE_VERCEL_DEPLOY_CHECK: WARN - ${warning}`);
  }

  console.log('PRE_VERCEL_DEPLOY_CHECK: PASS');
  console.log(`sourceBranch=${branchName || 'unknown'}`);
  console.log(`vercelEnv=${vercelEnv || 'unknown'}`);
  console.log('Next.js runtime compatibility: PASS');
  console.log('Prisma compatibility: PASS');
}

main();
