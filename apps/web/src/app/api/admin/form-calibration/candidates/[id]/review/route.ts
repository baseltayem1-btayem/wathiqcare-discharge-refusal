import { NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAccess(request);
  const tenantId = auth.tenant_id ?? "";
  const { id } = await params;

  const body = (await request.json()) as {
    decision: "APPROVE" | "REJECT" | "REQUEST_MANUAL";
    notes?: string;
  };

  if (!body.decision || !["APPROVE", "REJECT", "REQUEST_MANUAL"].includes(body.decision)) {
    return NextResponse.json(
      { ok: false, error: "Invalid decision. Use APPROVE, REJECT, or REQUEST_MANUAL." },
      { status: 400 },
    );
  }

  const statusFromDecision: Record<string, string> = {
    APPROVE: "APPROVED",
    REJECT: "REJECTED",
    REQUEST_MANUAL: "MANUAL_CALIBRATION_REQUIRED",
  };

  const prisma = getPrisma();
  const existing = await prisma.formCalibrationCandidate.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
  }

  const candidate = await prisma.formCalibrationCandidate.update({
    where: { id },
    data: {
      status: statusFromDecision[body.decision] as any,
      reviewDecision: body.decision,
      reviewNotes: body.notes ?? null,
      reviewedByUserId: auth.sub,
    },
  });

  return NextResponse.json({ ok: true, candidate });
}
