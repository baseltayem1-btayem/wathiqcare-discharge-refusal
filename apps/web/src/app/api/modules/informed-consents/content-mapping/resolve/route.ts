import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import {
  resolveContentMapping,
  buildImcConsentPackage,
  type ContentMappingFound,
} from "@/lib/server/content-mapping-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTenantId(auth: { tenant_id?: string | null }, queryTenantId: string | null): string | null {
  if (queryTenantId) return queryTenantId;
  return auth.tenant_id ?? null;
}

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);

  const procedure = (searchParams.get("procedure") || "").trim();
  const tenantId = getTenantId(auth, searchParams.get("tenantId"));
  const preferredLanguage = (searchParams.get("language") || "bilingual") as
    | "en"
    | "ar"
    | "bilingual";

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

  const flag = await resolveFeatureFlag(
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

  await writeConsentAudit({
    tenantId,
    auth,
    action: "content_mapping_requested",
    summary: `Content mapping requested for "${procedure}"`,
    source: "content-mapping-service",
    metadata: {
      procedure,
      tenantId,
      preferredLanguage,
    },
    request,
  });

  const result = await resolveContentMapping({
    procedure,
    tenantId,
    preferredLanguage,
  });

  if (!result.found) {
    await writeConsentAudit({
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
      procedureName: result.procedureName,
      availableProcedures: result.availableProcedures,
    });
  }

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_form_loaded_from_library",
    summary: `Consent form resolved for ${result.procedureNameEn}`,
    source: "content-mapping-service",
    templateId: result.consentForm.templateId,
    templateVersionId: result.consentForm.templateVersionId,
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
    await writeConsentAudit({
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
    await writeConsentAudit({
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

  const pkg = buildImcConsentPackage(result as ContentMappingFound);

  return NextResponse.json({
    ok: true,
    found: true,
    featureFlagEnabled: true,
    mapping: result,
    package: pkg,
  });
}
