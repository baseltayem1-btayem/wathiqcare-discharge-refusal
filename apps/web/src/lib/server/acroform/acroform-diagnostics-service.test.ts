import assert from "node:assert/strict";
import test from "node:test";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";

test("getAcroFormTemplateDiagnostics reports READY for verified amputation manifest", () => {
  const diagnostics = getAcroFormTemplateDiagnostics("imc-approved-amputation");

  assert.equal(diagnostics.formId, "imc-approved-amputation");
  assert.equal(diagnostics.manifestPresent, true);
  assert.equal(diagnostics.manifestHashMatches, true);
  assert.equal(diagnostics.status, "READY");
  assert.equal(diagnostics.blockers.length, 0);
  assert.equal(diagnostics.fieldCounts?.total, 56);
  assert.equal(diagnostics.fieldCounts?.text, 39);
  assert.equal(diagnostics.fieldCounts?.button, 7);
  assert.equal(diagnostics.fieldCounts?.signature, 10);
  assert.equal(diagnostics.acroFormAuthoringArtifact?.runtimeUsage, "AUTHORING_INPUT_ONLY");
});

test("getAcroFormTemplateDiagnostics reports NOT_READY for unregistered form", () => {
  const diagnostics = getAcroFormTemplateDiagnostics("imc-approved-unknown");

  assert.equal(diagnostics.manifestPresent, false);
  assert.equal(diagnostics.status, "NOT_READY");
  assert.ok(diagnostics.blockers.some((b) => b.includes("No verified AcroForm manifest")));
});
