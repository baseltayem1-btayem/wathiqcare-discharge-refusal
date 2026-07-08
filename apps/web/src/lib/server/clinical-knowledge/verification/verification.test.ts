import assert from "node:assert/strict";
import test from "node:test";
import { verifyImcForms } from "./imc-form-verification";
import { verifyProcedureMappings } from "./procedure-mapping-verification";
import { generateCoverageReport } from "./coverage-report";
import { runDataQualityCheck } from "./data-quality-check";
import { runStressTest } from "./stress-test";
import { runTenantIsolationTest } from "./tenant-isolation-test";
import { runGovernanceTest } from "./governance-test";
import { runAuditVerification } from "./audit-verification";

const TENANT_ID = "tenant-verification-test";

test("IMC form verification passes for complete seed plan", () => {
  const result = verifyImcForms(TENANT_ID);
  assert.equal(result.success, true);
  assert.equal(result.failed.length, 0);
  assert.equal(result.missing.length, 0);
  assert.equal(result.duplicates.length, 0);
  assert.ok(result.imported.length > 0);
});

test("procedure mapping verification passes for all procedures", () => {
  const result = verifyProcedureMappings(TENANT_ID);
  assert.equal(result.success, true);
  assert.equal(result.incompleteChains, 0);
  assert.ok(result.completeChains > 0);
});

test("coverage report shows 100% consent and risk coverage", () => {
  const result = generateCoverageReport(TENANT_ID);
  assert.equal(result.consentCoveragePercent, 100);
  assert.equal(result.riskCoveragePercent, 100);
  assert.equal(result.ruleCoveragePercent, 100);
  assert.ok(result.educationCoveragePercent >= 0);
});

test("data quality check finds no critical issues", () => {
  const result = runDataQualityCheck(TENANT_ID);
  assert.equal(result.success, true);
  assert.equal(result.summary.duplicateProcedures, 0);
  assert.equal(result.summary.missingConsent, 0);
  assert.equal(result.summary.orphanPackages, 0);
  assert.equal(result.summary.brokenReferences, 0);
});

test("stress test completes 10,000 assemblies within budget", () => {
  const result = runStressTest(TENANT_ID, 10_000);
  assert.equal(result.iterations, 10_000);
  assert.equal(result.success, true);
  assert.ok(result.averageMs < 5);
  assert.ok(result.p95Ms < 10);
});

test("tenant isolation test confirms no ID overlap", () => {
  const result = runTenantIsolationTest(
    "tenant-isolation-alpha",
    "tenant-isolation-beta",
  );
  assert.equal(result.success, true);
  assert.equal(result.overlapFound, false);
  assert.equal(result.overlappingIds.length, 0);
});

test("governance test passes seeded publish and illegal transitions", () => {
  const result = runGovernanceTest(TENANT_ID);
  assert.equal(result.success, true);
  assert.ok(result.publishedCount > 0);
});

test("audit verification confirms every entity has a governance event", () => {
  const result = runAuditVerification(TENANT_ID);
  assert.equal(result.success, true);
  assert.equal(result.missingEvents.length, 0);
  assert.equal(result.duplicateEventIds.length, 0);
  assert.equal(result.hashCollisions, 0);
});
