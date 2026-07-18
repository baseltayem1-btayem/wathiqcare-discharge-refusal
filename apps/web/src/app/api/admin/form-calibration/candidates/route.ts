import { NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformAccess(request);
  const tenantId = auth.tenant_id ?? "";
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as
    | "PENDING"
    | "AUTO_REVIEW_CANDIDATE"
    | "ASSISTED_REVIEW"
    | "MANUAL_CALIBRATION_REQUIRED"
    | "APPROVED"
    | "REJECTED"
    | null;

  const prisma = getPrisma();
  const candidates = await prisma.formCalibrationCandidate.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, candidates });
}
