import assert from "node:assert/strict";
import test from "node:test";
import type { NextRequest } from "next/server";
import { handleContentMappingResolve } from "./route-handler";
import type { ContentMappingResolveDependencies } from "./route-handler";
import type { AuthContext } from "@/lib/server/auth";
import type { ContentMappingFound } from "@/lib/server/content-mapping-service";

function makeRequest(query: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/modules/informed-consents/content-mapping/resolve");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return {
    url: url.toString(),
  } as unknown as NextRequest;
}

function buildDeps(overrides: Partial<ContentMappingResolveDependencies> = {}): ContentMappingResolveDependencies {
  const auth: AuthContext = {
    sub: "user-1",
    tenant_id: "tenant-a",
    role: "PHYSICIAN",
    platform_role: null,
    email: "doc@example.com",
  };

  return {
    requireModuleOperationalAccess: async () => auth,
    resolveFeatureFlag: async () => ({ resolvedValue: true }),
    writeConsentAudit: async () => undefined,
    resolveContentMapping: async () => ({
      found: false as const,
      procedureName: "unknown",
      availableProcedures: [],
    }),
    buildImcConsentPackage: (result: ContentMappingFound) => ({
      procedureConsent: {
        id: result.consentForm.templateId,
        titleEn: result.consentForm.titleEn,
        titleAr: result.consentForm.titleAr,
        fileName: result.consentForm.fileName,
        publicPath: result.consentForm.publicPath,
        specialty: result.specialty,
        templateType: result.consentCategory,
        status: "ACTIVE",
        source: "static",
        requiresAnesthesia: false,
        isPatientCopy: false,
        isEducation: false,
        isAnesthesia: false,
        lengthBytes: 0,
      },
      matches: [],
    }),
    resolveCkeConsentMapping: async () => ({
      found: false as const,
      fallbackReason: "PROCEDURE_NOT_FOUND",
      educationNotAvailable: false,
      auditEvents: [],
    }),
    getApprovedIllustrationsForProcedureByNames: async () => [],
    ...overrides,
  } as unknown as ContentMappingResolveDependencies;
}

function staticFoundResult(education = true) {
  return {
    found: true as const,
    procedureCatalogId: "catalog-1",
    procedureId: "appendectomy",
    procedureNameEn: "Appendectomy",
    procedureNameAr: "استئصال الزائدة",
    specialty: "General Surgery",
    department: "Surgery",
    categoryCode: "APPENDECTOMY",
    consentType: "PROCEDURE_CONSENT",
    consentCategory: "Surgical Consent",
    language: "bilingual",
    version: "1.0.0",
    anesthesiaRequired: false,
    consentForm: {
      templateId: "template-1",
      templateVersionId: "template-1-v1",
      templateCode: "APPENDECTOMY_CONSENT",
      fileName: "appendectomy.pdf",
      publicPath: "/forms/appendectomy.pdf",
      titleEn: "Appendectomy Consent",
      titleAr: "موافقة استئصال الزائدة",
      kind: "CONSENT_FORM" as const,
      status: "APPROVED" as const,
    },
    educationMaterial: education
      ? {
          educationId: "edu-1",
          assetId: "asset-1",
          fileName: "appendectomy-edu.pdf",
          publicPath: "/education/appendectomy.pdf",
          titleEn: "Appendectomy Education",
          titleAr: "تثقيف استئصال الزائدة",
          kind: "EDUCATION_MATERIAL" as const,
          assetType: "PDF" as const,
          durationMinutes: null,
        }
      : null,
  };
}

test("returns feature flag off when content mapping flag is disabled", async () => {
  const audits: Array<{ action: string }> = [];
  const deps = buildDeps({
    resolveFeatureFlag: async (key) => ({
      resolvedValue: key !== "ENABLE_CONTENT_MAPPING_ENGINE",
    }),
    writeConsentAudit: async (args) => {
      audits.push({ action: args.action });
    },
  });

  const response = await handleContentMappingResolve(
    makeRequest({ procedure: "appendectomy", tenantId: "tenant-a" }),
    deps,
  );

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.found, false);
  assert.equal(body.featureFlagEnabled, false);
  assert.equal(audits.length, 0);
});

test("static path returns mapping with education and writes audit events", async () => {
  const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
  const deps = buildDeps({
    resolveContentMapping: async () => staticFoundResult(true),
    writeConsentAudit: async (args) => {
      audits.push({ action: args.action, metadata: args.metadata });
    },
  });

  const response = await handleContentMappingResolve(
    makeRequest({ procedure: "appendectomy", tenantId: "tenant-a" }),
    deps,
  );

  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.found, true);
  assert.equal(body.ckeEnabled, false);
  assert.equal(body.mapping.consentForm.titleEn, "Appendectomy Consent");
  assert.equal(body.mapping.educationMaterial.titleEn, "Appendectomy Education");

  const actions = audits.map((a) => a.action);
  assert.deepEqual(actions, [
    "content_mapping_requested",
    "consent_form_loaded_from_library",
    "education_material_loaded",
  ]);
});

