import assert from "node:assert/strict";
import test from "node:test";

import {
  clinicalContentRegistry,
  resolveProcedureMapping,
  evaluateComprehension,
  assembleConsent,
  evaluateDecisionSupport,
} from "./index";

test("registry seeds approved forms from IMC library", () => {
  const forms = clinicalContentRegistry.listApprovedForms();
  assert.ok(forms.length > 0, "expected approved forms to be seeded");
  assert.ok(forms.every((f) => f.kind === "approved-form"));
  assert.ok(forms.every((f) => f.status === "approved"));
});

test("registry seeds procedures from IMC library", () => {
  const procedures = clinicalContentRegistry.listProcedures();
  assert.ok(procedures.length > 0, "expected procedures to be seeded");
  const abdominoplasty = procedures.find((p) => /abdominoplasty/i.test(p.titleEn));
  assert.ok(abdominoplasty, "expected Abdominoplasty procedure");
  assert.ok(abdominoplasty.mappedFormIds.length > 0);
});

test("search approved forms by query returns relevant results", () => {
  const result = clinicalContentRegistry.search("approved-form", { q: "Abdominoplasty" });
  assert.ok(result.items.length > 0);
  assert.ok(result.items[0].titleEn.toLowerCase().includes("abdominoplasty"));
});

test("procedure mapping resolves Abdominoplasty", () => {
  const result = resolveProcedureMapping({ procedure: "Abdominoplasty" });
  assert.equal(result.found, true);
  assert.ok(result.consentForms.length > 0);
  assert.ok(result.procedure?.titleEn.toLowerCase().includes("abdominoplasty"));
});

test("procedure mapping returns fallback for unknown procedure", () => {
  const result = resolveProcedureMapping({ procedure: "NonExistentProcedureXYZ" });
  assert.equal(result.found, false);
  assert.equal(result.consentForms.length, 0);
  assert.ok(result.fallbackReason);
});

test("education comprehension evaluation scores answers", () => {
  const material = clinicalContentRegistry.listEducationMaterials()[0];
  assert.ok(material, "expected at least one education material");

  const correctAnswers: Record<string, string> = {};
  for (const check of material.comprehensionChecks) {
    correctAnswers[check.id] = check.correctOptionId;
  }

  const result = evaluateComprehension({
    materialId: material.id,
    answers: correctAnswers,
    attempts: 1,
  });

  assert.equal(result.passed, true);
  assert.ok(result.scorePct >= 80);
});

test("dynamic consent assembly produces a structured package", () => {
  const assembly = assembleConsent({
    tenantId: "tenant-test",
    procedureName: "Abdominoplasty",
    patientContext: {
      capacityStatus: "competent",
      languagePreference: "bilingual",
    },
    physicianContext: {
      physicianId: "doc-1",
      name: "Dr. Test",
      licenseNumber: "L-123",
      specialty: "General Surgery",
      department: "Surgery",
    },
    preferredLanguage: "bilingual",
    includeEducation: true,
    includeDecisionSupport: true,
  });

  assert.ok(assembly.assemblyId);
  assert.equal(assembly.tenantId, "tenant-test");
  assert.ok(assembly.consentForm);
  assert.ok(assembly.educationMaterial);
  assert.ok(assembly.blockers.length === 0);
  assert.equal(assembly.status, "draft");
});

test("dynamic consent assembly blocks when guardian required but missing", () => {
  const assembly = assembleConsent({
    tenantId: "tenant-test",
    procedureName: "Abdominoplasty",
    patientContext: {
      capacityStatus: "minor",
      languagePreference: "bilingual",
    },
    physicianContext: {
      physicianId: "doc-1",
      name: "Dr. Test",
      licenseNumber: "L-123",
      specialty: "General Surgery",
      department: "Surgery",
    },
    preferredLanguage: "bilingual",
    includeEducation: true,
    includeDecisionSupport: true,
  });

  assert.equal(assembly.status, "blocked");
  assert.ok(assembly.blockers.some((b) => b.key === "guardian-required"));
});

test("decision support flags high-risk anesthesia procedures", () => {
  const mapping = resolveProcedureMapping({ procedure: "Adenotonsillectomy" });
  assert.ok(mapping.found);

  const result = evaluateDecisionSupport({
    procedure: mapping.procedure,
    disclosedRiskIds: mapping.risks.map((r) => r.id),
    disclosedAlternativeIds: mapping.alternatives.map((a) => a.id),
    patientContext: {
      capacityStatus: "competent",
      languagePreference: "bilingual",
    },
    includeEducation: true,
  });

  assert.ok(result.riskScore > 0);
  assert.ok(result.requiredParticipants.includes("witness"));
  assert.ok(result.suggestions.some((s) => s.type === "witness-required"));
});
