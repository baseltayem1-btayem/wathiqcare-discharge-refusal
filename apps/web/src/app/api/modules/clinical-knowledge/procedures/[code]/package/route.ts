import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { getEffectivePackageForProcedure } from "@/lib/server/clinical-knowledge/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTenantId(auth: { tenant_id?: string | null }, queryTenantId: string | null): string | null {
  if (queryTenantId) return queryTenantId;
  return auth.tenant_id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);
  const tenantId = getTenantId(auth, searchParams.get("tenantId"));
  const { code } = await params;

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
    });
  }

  const result = await getEffectivePackageForProcedure({
    tenantId,
    procedureCode: decodeURIComponent(code),
  });

  if (!result.found) {
    return NextResponse.json(
      {
        ok: true,
        featureFlagEnabled: true,
        assemblyEnabled: true,
        found: false,
        fallbackReason: result.fallbackReason,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    featureFlagEnabled: true,
    assemblyEnabled: true,
    found: true,
    package: result.package,
  });
}
