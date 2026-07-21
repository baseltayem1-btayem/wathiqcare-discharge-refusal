import { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

export type TemplatesDependencies = {
  requireModuleOperationalAccess: (
    request: NextRequest,
    moduleKey: "informed-consents",
  ) => Promise<AuthContext>;
  getPrisma: () => {
    consentTemplate: {
      findMany: (args: {
        where: {
          tenantId: string;
          consentType?: { equals: string; mode: "insensitive" };
          specialty?: { equals: string; mode: "insensitive" };
        };
        orderBy: Array<{ updatedAt: "desc" }>;
        select: {
          id: boolean;
          templateCode: boolean;
          titleAr: boolean;
          titleEn: boolean;
          consentType: boolean;
          specialty: boolean;
          department: boolean;
          currentVersionId: boolean;
        };
      }) => Promise<unknown[]>;
    };
  };
  readFormsFallback: (request: NextRequest) => Promise<unknown[]>;
};

export async function readFormsFallback(request: NextRequest): Promise<unknown[]> {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/modules/informed-consents/forms`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) return [];

  const payload = await response.json();
  const forms = Array.isArray(payload?.templates) ? payload.templates : [];

  return forms.map((form: Record<string, unknown>) => ({
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

export async function handleTemplatesRequest(
  request: NextRequest,
  deps: TemplatesDependencies,
): Promise<Response> {
  try {
    const auth = await deps.requireModuleOperationalAccess(request, "informed-consents");
    const { searchParams } = new URL(request.url);
    const typeFilter = (searchParams.get("type") || "").trim().toUpperCase();
    const specialtyFilter = (searchParams.get("specialty") || "").trim();
    const tenantId = auth.tenant_id || "";

    if (!tenantId) {
      const fallback = await deps.readFormsFallback(request);
      return NextResponse.json(fallback, { status: 200 });
    }

    const prisma = deps.getPrisma();

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

    const fallback = await deps.readFormsFallback(request);
    return NextResponse.json(fallback, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}
