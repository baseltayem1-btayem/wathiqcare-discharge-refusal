import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import {
  resolveProcedureMapping,
  listProcedureNames,
  clinicalContentRegistry,
} from "@/lib/server/clinical-content";

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
  const procedure = (searchParams.get("procedure") || "").trim();

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "Missing tenant context" },
      { status: 400 },
    );
  }

  const flag = await resolveFeatureFlag(
    "ENABLE_PROCEDURE_MAPPING_ENGINE_V2",
    tenantId,
    "informed-consents",
  );

  // List endpoint (no procedure param)
  if (!procedure) {
    if (!flag.resolvedValue) {
      return NextResponse.json({
        ok: true,
        featureFlagEnabled: false,
        procedures: [],
      });
    }

    return NextResponse.json({
      ok: true,
      featureFlagEnabled: true,
      procedures: clinicalContentRegistry.listProcedures().map((p) => ({
        id: p.id,
        titleEn: p.titleEn,
        titleAr: p.titleAr,
        specialty: p.specialty,
        department: p.department,
        anesthesiaRequired: p.anesthesiaRequired,
      })),
      total: clinicalContentRegistry.listProcedures().length,
    });
  }

  // Resolve endpoint
  if (!flag.resolvedValue) {
    return NextResponse.json({
      ok: true,
      featureFlagEnabled: false,
      found: false,
      procedureName: procedure,
    });
  }

  const result = resolveProcedureMapping({ procedure });

  return NextResponse.json({
    ok: true,
    featureFlagEnabled: true,
    ...result,
    availableProcedures: listProcedureNames(),
  });
}
