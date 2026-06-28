import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { resolveFeatureFlag } from "@/lib/server/tenant-flag-service";
import {
  listEducationMaterials,
  getEducationMaterial,
  evaluateComprehension,
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
  const materialId = searchParams.get("materialId") || undefined;

  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "Missing tenant context" },
      { status: 400 },
    );
  }

  const flag = await resolveFeatureFlag(
    "ENABLE_PATIENT_EDUCATION_ENGINE",
    tenantId,
    "informed-consents",
  );

  if (!flag.resolvedValue) {
    return NextResponse.json({
      ok: true,
      featureFlagEnabled: false,
      items: [],
      material: null,
    });
  }

  if (materialId) {
    const material = getEducationMaterial(materialId);
    return NextResponse.json({
      ok: true,
      featureFlagEnabled: true,
      material,
    });
  }

  return NextResponse.json({
    ok: true,
    featureFlagEnabled: true,
    items: listEducationMaterials(),
    total: listEducationMaterials().length,
  });
}

export async function POST(request: NextRequest) {
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
    "ENABLE_PATIENT_EDUCATION_ENGINE",
    tenantId,
    "informed-consents",
  );

  if (!flag.resolvedValue) {
    return NextResponse.json(
      { ok: false, error: "Patient Education Engine is not enabled" },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    materialId?: string;
    answers?: Record<string, string>;
    durationSeconds?: number;
    attempts?: number;
  };

  if (!body.materialId) {
    return NextResponse.json(
      { ok: false, error: "Missing materialId" },
      { status: 400 },
    );
  }

  const result = evaluateComprehension({
    materialId: body.materialId,
    answers: body.answers || {},
    durationSeconds: body.durationSeconds,
    attempts: body.attempts ?? 1,
  });

  return NextResponse.json({
    ok: true,
    featureFlagEnabled: true,
    result,
  });
}
