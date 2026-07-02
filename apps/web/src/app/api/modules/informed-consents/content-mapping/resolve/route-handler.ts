import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import type {
  ContentMappingFound,
  ContentMappingResult,
  ImcConsentPackage,
  MappedConsentForm,
  MappedEducationMaterial,
} from "@/lib/server/content-mapping-service";
import type { CkeConsentMappingResult } from "@/lib/server/clinical-knowledge/informed-consent-integration";
import type {
  ClinicalKnowledgeAssembly,
  ClinicalKnowledgeConsentForm,
  ClinicalKnowledgeEducationMaterial,
  ClinicalKnowledgeIllustration,
} from "@/lib/clinical-knowledge/types";

export type ContentMappingResolveDependencies = {
  requireModuleOperationalAccess: (request: NextRequest, moduleKey: string) => Promise<AuthContext>;
  resolveFeatureFlag: (key: string, tenantId: string, moduleKey: string) => Promise<{ resolvedValue: boolean }>;
  writeConsentAudit: (args: {
    tenantId: string;
    auth: AuthContext;
    action: string;
    summary: string;
    source?: string;
    metadata?: Record<string, unknown>;
    request?: NextRequest;
  }) => Promise<void>;
  resolveContentMapping: (input: {
    procedure: string;
    tenantId: string;
    preferredLanguage?: "en" | "ar" | "bilingual";
  }) => Promise<ContentMappingResult>;
  buildImcConsentPackage: (result: ContentMappingFound) => ImcConsentPackage;
  resolveCkeConsentMapping: (
    input: { tenantId: string; procedureCode: string; patientContext?: { capacityStatus?: string; languagePreference?: string } },
    options?: { assemblyResolver?: unknown },
  ) => Promise<CkeConsentMappingResult>;
  getApprovedIllustrationsForProcedureByNames: (
    tenantId: string,
    names: string[],
  ) => Promise<ClinicalKnowledgeIllustration[]>;
};

function getTenantId(auth: { tenant_id?: string | null }, queryTenantId: string | null): string | null {
  if (queryTenantId) return queryTenantId;
  return auth.tenant_id ?? null;
}

function mapStaticConsentForm(
  tenantId: string,
  form: MappedConsentForm,
): ClinicalKnowledgeConsentForm {
  const now = new Date().toISOString();
  return {
    id: form.templateId,
    tenantId,
    code: form.templateCode,
    titleEn: form.titleEn,
    titleAr: form.titleAr,
    formType: form.templateCode as ClinicalKnowledgeConsentForm["formType"],
    riskLevel: "STANDARD",
    status: "PUBLISHED",
    version: "v1.0",
    effectiveDate: now,
    expiryDate: null,
    governanceSnapshot: null,
    pdfTemplateUrl: form.publicPath,
    requiresWitness: false,
    requiresInterpreter: false,
    createdByUserId: "",
    publishedByUserId: null,
    createdAt: now,
    updatedAt: now,
    sections: [],
  };
}

