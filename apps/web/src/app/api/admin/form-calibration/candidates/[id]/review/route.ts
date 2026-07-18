import { NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import type { NextRequest } from "next/server";
import type { CalibrationCandidateStatus } from "@prisma/client";

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

  const updated = await prisma.$transaction(async (tx) => {
    const candidate = await tx.formCalibrationCandidate.update({
      where: { id },
      data: {
        status: statusFromDecision[body.decision] as CalibrationCandidateStatus,
        reviewDecision: body.decision,
        reviewNotes: body.notes ?? null,
        reviewedByUserId: auth.sub,
      },
    });

    // Human approval creates a new versioned manifest record; it never updates
    // an existing approved manifest in place.
    let manifest = null;
    if (body.decision === "APPROVE") {
      manifest = await tx.formCalibrationManifest.create({
        data: {
          tenantId,
          name: `Auto-calibrated ${candidate.sourceFormId} (${candidate.id.slice(0, 8)})`,
          description: body.notes ?? `Approved calibration manifest for ${candidate.sourceFormId}`,
          sourceFormIds: [candidate.sourceFormId],
          isActive: true,
          metadata: {
            candidateId: candidate.id,
            sourceFileName: candidate.sourceFileName,
            approvedByUserId: auth.sub,
            approvedAt: new Date().toISOString(),
            mappings: candidate.mappings ?? [],
            qualityScore: candidate.qualityScore,
          },
        },
      });
    }

    return { candidate, manifest };
  });

  return NextResponse.json({ ok: true, candidate: updated.candidate, manifest: updated.manifest });
}
