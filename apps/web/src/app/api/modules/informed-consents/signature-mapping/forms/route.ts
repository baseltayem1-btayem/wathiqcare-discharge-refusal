import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSearch(form: {
  code: string;
  titleEn: string;
  titleAr: string;
  formType: string;
  version: string;
  pdfTemplateUrl?: string | null;
}, query: string) {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearch([
    form.code,
    form.titleEn,
    form.titleAr,
    form.formType,
    form.version,
    form.pdfTemplateUrl || "",
  ].join(" "));

  return normalizedQuery
    .split(" ")
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "all";

  const prisma = getPrisma();

  const forms = await prisma.consentForm.findMany({
    where: {
      tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      code: true,
      titleEn: true,
      titleAr: true,
      formType: true,
      riskLevel: true,
      status: true,
      version: true,
      effectiveDate: true,
      expiryDate: true,
      governanceSnapshot: true,
      pdfTemplateUrl: true,
      requiresWitness: true,
      requiresInterpreter: true,
      _count: {
        select: {
          signatureMappings: {
            where: { isActive: true },
          },
        },
      },
    },
    orderBy: [
      { titleEn: "asc" },
      { version: "desc" },
    ],
  });

  const filteredForms = forms
    .filter((form) => status === "all" || String(form.status) === status)
    .filter((form) => matchesSearch({
      code: form.code,
      titleEn: form.titleEn,
      titleAr: form.titleAr,
      formType: String(form.formType),
      version: form.version,
      pdfTemplateUrl: form.pdfTemplateUrl,
    }, q))
    .map((form) => ({
      id: form.id,
      tenantId: form.tenantId,
      code: form.code,
      titleEn: form.titleEn,
      titleAr: form.titleAr,
      formType: form.formType,
      riskLevel: form.riskLevel,
      status: form.status,
      version: form.version,
      effectiveDate: form.effectiveDate,
      expiryDate: form.expiryDate,
      governanceSnapshot: form.governanceSnapshot,
      pdfTemplateUrl: form.pdfTemplateUrl,
      pdfUrl: form.pdfTemplateUrl,
      requiresWitness: form.requiresWitness,
      requiresInterpreter: form.requiresInterpreter,
      activeSignatureMappingsCount: form._count.signatureMappings,
    }));

  return NextResponse.json({
    ok: true,
    source: "database",
    generatedAt: new Date().toISOString(),
    total: filteredForms.length,
    filters: {
      q,
      status,
    },
    forms: filteredForms,
    templates: filteredForms,
  });
}