function mapStaticEducationMaterial(
  tenantId: string,
  material: MappedEducationMaterial,
): ClinicalKnowledgeEducationMaterial {
  const now = new Date().toISOString();
  return {
    id: material.educationId,
    tenantId,
    code: material.assetId,
    titleEn: material.titleEn,
    titleAr: material.titleAr,
    assetType: material.assetType as ClinicalKnowledgeEducationMaterial["assetType"],
    assetUrl: material.publicPath,
    durationMinutes: material.durationMinutes ?? null,
    status: "PUBLISHED",
    version: "v1.0",
    effectiveDate: now,
    expiryDate: null,
    governanceSnapshot: null,
    createdByUserId: "",
    publishedByUserId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function buildStaticClinicalKnowledgeAssembly(
  tenantId: string,
  mapping: ContentMappingFound,
  pkg: ImcConsentPackage,
): ClinicalKnowledgeAssembly {
  const now = new Date().toISOString();
  const consentForm = mapping.consentForm
    ? mapStaticConsentForm(tenantId, mapping.consentForm)
    : undefined;

  const educationMaterials = mapping.educationMaterial
    ? [mapStaticEducationMaterial(tenantId, mapping.educationMaterial)]
    : [];

  return {
    assemblyId: randomUUID(),
    tenantId,
    procedureId: mapping.procedureCatalogId ?? mapping.procedureId,
    procedureCode: mapping.procedureId,
    procedureNameEn: mapping.procedureNameEn,
    procedureNameAr: mapping.procedureNameAr,
    packageId: pkg.procedureConsent?.id ?? mapping.procedureId,
    packageVersion: mapping.version,
    status: "ready",
    consentForm,
    educationMaterials,
    riskDisclosures: [],
    illustrations: [],
    decisionRules: [],
    suggestions: [],
    blockers: [],
    requiredParticipants: mapping.anesthesiaRequired ? ["witness"] : [],
    packageSnapshot: null,
    assembledAt: now,
  };
}

export async function handleContentMappingResolve(
  request: NextRequest,
  deps: ContentMappingResolveDependencies,
) {
  const auth = await deps.requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);

  const procedure = (searchParams.get("procedure") || "").trim();
  const tenantId = getTenantId(auth, searchParams.get("tenantId"));
  const preferredLanguage = (searchParams.get("language") || "bilingual") as
    | "en"
    | "ar"
    | "bilingual";
  const useCke = searchParams.get("useCke") === "true";

  if (!procedure) {
    return NextResponse.json(
      { ok: false, error: "Missing required parameter: procedure" },
      { status: 400 },
    );
  }

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "Missing tenant context" },
      { status: 400 },
    );
  }

  const flag = await deps.resolveFeatureFlag(
    "ENABLE_CONTENT_MAPPING_ENGINE",
    tenantId,
    "informed-consents",
  );

  if (!flag.resolvedValue) {
    return NextResponse.json({
      ok: true,
      found: false,
      featureFlagEnabled: false,
    });
  }

  await deps.writeConsentAudit({
    tenantId,
    auth,
    action: "content_mapping_requested",
    summary: `Content mapping requested for "${procedure}"`,
    source: "content-mapping-service",
    metadata: {
      procedure,
      tenantId,
      preferredLanguage,
      useCke,
    },
    request,
  });

  // ── CKE branch (behind flags) ──────────────────────────────────────────────
  if (useCke) {
    const ckeMaster = await deps.resolveFeatureFlag(
      "ENABLE_CLINICAL_KNOWLEDGE_ENGINE",
      tenantId,
      "informed-consents",
    );
    const ckeAssembly = await deps.resolveFeatureFlag(
      "ENABLE_CKE_PACKAGE_ASSEMBLY",
      tenantId,
      "informed-consents",
    );

    if (ckeMaster.resolvedValue && ckeAssembly.resolvedValue) {
      const ckeResult = await deps.resolveCkeConsentMapping({
        tenantId,
        procedureCode: procedure,
        patientContext: { capacityStatus: "competent", languagePreference: preferredLanguage },
      });

      for (const event of ckeResult.auditEvents) {
        await deps.writeConsentAudit({
          tenantId,
          auth,
          action: event.action,
          summary: event.summary,
          source: "clinical-knowledge-engine",
          metadata: event.metadata,
          request,
        });
      }

      if (ckeResult.found) {
        return NextResponse.json({
          ok: true,
          found: true,
          featureFlagEnabled: true,
          ckeEnabled: true,
          mapping: ckeResult.mapping,
          package: ckeResult.package,
          clinicalKnowledgeAssembly: ckeResult.clinicalKnowledgeAssembly,
          educationNotAvailable: ckeResult.educationNotAvailable,
        });
      }

      await deps.writeConsentAudit({
        tenantId,
        auth,
        action: "content_mapping_fallback_used",
        summary: `CKE did not resolve "${procedure}" (${ckeResult.fallbackReason}); falling back to static content mapping`,
        source: "clinical-knowledge-engine",
        metadata: {
          procedure,
          tenantId,
          fallbackReason: ckeResult.fallbackReason,
        },
        request,
      });
    }
  }

  // ── Static IMC content-mapping branch ───────────────────────────────────────
  const result = await deps.resolveContentMapping({
    procedure,
    tenantId,
    preferredLanguage,
  });

  if (!result.found) {
    await deps.writeConsentAudit({
      tenantId,
      auth,
      action: "content_mapping_not_found",
      summary: `No content mapping found for "${procedure}"`,
      source: "content-mapping-service",
      metadata: {
        procedure,
        tenantId,
      },
      request,
    });

    return NextResponse.json({
      ok: true,
      found: false,
      featureFlagEnabled: true,
      ckeEnabled: false,
      procedureName: result.procedureName,
      availableProcedures: result.availableProcedures,
    });
  }

  await deps.writeConsentAudit({
    tenantId,
    auth,
    action: "consent_form_loaded_from_library",
    summary: `Consent form resolved for ${result.procedureNameEn}`,
    source: "content-mapping-service",
    metadata: {
      procedureNameEn: result.procedureNameEn,
      procedureNameAr: result.procedureNameAr,
      procedureCatalogId: result.procedureCatalogId,
      templateId: result.consentForm.templateId,
      templateVersionId: result.consentForm.templateVersionId,
      templateCode: result.consentForm.templateCode,
      version: result.version,
      language: result.language,
      specialty: result.specialty,
    },
    request,
  });

  if (result.educationMaterial) {
    await deps.writeConsentAudit({
      tenantId,
      auth,
      action: "education_material_loaded",
      summary: `Education material resolved for ${result.procedureNameEn}`,
      source: "content-mapping-service",
      metadata: {
        procedureNameEn: result.procedureNameEn,
        procedureNameAr: result.procedureNameAr,
        educationAssetId: result.educationMaterial.assetId,
        educationId: result.educationMaterial.educationId,
        fileName: result.educationMaterial.fileName,
        assetType: result.educationMaterial.assetType,
        language: result.language,
        specialty: result.specialty,
      },
      request,
    });
  } else {
    await deps.writeConsentAudit({
      tenantId,
      auth,
      action: "education_not_available",
      summary: `No education material available for ${result.procedureNameEn}`,
      source: "content-mapping-service",
      metadata: {
        procedureNameEn: result.procedureNameEn,
        procedureNameAr: result.procedureNameAr,
        procedureCatalogId: result.procedureCatalogId,
        specialty: result.specialty,
      },
      request,
    });
  }

  const pkg = deps.buildImcConsentPackage(result);
  const clinicalKnowledgeAssembly = buildStaticClinicalKnowledgeAssembly(tenantId, result, pkg);

  const staticIllustrations = await deps.getApprovedIllustrationsForProcedureByNames(tenantId, [
    result.procedureNameEn,
    result.procedureNameAr,
  ]);
  clinicalKnowledgeAssembly.illustrations = staticIllustrations;

  return NextResponse.json({
    ok: true,
    found: true,
    featureFlagEnabled: true,
    ckeEnabled: false,
    mapping: result,
    package: pkg,
    clinicalKnowledgeAssembly,
  });
}
