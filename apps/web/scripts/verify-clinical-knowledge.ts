/**
 * Clinical Knowledge Engine — Sprint 2.5 Verification Script
 *
 * Runs all verification checks and writes markdown reports.
 * No database connection required; operates on the deterministic seed plan.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { verifyImcForms } from "../src/lib/server/clinical-knowledge/verification/imc-form-verification";
import { verifyProcedureMappings } from "../src/lib/server/clinical-knowledge/verification/procedure-mapping-verification";
import { generateCoverageReport } from "../src/lib/server/clinical-knowledge/verification/coverage-report";
import { runDataQualityCheck } from "../src/lib/server/clinical-knowledge/verification/data-quality-check";
import { runStressTest } from "../src/lib/server/clinical-knowledge/verification/stress-test";
import { runTenantIsolationTest } from "../src/lib/server/clinical-knowledge/verification/tenant-isolation-test";
import { runGovernanceTest } from "../src/lib/server/clinical-knowledge/verification/governance-test";
import { runAuditVerification } from "../src/lib/server/clinical-knowledge/verification/audit-verification";

const TENANT_ID = process.argv[2] || "tenant-cke-verification";
const OUTPUT_DIR = resolve(process.cwd(), "docs/clinical-knowledge-engine/verification");

mkdirSync(OUTPUT_DIR, { recursive: true });

function now() {
  return new Date().toISOString();
}

function section(title: string) {
  return `\n## ${title}\n\n`;
}

function statusBadge(success: boolean) {
  return success ? "✅ PASS" : "❌ FAIL";
}

console.log("Starting Clinical Knowledge Engine verification...");
console.log(`Tenant: ${TENANT_ID}`);
console.log(`Output: ${OUTPUT_DIR}\n`);

// ── 1. IMC Form Verification ───────────────────────────────────────────────
console.log("[1/9] Verifying IMC forms...");
const imcResult = verifyImcForms(TENANT_ID);

let imcReport = `# IMC Form Verification Report\n\nGenerated: ${now()}\nTenant: ${TENANT_ID}\n\n`;
imcReport += `${statusBadge(imcResult.success)} — ${imcResult.imported.length}/${imcResult.totalImcForms} forms imported successfully.\n\n`;
imcReport += `- **Total IMC forms:** ${imcResult.totalImcForms}\n`;
imcReport += `- **Imported:** ${imcResult.imported.length}\n`;
imcReport += `- **Failed:** ${imcResult.failed.length}\n`;
imcReport += `- **Missing:** ${imcResult.missing.length}\n`;
imcReport += `- **Duplicates:** ${imcResult.duplicates.length}\n`;

if (imcResult.failed.length) {
  imcReport += section("Failed Forms");
  for (const f of imcResult.failed) {
    imcReport += `- ${f.imcId}: ${f.reason}\n`;
  }
}
if (imcResult.missing.length) {
  imcReport += section("Missing Forms");
  for (const m of imcResult.missing) {
    imcReport += `- ${m.imcId}: ${m.titleEn}\n`;
  }
}
if (imcResult.duplicates.length) {
  imcReport += section("Duplicate Forms");
  for (const d of imcResult.duplicates) {
    imcReport += `- ${d.imcId}: ${d.formIds.join(", ")}\n`;
  }
}

writeFileSync(resolve(OUTPUT_DIR, "01-imc-form-verification.md"), imcReport);

// ── 2. Procedure Mapping Verification ──────────────────────────────────────
console.log("[2/9] Verifying procedure mappings...");
const mappingResult = verifyProcedureMappings(TENANT_ID);

let mappingReport = `# Procedure Mapping Verification Report\n\nGenerated: ${now()}\nTenant: ${TENANT_ID}\n\n`;
mappingReport += `${statusBadge(mappingResult.success)} — ${mappingResult.completeChains}/${mappingResult.totalProcedures} complete chains.\n\n`;
mappingReport += `- **Total procedures:** ${mappingResult.totalProcedures}\n`;
mappingReport += `- **Complete chains:** ${mappingResult.completeChains}\n`;
mappingReport += `- **Incomplete chains:** ${mappingResult.incompleteChains}\n\n`;
mappingReport += "| Procedure | Package | Consent Form | Education | Risks | Rules | Status | Issues |\n";
mappingReport += "|---|---|---|---|---|---|---|---|\n";

for (const chain of mappingResult.chains.slice(0, 50)) {
  mappingReport += `| ${chain.procedureNameEn} | ${chain.packageVersion} | ${chain.consentFormTitleEn || "—"} | ${chain.educationMaterialIds.length} | ${chain.riskDisclosureIds.length} | ${chain.decisionRuleCodes.length} | ${chain.complete ? "✅" : "❌"} | ${chain.issues.join("; ") || "—"} |\n`;
}
if (mappingResult.chains.length > 50) {
  mappingReport += `\n*${mappingResult.chains.length - 50} additional chains omitted.*\n`;
}

writeFileSync(resolve(OUTPUT_DIR, "02-procedure-mapping-verification.md"), mappingReport);

// ── 3. Coverage Report ─────────────────────────────────────────────────────
console.log("[3/9] Generating coverage report...");
const coverage = generateCoverageReport(TENANT_ID);

let coverageReport = `# Coverage Report\n\nGenerated: ${now()}\nTenant: ${TENANT_ID}\n\n`;
coverageReport += `- **Procedures:** ${coverage.procedureCount}\n`;
coverageReport += `- **Consent Coverage:** ${coverage.consentCoveragePercent}% (${coverage.proceduresWithConsent}/${coverage.procedureCount})\n`;
coverageReport += `- **Education Coverage:** ${coverage.educationCoveragePercent}% (${coverage.proceduresWithEducation}/${coverage.procedureCount})\n`;
coverageReport += `- **Risk Coverage:** ${coverage.riskCoveragePercent}% (${coverage.proceduresWithRisk}/${coverage.procedureCount})\n`;
coverageReport += `- **Rule Coverage:** ${coverage.ruleCoveragePercent}%\n`;
coverageReport += `- **Overall Coverage:** ${coverage.overallCoveragePercent}%\n`;

writeFileSync(resolve(OUTPUT_DIR, "03-coverage-report.md"), coverageReport);

// ── 4. Data Quality Check ──────────────────────────────────────────────────
console.log("[4/9] Running data quality checks...");
const dqResult = runDataQualityCheck(TENANT_ID);

let dqReport = `# Data Quality Report\n\nGenerated: ${now()}\nTenant: ${TENANT_ID}\n\n`;
dqReport += `${statusBadge(dqResult.success)}\n\n`;
dqReport += "| Check | Count |\n|---|---|\n";
dqReport += `| Duplicate procedures | ${dqResult.summary.duplicateProcedures} |\n`;
dqReport += `| Missing education | ${dqResult.summary.missingEducation} |\n`;
dqReport += `| Missing consent | ${dqResult.summary.missingConsent} |\n`;
dqReport += `| Orphan packages | ${dqResult.summary.orphanPackages} |\n`;
dqReport += `| Unused rules | ${dqResult.summary.unusedRules} |\n`;
dqReport += `| Broken references | ${dqResult.summary.brokenReferences} |\n`;
dqReport += `| Version conflicts | ${dqResult.summary.versionConflicts} |\n\n`;

if (dqResult.issues.length) {
  dqReport += "## Issues\n\n";
  for (const issue of dqResult.issues) {
    dqReport += `- **${issue.type}** (${issue.severity}) — ${issue.message}${issue.entityId ? ` [${issue.entityId}]` : ""}\n`;
  }
}

writeFileSync(resolve(OUTPUT_DIR, "04-data-quality-report.md"), dqReport);

// ── 5. Stress Test ─────────────────────────────────────────────────────────
console.log("[5/9] Running stress test (10,000 assemblies)...");
const stress = runStressTest(TENANT_ID, 10_000);

let stressReport = `# Stress Test Report\n\nGenerated: ${now()}\nTenant: ${TENANT_ID}\n\n`;
stressReport += `${statusBadge(stress.success)}\n\n`;
stressReport += `- **Iterations:** ${stress.iterations.toLocaleString()}\n`;
stressReport += `- **Total time:** ${stress.totalMs} ms\n`;
stressReport += `- **Average latency:** ${stress.averageMs} ms\n`;
stressReport += `- **P95 latency:** ${stress.p95Ms} ms\n`;
stressReport += `- **P99 latency:** ${stress.p99Ms} ms\n`;
stressReport += `- **Min latency:** ${stress.minMs} ms\n`;
stressReport += `- **Max latency:** ${stress.maxMs} ms\n`;
stressReport += `- **Memory before:** ${stress.memoryBeforeMb} MB\n`;
stressReport += `- **Memory after:** ${stress.memoryAfterMb} MB\n`;
stressReport += `- **Memory delta:** ${stress.memoryDeltaMb} MB\n`;
stressReport += `- **CPU usage:** ${stress.cpuUsagePercent !== null ? `${stress.cpuUsagePercent}%` : "N/A"}\n`;
stressReport += `- **Budget:** < 5 ms average, < 10 ms P95\n`;

writeFileSync(resolve(OUTPUT_DIR, "05-stress-test-report.md"), stressReport);

// ── 6. Tenant Isolation Test ───────────────────────────────────────────────
console.log("[6/9] Running tenant isolation test...");
const isolation = runTenantIsolationTest(
  `${TENANT_ID}-A`,
  `${TENANT_ID}-B`,
);

let isolationReport = `# Tenant Isolation Test Report\n\nGenerated: ${now()}\n\n`;
isolationReport += `${statusBadge(isolation.success)}\n\n`;
isolationReport += `- **Tenant A:** ${isolation.tenantA}\n`;
isolationReport += `- **Tenant B:** ${isolation.tenantB}\n`;
isolationReport += `- **Overlapping IDs:** ${isolation.overlappingIds.length}\n`;
isolationReport += `- **Overlapping codes:** ${isolation.overlappingCodes.length}\n`;
if (isolation.overlappingIds.length) {
  isolationReport += `\n## Overlapping IDs\n\n${isolation.overlappingIds.map((id) => `- ${id}`).join("\n")}\n`;
}
if (isolation.overlappingCodes.length) {
  isolationReport += `\n## Overlapping Procedure Codes\n\n${isolation.overlappingCodes.map((code) => `- ${code}`).join("\n")}\n`;
}

writeFileSync(resolve(OUTPUT_DIR, "06-tenant-isolation-report.md"), isolationReport);

// ── 7. Governance Test ─────────────────────────────────────────────────────
console.log("[7/9] Running governance tests...");
const govResult = runGovernanceTest(TENANT_ID);

let govReport = `# Governance Test Report\n\nGenerated: ${now()}\nTenant: ${TENANT_ID}\n\n`;
govReport += `${statusBadge(govResult.success)}\n\n`;
govReport += `- **Published packages:** ${govResult.publishedCount}\n\n`;
govReport += "| Transition | Allowed | Result |\n|---|---|---|\n";
for (const c of govResult.cases) {
  govReport += `| ${c.name} | ${c.allowed ? "Yes" : "No"} | ${c.passed ? "✅" : "❌"} |\n`;
}

writeFileSync(resolve(OUTPUT_DIR, "07-governance-test-report.md"), govReport);

// ── 8. Audit Verification ──────────────────────────────────────────────────
console.log("[8/9] Verifying audit chain...");
const auditResult = runAuditVerification(TENANT_ID);

let auditReport = `# Audit Verification Report\n\nGenerated: ${now()}\nTenant: ${TENANT_ID}\n\n`;
auditReport += `${statusBadge(auditResult.success)}\n\n`;
auditReport += `- **Total entities:** ${auditResult.totalEntities}\n`;
auditReport += `- **Governance events:** ${auditResult.eventsCount}\n`;
auditReport += `- **Expected events:** ${auditResult.expectedEvents}\n`;
auditReport += `- **Missing events:** ${auditResult.missingEvents.length}\n`;
auditReport += `- **Duplicate event IDs:** ${auditResult.duplicateEventIds.length}\n`;
auditReport += `- **Hash collisions:** ${auditResult.hashCollisions}\n`;

if (auditResult.missingEvents.length) {
  auditReport += "\n## Missing Events\n\n";
  for (const m of auditResult.missingEvents) {
    auditReport += `- ${m.entityType} ${m.entityId}\n`;
  }
}

writeFileSync(resolve(OUTPUT_DIR, "08-audit-verification-report.md"), auditReport);

// ── 9. Readiness Report ────────────────────────────────────────────────────
console.log("[9/9] Producing readiness report...");

const consentRiskRuleComplete =
  coverage.consentCoveragePercent === 100 &&
  coverage.riskCoveragePercent === 100 &&
  coverage.ruleCoveragePercent === 100;

const checks = [
  { name: "IMC Form Verification", result: imcResult.success, details: `${imcResult.imported.length}/${imcResult.totalImcForms} imported` },
  { name: "Procedure Mapping Verification", result: mappingResult.success, details: `${mappingResult.completeChains}/${mappingResult.totalProcedures} complete chains` },
  { name: "Core Coverage (Consent/Risk/Rules)", result: consentRiskRuleComplete, details: `Consent ${coverage.consentCoveragePercent}% / Risk ${coverage.riskCoveragePercent}% / Rules ${coverage.ruleCoveragePercent}%` },
  { name: "Education Coverage", result: coverage.educationCoveragePercent >= 50, details: `${coverage.educationCoveragePercent}%` },
  { name: "Data Quality", result: dqResult.success, details: `${dqResult.issues.length} issues` },
  { name: "Stress Test", result: stress.success, details: `${stress.averageMs} ms avg / ${stress.p95Ms} ms P95` },
  { name: "Tenant Isolation", result: isolation.success, details: `${isolation.overlappingIds.length} overlaps` },
  { name: "Governance", result: govResult.success, details: `${govResult.cases.filter((c) => c.passed).length}/${govResult.cases.length} cases passed` },
  { name: "Audit Verification", result: auditResult.success, details: `${auditResult.eventsCount} events` },
];

const criticalChecks = checks.filter((c) => c.name !== "Education Coverage");
const allCriticalPassed = criticalChecks.every((c) => c.result);
const educationPass = coverage.educationCoveragePercent >= 50;
const hasObservations = !educationPass || dqResult.issues.some((i) => i.severity === "warning");

let verdict: string;
if (allCriticalPassed && educationPass) {
  verdict = "GO";
} else if (allCriticalPassed && hasObservations) {
  verdict = "GO with observations";
} else {
  verdict = "NO GO";
}

let readinessReport = `# Clinical Knowledge Engine — Readiness Report\n\nGenerated: ${now()}\nTenant: ${TENANT_ID}\n\n`;
readinessReport += `## Verdict: ${verdict}\n\n`;
readinessReport += "| Check | Result | Details |\n|---|---|---|\n";
for (const c of checks) {
  readinessReport += `| ${c.name} | ${c.result ? "✅ PASS" : "❌ FAIL"} | ${c.details} |\n`;
}

readinessReport += "\n## Observations\n\n";
readinessReport += `### Coverage\n\n`;
readinessReport += `- **Overall coverage:** ${coverage.overallCoveragePercent}%\n`;
readinessReport += `- **Consent coverage:** ${coverage.consentCoveragePercent}%\n`;
readinessReport += `- **Risk coverage:** ${coverage.riskCoveragePercent}%\n`;
readinessReport += `- **Rule coverage:** ${coverage.ruleCoveragePercent}%\n`;
readinessReport += `- **Education coverage:** ${coverage.educationCoveragePercent}% (${coverage.proceduresWithEducation}/${coverage.procedureCount} procedures)\n\n`;

if (imcResult.warnings?.length) {
  readinessReport += "### Seed Warnings\n";
  for (const w of imcResult.warnings ?? []) {
    readinessReport += `- ${w}\n`;
  }
}
if (dqResult.issues.length) {
  readinessReport += "### Data Quality Issues\n";
  const critical = dqResult.issues.filter((i) => i.severity === "critical");
  const warnings = dqResult.issues.filter((i) => i.severity === "warning");
  if (critical.length) {
    for (const issue of critical) {
      readinessReport += `- **CRITICAL** ${issue.type}: ${issue.message}\n`;
    }
  }
  if (warnings.length) {
    readinessReport += `- **${warnings.length} warnings** (e.g., missing education for ${warnings.length} procedures)\n`;
  }
}

if (!allCriticalPassed) {
  readinessReport += "\n### Blockers\n\n";
  for (const c of criticalChecks.filter((c) => !c.result)) {
    readinessReport += `- ${c.name} failed. ${c.details}\n`;
  }
}

readinessReport += "\n## Notes\n\n";
readinessReport += "- Verification was performed in-memory against the deterministic seed plan.\n";
readinessReport += "- No database connection was used; runtime database validation is recommended before pilot.\n";
readinessReport += "- Stress test simulated package assembly and rule evaluation without Prisma I/O.\n";

writeFileSync(resolve(OUTPUT_DIR, "09-readiness-report.md"), readinessReport);

console.log("\n✅ Verification complete. Reports written to:");
console.log(`   ${OUTPUT_DIR}`);
console.log(`\nVerdict: ${verdict}`);
