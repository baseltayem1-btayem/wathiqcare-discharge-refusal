import assert from "node:assert/strict";
import test from "node:test";
import { buildImcSeedPlan, countSeedPlan } from "./seed-from-imc";
import { imcApprovedConsentLibraryGenerated } from "@/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated";

test("buildImcSeedPlan produces expected entity counts", () => {
  const plan = buildImcSeedPlan({
    tenantId: "tenant-test",
    createdByUserId: "user-test",
  });

  const counts = countSeedPlan(plan);

  assert.ok(counts.specialties > 0, "expected at least one specialty");
  assert.ok(counts.procedures > 0, "expected at least one procedure");
  assert.ok(counts.consentForms > 0, "expected at least one consent form");
  assert.ok(counts.packages > 0, "expected at least one package");
  assert.ok(
    counts.packages === counts.procedures,
    "expected one package per procedure",
  );
  assert.ok(
    counts.governanceEvents >= counts.packages + counts.consentForms,
    "expected governance events for published entities",
  );
});

test("every published package contains at least one consent form", () => {
  const plan = buildImcSeedPlan({ tenantId: "tenant-test" });

  for (const pkg of plan.packages) {
    const hasForm = pkg.items.some((i) => i.itemType === "CONSENT_FORM");
    assert.ok(hasForm, `package ${pkg.package.id} is missing a consent form`);
  }
});

test("specialty normalization maps known values", () => {
  const plan = buildImcSeedPlan({ tenantId: "tenant-test" });
  const codes = plan.specialties.map((s) => s.code);

  assert.ok(codes.includes("GENERAL_SURGERY"), "expected GENERAL_SURGERY specialty");
  assert.ok(codes.includes("ENT"), "expected ENT specialty");
  assert.ok(codes.includes("ANESTHESIA"), "expected ANESTHESIA specialty");
});

test("seed plan is idempotent for the same tenant", () => {
  const planA = buildImcSeedPlan({ tenantId: "tenant-stable" });
  const planB = buildImcSeedPlan({ tenantId: "tenant-stable" });

  assert.deepEqual(
    planA.specialties.map((s) => s.id).sort(),
    planB.specialties.map((s) => s.id).sort(),
  );
  assert.deepEqual(
    planA.procedures.map((p) => p.id).sort(),
    planB.procedures.map((p) => p.id).sort(),
  );
});

test("seed plan counts match IMC library size", () => {
  const plan = buildImcSeedPlan({ tenantId: "tenant-test" });

  assert.equal(plan.procedures.length, imcApprovedConsentLibraryGenerated.length);
  assert.equal(plan.consentForms.length, imcApprovedConsentLibraryGenerated.length);
});
