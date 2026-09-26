import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { clinicalContentRegistry } from "@/lib/server/clinical-content";
import type { ContentSearchFilters } from "@/lib/clinical-content/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getTenantId(auth: { tenant_id?: string | null }, queryTenantId: string | null): string | null {
  if (queryTenantId) return queryTenantId;
  return auth.tenant_id ?? null;
}

export async function GET(request: NextRequest) {
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
    "ENABLE_APPROVED_FORMS_V2",
    tenantId,
    "informed-consents",
  );

  if (!flag.resolvedValue) {
    return NextResponse.json({
      ok: true,
      featureFlagEnabled: false,
      items: [],
      total: 0,
      filters: {},
      facets: { specialties: [], categories: [], riskLevels: [], statuses: [] },
    });
  }

  const filters: ContentSearchFilters = {
    q: searchParams.get("q") || undefined,
    category: searchParams.get("category") || undefined,
    specialty: searchParams.get("specialty") || undefined,
    riskLevel: (searchParams.get("riskLevel") as ContentSearchFilters["riskLevel"]) || undefined,
    status: (searchParams.get("status") as ContentSearchFilters["status"]) || undefined,
    language: (searchParams.get("language") as ContentSearchFilters["language"]) || undefined,
  };

  const result = clinicalContentRegistry.search("approved-form", filters);

  return NextResponse.json({
    ok: true,
    featureFlagEnabled: true,
    ...result,
  });
}
