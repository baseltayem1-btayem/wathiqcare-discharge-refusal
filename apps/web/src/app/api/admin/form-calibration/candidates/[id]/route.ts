import { NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAccess(request);
  const tenantId = auth.tenant_id ?? "";
  const { id } = await params;

  const prisma = getPrisma();
  const candidate = await prisma.formCalibrationCandidate.findFirst({
    where: { id, tenantId },
  });

  if (!candidate) {
    return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, candidate });
}
