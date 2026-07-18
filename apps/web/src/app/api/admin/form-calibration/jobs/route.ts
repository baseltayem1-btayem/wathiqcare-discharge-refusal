import { NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformAccess(request);
  const tenantId = auth.tenant_id ?? "";

  const prisma = getPrisma();
  const jobs = await prisma.formCalibrationJob.findMany({
    where: { tenantId },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: {
      _count: { select: { candidates: true } },
    },
  });

  return NextResponse.json({ ok: true, jobs });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAccess(request);
  const tenantId = auth.tenant_id ?? "";

  const body = (await request.json()) as {
    jobType: string;
    manifestId?: string;
    totalForms?: number;
  };

  const prisma = getPrisma();
  const job = await prisma.formCalibrationJob.create({
    data: {
      tenantId,
      startedByUserId: auth.sub,
      jobType: body.jobType ?? "dry_run",
      manifestId: body.manifestId ?? null,
      totalForms: body.totalForms ?? 0,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true, job }, { status: 201 });
}
