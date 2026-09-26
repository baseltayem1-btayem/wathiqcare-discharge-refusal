import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import { listGovernanceEvents } from "@/lib/server/clinical-knowledge/services";
import type { ClinicalKnowledgeGovernanceEntityType } from "@/lib/clinical-knowledge/types";

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
    "ENABLE_CLINICAL_KNOWLEDGE_ENGINE",
    tenantId,
    "informed-consents",
  );

  if (!flag.resolvedValue) {
    return NextResponse.json({
      ok: true,
      featureFlagEnabled: false,
      items: [],
      total: 0,
    });
  }

  const entityType = (searchParams.get("entityType") || undefined) as
    | ClinicalKnowledgeGovernanceEntityType
    | undefined;
  const entityId = searchParams.get("entityId") || undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

  const result = await listGovernanceEvents({
    tenantId,
    entityType,
    entityId,
    limit,
    offset,
  });

  return NextResponse.json({
    ok: true,
    featureFlagEnabled: true,
    ...result,
  });
}
