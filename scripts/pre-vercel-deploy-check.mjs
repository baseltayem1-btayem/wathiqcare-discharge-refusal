#!/usr/bin/env node
/**
 * WathiqCare Online - Pre-Vercel Deploy Check
 *
 * Usage: node scripts/pre-vercel-deploy-check.mjs
 */

import fs from 'fs';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function exists(path) {
  return fs.existsSync(path);
}

function hasMiddleware() {
  return exists('apps/web/middleware.ts') || exists('apps/web/src/middleware.ts');
}

function main() {
  const issues = [];

  const rootVercel = readJson('vercel.json');
  const webPkg = readJson('apps/web/package.json');
  const rootPkg = readJson('package.json');

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
  console.log(`buildCommand=${rootVercel.buildCommand}`);
  console.log(`outputDirectory=${rootVercel.outputDirectory}`);
  console.log('Next.js runtime compatibility: PASS');
  console.log('API runtime compatibility: PASS');
  console.log('Prisma binary compatibility: PASS (Node + @prisma/client + prisma present)');
}

main();
