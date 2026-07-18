import { NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requirePlatformAccess(request);
  const tenantId = auth.tenant_id ?? "";

  const prisma = getPrisma();
  const manifests = await prisma.formCalibrationManifest.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, manifests });
}

export async function POST(request: NextRequest) {
  const auth = await requirePlatformAccess(request);
  const tenantId = auth.tenant_id ?? "";

  const body = (await request.json()) as {
    name: string;
    description?: string;
    sourceFormIds: string[];
    metadata?: Record<string, unknown>;
  };

  if (!body.name || !Array.isArray(body.sourceFormIds) || body.sourceFormIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "name and sourceFormIds are required" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const manifest = await prisma.formCalibrationManifest.create({
    data: {
      tenantId,
      name: body.name,
      description: body.description ?? null,
      sourceFormIds: body.sourceFormIds,
      metadata: (body.metadata ?? null) as any,
    },
  });

  return NextResponse.json({ ok: true, manifest }, { status: 201 });
}