test("static path emits education_not_available when education is missing", async () => {
  const audits: Array<{ action: string }> = [];
  const deps = buildDeps({
    resolveContentMapping: async () => staticFoundResult(false),
    writeConsentAudit: async (args) => {
      audits.push({ action: args.action });
    },
  });

  const response = await handleContentMappingResolve(
    makeRequest({ procedure: "appendectomy", tenantId: "tenant-a" }),
    deps,
  );

  const body = await response.json();
  assert.equal(body.found, true);
  assert.equal(body.mapping.educationMaterial, null);
  const actions = audits.map((a) => a.action);
  assert.ok(actions.includes("education_not_available"));
  assert.ok(!actions.includes("education_material_loaded"));
});

test("CKE path returns assembly and writes CKE audit events when flags are on", async () => {
  const audits: Array<{ action: string }> = [];
  const deps = buildDeps({
    resolveFeatureFlag: async () => ({ resolvedValue: true }),
    resolveCkeConsentMapping: async () => ({
      found: true as const,
      mapping: staticFoundResult(true),
      package: {
        procedureConsent: {
          id: "form-1",
          titleEn: "Appendectomy Consent",
          titleAr: "",
          fileName: "appendectomy.pdf",
          publicPath: "/forms/appendectomy.pdf",
          specialty: "",
          templateType: "Surgical Consent",
          status: "ACTIVE" as const,
          source: "cke-assembly",
          requiresAnesthesia: false,
          isPatientCopy: false,
          isEducation: false,
          isAnesthesia: false,
          lengthBytes: 0,
        },
        matches: [],
      },
      clinicalKnowledgeAssembly: {
        assemblyId: "assembly-1",
        tenantId: "tenant-a",
        procedureId: "proc-1",
        procedureCode: "appendectomy",
        procedureNameEn: "Appendectomy",
        procedureNameAr: "استئصال الزائدة",
        packageId: "pkg-1",
        packageVersion: "1.0.0",
        status: "ready",
        educationMaterials: [],
        riskDisclosures: [],
        illustrations: [],
        decisionRules: [],
        suggestions: [],
        blockers: [],
        requiredParticipants: [],
        assembledAt: new Date().toISOString(),
      },
      educationNotAvailable: false,
      auditEvents: [
        { action: "cke_assembly_requested", summary: "s1", metadata: {} },
        { action: "consent_form_loaded_from_library", summary: "s2", metadata: {} },
        { action: "education_material_loaded", summary: "s3", metadata: {} },
      ],
    }),
    writeConsentAudit: async (args) => {
      audits.push({ action: args.action });
    },
  });

  const response = await handleContentMappingResolve(
    makeRequest({ procedure: "appendectomy", tenantId: "tenant-a", useCke: "true" }),
    deps,
  );

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.found, true);
  assert.equal(body.ckeEnabled, true);
  assert.equal(body.clinicalKnowledgeAssembly.procedureCode, "appendectomy");

  const actions = audits.map((a) => a.action);
  assert.deepEqual(actions, [
    "content_mapping_requested",
    "cke_assembly_requested",
    "consent_form_loaded_from_library",
    "education_material_loaded",
  ]);
});

test("CKE path falls back to static mapping and records fallback audit", async () => {
  const audits: Array<{ action: string }> = [];
  const deps = buildDeps({
    resolveFeatureFlag: async () => ({ resolvedValue: true }),
    resolveCkeConsentMapping: async () => ({
      found: false as const,
      fallbackReason: "PROCEDURE_NOT_FOUND",
      educationNotAvailable: false,
      auditEvents: [{ action: "cke_assembly_failed", summary: "fail", metadata: {} }],
    }),
    resolveContentMapping: async () => staticFoundResult(true),
    writeConsentAudit: async (args) => {
      audits.push({ action: args.action });
    },
  });

  const response = await handleContentMappingResolve(
    makeRequest({ procedure: "appendectomy", tenantId: "tenant-a", useCke: "true" }),
    deps,
  );

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.found, true);
  assert.equal(body.ckeEnabled, false);

  const actions = audits.map((a) => a.action);
  assert.ok(actions.includes("cke_assembly_failed"));
  assert.ok(actions.includes("content_mapping_fallback_used"));
  assert.ok(actions.includes("education_material_loaded"));
});

test("returns 400 when procedure is missing", async () => {
  const deps = buildDeps();
  const response = await handleContentMappingResolve(
    makeRequest({ tenantId: "tenant-a" }),
    deps,
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.ok, false);
});

test("returns 400 when tenant is missing", async () => {
  const deps = buildDeps({
    requireModuleOperationalAccess: async () =>
      ({
        sub: "user-1",
        tenant_id: null,
        role: "PHYSICIAN",
        platform_role: null,
      }) as unknown as ReturnType<ContentMappingResolveDependencies["requireModuleOperationalAccess"]>,
  });
  const response = await handleContentMappingResolve(
    makeRequest({ procedure: "appendectomy" }),
    deps,
  );
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.ok, false);
});
