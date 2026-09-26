import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { publishPackage } from "@/lib/server/clinical-knowledge/services";
import { handleApiError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTenantId(auth: { tenant_id?: string | null }, queryTenantId: string | null): string | null {
  if (queryTenantId) return queryTenantId;
  return auth.tenant_id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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
      "ENABLE_CKE_GOVERNANCE_UI",
      tenantId,
      "informed-consents",
    );

    if (!flag.resolvedValue) {
      return NextResponse.json(
        { ok: false, error: "Governance UI is disabled" },
        { status: 403 },
      );
    }

    const actorUserId = auth.sub;
    const pkg = await publishPackage(tenantId, id, actorUserId);

    return NextResponse.json({
      ok: true,
      package: pkg,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
