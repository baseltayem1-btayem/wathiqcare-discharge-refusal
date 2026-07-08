import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readFormsFallback(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/modules/informed-consents/forms`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) return [];

  const payload = await response.json();
  const forms = Array.isArray(payload?.templates) ? payload.templates : [];

  return forms.map((form: any) => ({
    id: form.id,
    templateCode: form.id,
    titleAr: form.titleAr || form.titleEn || form.procedure || "Consent Form",
    titleEn: form.titleEn || form.titleAr || form.procedure || "Consent Form",
    consentType: form.category || form.consentType || "procedure",
    specialty: form.specialty || "",
    department: form.department || form.specialty || "",
    currentVersionId: form.version || "1.0",
    procedure: form.procedure || "",
    riskLevel: form.riskLevel || "",
    approvalStatus: form.approvalStatus || "approved",
    source: "forms_fallback",
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const typeFilter = (searchParams.get("type") || "").trim().toUpperCase();
  const specialtyFilter = (searchParams.get("specialty") || "").trim();

  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const tenantId = auth.tenant_id || "";

    if (!tenantId) {
      const fallback = await readFormsFallback(request);
      return NextResponse.json(fallback, { status: 200 });
    }

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

    if (templates.length > 0) {
      return NextResponse.json(templates, { status: 200 });
    }

    const fallback = await readFormsFallback(request);
    return NextResponse.json(fallback, { status: 200 });
  } catch (error) {
    console.error("[informed-consents/templates] Falling back to approved forms library", error);
    const fallback = await readFormsFallback(request);
    return NextResponse.json(fallback, { status: 200 });
  }
}
