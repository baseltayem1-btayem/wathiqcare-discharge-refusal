import assert from "node:assert/strict";
import test from "node:test";
import { resolveCkeConsentMapping } from "./informed-consent-integration";
import type { AssemblyResult } from "./services/assembly-service";
import type { ClinicalKnowledgeAssembly } from "@/lib/clinical-knowledge/types";

function buildFakeAssembly(
  overrides: Partial<ClinicalKnowledgeAssembly> & { educationCount?: number; riskCount?: number },
): ClinicalKnowledgeAssembly {
  const educationCount = overrides.educationCount ?? 1;
  const riskCount = overrides.riskCount ?? 1;

  return {
    assemblyId: "assembly-1",
    tenantId: overrides.tenantId ?? "tenant-a",
    procedureId: "proc-1",
    procedureCode: overrides.procedureCode ?? "appendectomy",
    procedureNameEn: overrides.procedureNameEn ?? "Appendectomy",
    procedureNameAr: overrides.procedureNameAr ?? "استئصال الزائدة",
    packageId: "pkg-1",
    packageVersion: "1.0.0",
    status: "ready",
    consentForm: {
      id: "form-1",
      tenantId: overrides.tenantId ?? "tenant-a",
      code: "APPENDECTOMY_CONSENT",
      titleEn: "Appendectomy Consent",
      titleAr: "موافقة استئصال الزائدة",
      formType: "PROCEDURE_CONSENT",
      riskLevel: "STANDARD",
      status: "PUBLISHED",
      version: "1.0.0",
      effectiveDate: new Date().toISOString(),
      pdfTemplateUrl: "/forms/appendectomy.pdf",
      requiresWitness: false,
      requiresInterpreter: false,
      createdByUserId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    educationMaterials: Array.from({ length: educationCount }).map((_, i) => ({
      id: `edu-${i + 1}`,
      tenantId: overrides.tenantId ?? "tenant-a",
      code: `APPENDECTOMY_EDU_${i + 1}`,
      titleEn: "Appendectomy Education",
      titleAr: "تثقيف استئصال الزائدة",
      assetType: "PDF" as const,
      assetUrl: "/education/appendectomy.pdf",
      durationMinutes: null,
      status: "PUBLISHED" as const,
      version: "1.0.0",
      effectiveDate: new Date().toISOString(),
      createdByUserId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    riskDisclosures: Array.from({ length: riskCount }).map((_, i) => ({
      id: `risk-${i + 1}`,
      tenantId: overrides.tenantId ?? "tenant-a",
      code: `APPENDECTOMY_RISK_${i + 1}`,
      titleEn: "Infection",
      titleAr: "عدوى",
      riskLevel: "STANDARD" as const,
      specialtyIds: [],
      status: "PUBLISHED" as const,
      version: "1.0.0",
      effectiveDate: new Date().toISOString(),
      createdByUserId: "user-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    illustrations: [],
    decisionRules: [],
    suggestions: [],
    blockers: [],
    requiredParticipants: [],
    assembledAt: new Date().toISOString(),
  };
}

test("resolveCkeConsentMapping returns consent + education when assembly has both", async () => {
  const assembly = buildFakeAssembly({ educationCount: 1 });
  const resolver = async () => ({ found: true as const, assembly });

  const result = await resolveCkeConsentMapping(
    { tenantId: "tenant-a", procedureCode: "appendectomy" },
    { assemblyResolver: resolver },
  );

  assert.equal(result.found, true);
  assert.equal(result.educationNotAvailable, false);
  assert.equal(result.mapping?.consentForm.titleEn, "Appendectomy Consent");
  assert.equal(result.mapping?.educationMaterial?.titleEn, "Appendectomy Education");
  assert.equal(result.package?.procedureConsent?.titleEn, "Appendectomy Consent");
  assert.equal(result.package?.patientEducation?.titleEn, "Appendectomy Education — Patient Education");
  assert.ok(result.auditEvents.some((e) => e.action === "education_material_loaded"));
  assert.equal(result.clinicalKnowledgeAssembly?.procedureCode, "appendectomy");
});

test("resolveCkeConsentMapping marks education not available and emits audit when missing", async () => {
  const assembly = buildFakeAssembly({ educationCount: 0 });
  const resolver = async () => ({ found: true as const, assembly });

  const result = await resolveCkeConsentMapping(
    { tenantId: "tenant-a", procedureCode: "appendectomy" },
    { assemblyResolver: resolver },
  );

  assert.equal(result.found, true);
  assert.equal(result.educationNotAvailable, true);
  assert.equal(result.mapping?.educationMaterial, null);
  assert.equal(result.package?.patientEducation, undefined);
  assert.ok(result.auditEvents.some((e) => e.action === "education_not_available"));
  assert.ok(!result.auditEvents.some((e) => e.action === "education_material_loaded"));
});

test("resolveCkeConsentMapping returns not found when assembly fails", async () => {
  const resolver = async () =>
    ({ found: false as const, fallbackReason: "PROCEDURE_NOT_FOUND" }) satisfies AssemblyResult;

  const result = await resolveCkeConsentMapping(
    { tenantId: "tenant-a", procedureCode: "unknown" },
    { assemblyResolver: resolver },
  );

  assert.equal(result.found, false);
  assert.equal(result.fallbackReason, "PROCEDURE_NOT_FOUND");
  assert.ok(result.auditEvents.some((e) => e.action === "cke_assembly_failed"));
});

test("resolveCkeConsentMapping catches resolver exceptions and returns not found", async () => {
  const resolver = async () => {
    throw new Error("database unavailable");
  };

  const result = await resolveCkeConsentMapping(
    { tenantId: "tenant-a", procedureCode: "appendectomy" },
    { assemblyResolver: resolver },
  );

  assert.equal(result.found, false);
  assert.match(result.fallbackReason || "", /database unavailable/);
  assert.ok(result.auditEvents.some((e) => e.action === "cke_assembly_failed"));
});

test("resolveCkeConsentMapping enforces tenant isolation", async () => {
  const assembly = buildFakeAssembly({ tenantId: "tenant-a", procedureCode: "appendectomy" });
  const resolver = async (request: { tenantId: string; procedureCode: string }) => {
    if (request.tenantId !== "tenant-a") {
      return { found: false as const, fallbackReason: "PROCEDURE_NOT_FOUND" };
    }
    return { found: true as const, assembly };
  };

  const allowed = await resolveCkeConsentMapping(
    { tenantId: "tenant-a", procedureCode: "appendectomy" },
    { assemblyResolver: resolver },
  );
  assert.equal(allowed.found, true);
  assert.equal(allowed.clinicalKnowledgeAssembly?.tenantId, "tenant-a");

  const blocked = await resolveCkeConsentMapping(
    { tenantId: "tenant-b", procedureCode: "appendectomy" },
    { assemblyResolver: resolver },
  );
  assert.equal(blocked.found, false);
  assert.equal(blocked.clinicalKnowledgeAssembly, undefined);
});

test("resolveCkeConsentMapping audit events are ordered and complete", async () => {
  const assembly = buildFakeAssembly({ educationCount: 1 });
  const resolver = async () => ({ found: true as const, assembly });

  const result = await resolveCkeConsentMapping(
    { tenantId: "tenant-a", procedureCode: "appendectomy" },
    { assemblyResolver: resolver },
  );

  const actions = result.auditEvents.map((e) => e.action);
  assert.deepEqual(actions, [
    "cke_assembly_requested",
    "consent_form_loaded_from_library",
    "education_material_loaded",
  ]);
  assert.ok(result.auditEvents.every((e) => e.summary.length > 0));
  assert.ok(result.auditEvents.every((e) => typeof e.metadata === "object"));
});
