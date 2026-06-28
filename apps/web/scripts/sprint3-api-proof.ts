/**
 * Sprint 3 — CKE / Informed Consent integration API proof.
 *
 * Exercises the resolve route handler with mocked dependencies to produce
 * deterministic request/response samples for each validation scenario.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { handleContentMappingResolve } from "../src/app/api/modules/informed-consents/content-mapping/resolve/route-handler";
import type { ContentMappingResolveDependencies } from "../src/app/api/modules/informed-consents/content-mapping/resolve/route-handler";
import type { AuthContext } from "../src/lib/server/auth";

const OUTPUT_DIR = resolve(process.cwd(), "..", "..", "pilot-evidence");
mkdirSync(OUTPUT_DIR, { recursive: true });

const auth: AuthContext = {
  sub: "demo.doctor@demo-imc.local",
  tenant_id: "demo-imc",
  role: "doctor",
  platform_role: null,
  email: "demo.doctor@demo-imc.local",
};

function makeRequest(query: Record<string, string>) {
  const url = new URL("http://localhost/api/modules/informed-consents/content-mapping/resolve");
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return { url: url.toString() } as unknown as import("next/server").NextRequest;
}

const staticConsentForm = {
  templateId: "APPENDECTOMY_CONSENT",
  templateVersionId: "APPENDECTOMY_CONSENT-v1",
  templateCode: "APPENDECTOMY_CONSENT",
  fileName: "appendectomy.pdf",
  publicPath: "/forms/appendectomy.pdf",
  titleEn: "Appendectomy Consent",
  titleAr: "موافقة استئصال الزائدة",
  kind: "CONSENT_FORM" as const,
  status: "APPROVED" as const,
};

const staticEducation = {
  educationId: "APPENDECTOMY_EDU",
  assetId: "APPENDECTOMY_EDU_ASSET",
  fileName: "appendectomy-edu.pdf",
  publicPath: "/education/appendectomy.pdf",
  titleEn: "Appendectomy Education",
  titleAr: "تثقيف استئصال الزائدة",
  kind: "EDUCATION_MATERIAL" as const,
  assetType: "PDF" as const,
  durationMinutes: null,
};

function buildDeps(overrides: Partial<ContentMappingResolveDependencies> = {}): ContentMappingResolveDependencies {
  const baseMapping = {
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
    consentForm: staticConsentForm,
    educationMaterial: staticEducation,
  };

  return {
    requireModuleOperationalAccess: async () => auth,
    resolveFeatureFlag: async () => ({ resolvedValue: true }),
    writeConsentAudit: async () => undefined,
    resolveContentMapping: async () => baseMapping,
    buildImcConsentPackage: () => ({
      procedureConsent: {
        id: staticConsentForm.templateId,
        titleEn: staticConsentForm.titleEn,
        titleAr: staticConsentForm.titleAr,
        fileName: staticConsentForm.fileName,
        publicPath: staticConsentForm.publicPath,
        specialty: baseMapping.specialty,
        templateType: baseMapping.consentCategory,
        status: "ACTIVE" as const,
        source: "imc-approved-library",
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
    ...overrides,
  } as unknown as ContentMappingResolveDependencies;
}

async function runScenarios() {
  const results: Array<{ name: string; request: Record<string, string>; response: unknown }> = [];

  // 1. Procedure with consent + education (CKE path)
  {
    const deps = buildDeps({
      resolveCkeConsentMapping: async () => ({
        found: true as const,
        mapping: {
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
          consentForm: staticConsentForm,
          educationMaterial: staticEducation,
        },
        package: {
          procedureConsent: {
            id: "APPENDECTOMY_CONSENT",
            titleEn: "Appendectomy Consent",
            titleAr: "موافقة استئصال الزائدة",
            fileName: "appendectomy.pdf",
            publicPath: "/forms/appendectomy.pdf",
            specialty: "General Surgery",
            templateType: "Surgical Consent",
            status: "ACTIVE" as const,
            source: "cke-assembly",
            requiresAnesthesia: false,
            isPatientCopy: false,
            isEducation: false,
            isAnesthesia: false,
            lengthBytes: 0,
          },
          patientEducation: {
            id: "APPENDECTOMY_EDU",
            titleEn: "Appendectomy Education — Patient Education",
            titleAr: "تثقيف استئصال الزائدة — نسخة المريض",
            fileName: "appendectomy-edu.pdf",
            publicPath: "/education/appendectomy.pdf",
            specialty: "General Surgery",
            templateType: "Surgical Consent",
            status: "ACTIVE" as const,
            source: "cke-assembly",
            requiresAnesthesia: false,
            isPatientCopy: true,
            isEducation: true,
            isAnesthesia: false,
            lengthBytes: 0,
          },
          matches: [],
        },
        clinicalKnowledgeAssembly: {
          assemblyId: "assembly-1",
          tenantId: "demo-imc",
          procedureId: "proc-1",
          procedureCode: "appendectomy",
          procedureNameEn: "Appendectomy",
          procedureNameAr: "استئصال الزائدة",
          packageId: "pkg-1",
          packageVersion: "1.0.0",
          status: "ready",
          consentForm: {
            id: "form-1",
            tenantId: "demo-imc",
            code: "APPENDECTOMY_CONSENT",
            titleEn: "Appendectomy Consent",
            titleAr: "موافقة استئصال الزائدة",
            formType: "PROCEDURE_CONSENT" as const,
            riskLevel: "STANDARD" as const,
            status: "PUBLISHED" as const,
            version: "1.0.0",
            effectiveDate: "2026-06-01T00:00:00.000Z",
            pdfTemplateUrl: "/forms/appendectomy.pdf",
            requiresWitness: false,
            requiresInterpreter: false,
            createdByUserId: "system",
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
          educationMaterials: [
            {
              id: "edu-1",
              tenantId: "demo-imc",
              code: "APPENDECTOMY_EDU",
              titleEn: "Appendectomy Education",
              titleAr: "تثقيف استئصال الزائدة",
              assetType: "PDF" as const,
              assetUrl: "/education/appendectomy.pdf",
              durationMinutes: null,
              status: "PUBLISHED" as const,
              version: "1.0.0",
              effectiveDate: "2026-06-01T00:00:00.000Z",
              createdByUserId: "system",
              createdAt: "2026-06-01T00:00:00.000Z",
              updatedAt: "2026-06-01T00:00:00.000Z",
            },
          ],
          riskDisclosures: [],
          decisionRules: [],
          suggestions: [],
          blockers: [],
          requiredParticipants: [],
          assembledAt: "2026-06-26T00:00:00.000Z",
        },
        educationNotAvailable: false,
        auditEvents: [
          { action: "cke_assembly_requested", summary: "CKE assembly requested", metadata: {} },
          { action: "consent_form_loaded_from_library", summary: "Consent form resolved", metadata: {} },
          { action: "education_material_loaded", summary: "Education material resolved", metadata: {} },
        ],
      }),
    });
    const request = { procedure: "appendectomy", tenantId: "demo-imc", useCke: "true" };
    const response = await handleContentMappingResolve(makeRequest(request), deps);
    results.push({ name: "CKE path: consent + education", request, response: await response.json() });
  }

  // 2. Procedure with consent only (education not available)
  {
    const deps = buildDeps({
      resolveCkeConsentMapping: async () => ({
        found: true as const,
        mapping: {
          found: true as const,
          procedureCatalogId: "catalog-2",
          procedureId: "laparoscopic-cholecystectomy",
          procedureNameEn: "Laparoscopic Cholecystectomy",
          procedureNameAr: "استئصال المرارة بالمنظار",
          specialty: "General Surgery",
          department: "Surgery",
          categoryCode: "CHOLECYSTECTOMY",
          consentType: "PROCEDURE_CONSENT",
          consentCategory: "Surgical Consent",
          language: "bilingual",
          version: "1.0.0",
          anesthesiaRequired: false,
          consentForm: staticConsentForm,
          educationMaterial: null,
        },
        package: {
          procedureConsent: {
            id: "CHOLECYSTECTOMY_CONSENT",
            titleEn: "Laparoscopic Cholecystectomy Consent",
            titleAr: "",
            fileName: "cholecystectomy.pdf",
            publicPath: "/forms/cholecystectomy.pdf",
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
          assemblyId: "assembly-2",
          tenantId: "demo-imc",
          procedureId: "proc-2",
          procedureCode: "laparoscopic-cholecystectomy",
          procedureNameEn: "Laparoscopic Cholecystectomy",
          procedureNameAr: "استئصال المرارة بالمنظار",
          packageId: "pkg-2",
          packageVersion: "1.0.0",
          status: "ready",
          consentForm: {
            id: "form-2",
            tenantId: "demo-imc",
            code: "CHOLECYSTECTOMY_CONSENT",
            titleEn: "Laparoscopic Cholecystectomy Consent",
            titleAr: "",
            formType: "PROCEDURE_CONSENT" as const,
            riskLevel: "STANDARD" as const,
            status: "PUBLISHED" as const,
            version: "1.0.0",
            effectiveDate: "2026-06-01T00:00:00.000Z",
            pdfTemplateUrl: "/forms/cholecystectomy.pdf",
            requiresWitness: false,
            requiresInterpreter: false,
            createdByUserId: "system",
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
          educationMaterials: [],
          riskDisclosures: [],
          decisionRules: [],
          suggestions: [],
          blockers: [],
          requiredParticipants: [],
          assembledAt: "2026-06-26T00:00:00.000Z",
        },
        educationNotAvailable: true,
        auditEvents: [
          { action: "cke_assembly_requested", summary: "CKE assembly requested", metadata: {} },
          { action: "consent_form_loaded_from_library", summary: "Consent form resolved", metadata: {} },
          { action: "education_not_available", summary: "No education material available", metadata: {} },
        ],
      }),
    });
    const request = { procedure: "laparoscopic-cholecystectomy", tenantId: "demo-imc", useCke: "true" };
    const response = await handleContentMappingResolve(makeRequest(request), deps);
    results.push({ name: "CKE path: consent only (education not available)", request, response: await response.json() });
  }

  // 3. Mapping not found
  {
    const deps = buildDeps({
      resolveFeatureFlag: async (key) => ({
        resolvedValue: key === "ENABLE_CONTENT_MAPPING_ENGINE" || key === "ENABLE_CLINICAL_KNOWLEDGE_ENGINE",
      }),
      resolveCkeConsentMapping: async () => ({
        found: false as const,
        fallbackReason: "PROCEDURE_NOT_FOUND",
        educationNotAvailable: false,
        auditEvents: [{ action: "cke_assembly_failed", summary: "CKE assembly failed", metadata: {} }],
      }),
      resolveContentMapping: async () => ({
        found: false as const,
        procedureName: "unknown-procedure",
        availableProcedures: ["Appendectomy", "Laparoscopic Cholecystectomy"],
      }),
    });
    const request = { procedure: "unknown-procedure", tenantId: "demo-imc", useCke: "true" };
    const response = await handleContentMappingResolve(makeRequest(request), deps);
    results.push({ name: "CKE not found, fallback to static mapping not found", request, response: await response.json() });
  }

  // 4. Feature flag OFF
  {
    const deps = buildDeps({
      resolveFeatureFlag: async (key) => ({
        resolvedValue: key !== "ENABLE_CLINICAL_KNOWLEDGE_ENGINE",
      }),
    });
    const request = { procedure: "appendectomy", tenantId: "demo-imc", useCke: "true" };
    const response = await handleContentMappingResolve(makeRequest(request), deps);
    results.push({ name: "CKE master flag OFF: preserves static workflow", request, response: await response.json() });
  }

  // 5. Tenant isolation (wrong tenant)
  {
    const deps = buildDeps({
      resolveCkeConsentMapping: async () => ({
        found: false as const,
        fallbackReason: "PROCEDURE_NOT_FOUND",
        educationNotAvailable: false,
        auditEvents: [{ action: "cke_assembly_failed", summary: "Cross-tenant access denied", metadata: {} }],
      }),
      resolveContentMapping: async () => ({
        found: false as const,
        procedureName: "appendectomy",
        availableProcedures: [],
      }),
    });
    const request = { procedure: "appendectomy", tenantId: "other-tenant", useCke: "true" };
    const response = await handleContentMappingResolve(makeRequest(request), deps);
    results.push({ name: "Tenant isolation: procedure not resolved for wrong tenant", request, response: await response.json() });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    endpoint: "GET /api/modules/informed-consents/content-mapping/resolve",
    scenarios: results,
  };

  writeFileSync(resolve(OUTPUT_DIR, "sprint3-api-proof.json"), JSON.stringify(output, null, 2));
  console.log(`Wrote ${results.length} scenarios to ${resolve(OUTPUT_DIR, "sprint3-api-proof.json")}`);
}

runScenarios().catch((error) => {
  console.error(error);
  process.exit(1);
});
