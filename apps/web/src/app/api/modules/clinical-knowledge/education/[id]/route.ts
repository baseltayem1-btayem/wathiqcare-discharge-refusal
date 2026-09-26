import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { getEducationMaterialById } from "@/lib/server/clinical-knowledge/services";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTenantId(auth: { tenant_id?: string | null }, queryTenantId: string | null): string | null {
  if (queryTenantId) return queryTenantId;
  return auth.tenant_id ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);
  const tenantId = getTenantId(auth, searchParams.get("tenantId"));
  const { id } = await params;

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

  const education = await getEducationMaterialById(tenantId, id);

  if (!education) {
    return NextResponse.json(
      { ok: true, featureFlagEnabled: true, found: false, error: "Education material not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    featureFlagEnabled: true,
    found: true,
    education,
  });
}
