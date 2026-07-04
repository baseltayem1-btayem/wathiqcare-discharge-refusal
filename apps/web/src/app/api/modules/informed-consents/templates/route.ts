import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const typeFilter = (searchParams.get("type") || "").trim().toUpperCase();
  const specialtyFilter = (searchParams.get("specialty") || "").trim();

  const prisma = getPrisma();
  const templates = await prisma.consentTemplate.findMany({
    where: {
      tenantId,
      ...(typeFilter ? { consentType: { equals: typeFilter, mode: "insensitive" } } : {}),
      ...(specialtyFilter ? { specialty: { equals: specialtyFilter, mode: "insensitive" } } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      templateCode: true,
      titleAr: true,
      titleEn: true,
      consentType: true,
      specialty: true,
      department: true,
      currentVersionId: true,
    },
  });

  return NextResponse.json(templates);
}
