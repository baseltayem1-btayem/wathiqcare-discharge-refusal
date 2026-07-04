import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { listContentMappingCatalog } from "@/lib/server/content-mapping-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId") || auth.tenant_id || "";

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
      items: [],
      featureFlagEnabled: false,
    });
  }

  const items = listContentMappingCatalog();

  return NextResponse.json({
    ok: true,
    items,
    featureFlagEnabled: true,
    generatedAt: new Date().toISOString(),
  });
}
