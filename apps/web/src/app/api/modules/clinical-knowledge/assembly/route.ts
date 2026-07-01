import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { assembleKnowledgePackage } from "@/lib/server/clinical-knowledge/services";
import { handleApiError } from "@/lib/server/http";
import type { ClinicalKnowledgeAssemblyRequest } from "@/lib/clinical-knowledge/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTenantId(auth: { tenant_id?: string | null }, queryTenantId: string | null): string | null {
  if (queryTenantId) return queryTenantId;
  return auth.tenant_id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const { searchParams } = new URL(request.url);
    const tenantId = getTenantId(auth, searchParams.get("tenantId"));

    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "Missing tenant context" },
        { status: 400 },
      );
    }

    const flag = await resolveFeatureFlag(
      "ENABLE_CLINICAL_KNOWLEDGE_ENGINE",
      tenantId,
      "informed-consents",
    );

    if (!flag.resolvedValue) {
      return NextResponse.json({
        ok: true,
        featureFlagEnabled: false,
        found: false,
        fallbackReason: "FEATURE_FLAG_OFF",
      });
    }

    const assemblyFlag = await resolveFeatureFlag(
      "ENABLE_CKE_PACKAGE_ASSEMBLY",
      tenantId,
      "informed-consents",
    );

    if (!assemblyFlag.resolvedValue) {
      return NextResponse.json({
        ok: true,
        featureFlagEnabled: true,
        assemblyEnabled: false,
        found: false,
        fallbackReason: "ASSEMBLY_FLAG_OFF",
      });
    }

    const body = (await request.json()) as Partial<ClinicalKnowledgeAssemblyRequest>;
    const procedureCode = body.procedureCode?.trim();

    if (!procedureCode) {
      return NextResponse.json(
        { ok: false, error: "procedureCode is required" },
        { status: 400 },
      );
    }

    const result = await assembleKnowledgePackage({
      tenantId,
      procedureCode,
      patientContext: body.patientContext,
      physicianContext: body.physicianContext,
    });

    return NextResponse.json({
      ok: true,
      featureFlagEnabled: true,
      assemblyEnabled: true,
      found: result.found,
      fallbackReason: result.fallbackReason,
      assembly: result.assembly,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
