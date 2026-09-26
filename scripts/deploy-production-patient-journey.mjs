#!/usr/bin/env node
/**
 * WathiqCare Production Patient Journey Release - Deployment Orchestrator
 *
 * Orchestrates the gated promotion of the release/patient-journey-production
 * branch to Vercel production with an immutable staged deployment.
 *
 * Required environment:
 *   - Vercel CLI authenticated (VERCEL_TOKEN or interactive login)
 *   - Production secrets present (see scripts/production-readiness-check.mjs)
 *   - WATHIQ_LEAD_APPROVED=true to push the release branch
 *   - WATHIQ_SKIP_DOMAIN_ASSIGNMENT is implied by --skip-domain
 *
 * Usage:
 *   node scripts/deploy-production-patient-journey.mjs
 *
 * Steps performed:
 *   1. Validate local branch and working tree.
 *   2. Run production-readiness-check.mjs.
 *   3. Run prisma:generate, prisma validate, lint, tsc, test, build, git diff --check.
 *   4. Push release/patient-journey-production when lead-approved.
 *   5. Create immutable staged production deployment:
 *      vercel deploy --prod --skip-domain
 *   6. Run automated smoke tests against the staged URL.
 *   7. Output promotion command (promote only after real SMS/email/mobile UAT).
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";

const RELEASE_BRANCH = "release/patient-journey-production";
const SMOKE_SCRIPT = "go_live_smoke.sh";

function log(level, message) {
  console.log(`[${level}] ${message}`);
}

function run(label, command, args, extraEnv = {}) {
  log("info", `Running: ${label}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`Step failed: ${label}`);
  }
}

function runCapture(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").toString().trim(),
    stderr: (result.stderr || "").toString().trim(),
  };
}

function currentBranch() {
  const result = runCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (!result.ok) {
    throw new Error("Unable to determine current git branch");
  }
  return result.stdout;
}

function ensureCleanWorkingTree() {
  const result = runCapture("git", ["status", "--porcelain"]);
  if (!result.ok) {
    throw new Error("Unable to check git status");
  }
  if (result.stdout) {
    throw new Error("Working tree is not clean; commit or stash changes first");
  }
}

function assertOnReleaseBranch() {
  const branch = currentBranch();
  if (branch !== RELEASE_BRANCH) {
    throw new Error(
      `Must be on ${RELEASE_BRANCH} to deploy. Current branch: ${branch}`,
    );
  }
}

function checkVercelCli() {
  const result = runCapture(process.platform === "win32" ? "where" : "which", [
    "vercel",
  ]);
  if (!result.ok) {
    throw new Error(
      "Vercel CLI not found. Install with: npm i -g vercel",
    );
  }
}

async function main() {
  log("info", "WathiqCare Production Patient Journey Release - Deployment Orchestrator");
  log("info", "========================================================================");

  assertOnReleaseBranch();
  ensureCleanWorkingTree();
  checkVercelCli();

  // 1. Production readiness env check.
  run("production-readiness-check", "node", [
    "scripts/production-readiness-check.mjs",
  ]);

  // 2. Static quality gates.
  run("prisma:generate", "npm", ["run", "prisma:generate"]);
  run("prisma validate", "npx", [
    "prisma",
    "validate",
    "--schema=./prisma/schema.prisma",
  ]);
  run("lint", "npm", ["run", "lint"]);
  run("tsc", "npx", ["tsc", "--noEmit"], { cwd: "apps/web" });
  run("test", "npm", ["test"]);
  run("build", "npm", ["run", "build"]);
  run("git diff --check", "git", ["diff", "--check"]);

  // 3. Push release branch when lead-approved.
  if (process.env.WATHIQ_LEAD_APPROVED === "true") {
    log("info", "Lead approval present; pushing release branch to origin");
    run("git push release branch", "git", ["push", "origin", RELEASE_BRANCH]);
  } else {
    log(
      "warn",
      "WATHIQ_LEAD_APPROVED is not true; skipping git push. Set WATHIQ_LEAD_APPROVED=true to push.",
    );
  }

  // 4. Create staged production deployment (immutable, no domain assignment).
  log("info", "Creating staged production deployment with --prod --skip-domain");
  const deployResult = runCapture("vercel", ["deploy", "--prod", "--skip-domain"]);
  if (!deployResult.ok) {
    throw new Error(`Vercel deploy failed: ${deployResult.stderr}`);
  }
  const stagedUrl = deployResult.stdout;
  log("info", `Staged deployment URL: ${stagedUrl}`);

  // Write the staged URL to a known artifact path for UAT/supervisor review.
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync(
    "artifacts/production-staged-deployment.json",
    JSON.stringify(
      {
        stagedAt: new Date().toISOString(),
        branch: RELEASE_BRANCH,
        stagedUrl,
        promotionCommand: `vercel promote ${stagedUrl}`,
        targetProductionDomain: "https://wathiqcare.online",
      },
      null,
      2,
    ),
  );

  // 5. Automated smoke tests against staged deployment.
  if (fs.existsSync(SMOKE_SCRIPT)) {
    log("info", "Running automated smoke tests against staged deployment");
    run(
      "smoke tests",
      process.platform === "win32" ? "bash" : "bash",
      [SMOKE_SCRIPT],
      { WATHIQ_BASE_URL: stagedUrl },
    );
  } else {
    log("warn", `Smoke script ${SMOKE_SCRIPT} not found; skipping`);
  }

  log("info", "Deployment orchestration complete");
  log("info", `Staged URL: ${stagedUrl}`);
  log(
    "info",
    "Next steps: verify real SMS/email dispatch, mobile browser journey, consent/refusal/PDF/patient copy, then promote with: vercel promote ${stagedUrl}",
  );
}

main().catch((error) => {
  console.error(`[fatal] ${error.message}`);
  process.exit(1);
});
