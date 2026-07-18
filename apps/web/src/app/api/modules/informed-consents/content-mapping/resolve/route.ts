import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalize(value: string | null): string {
  return (value || "").trim().toLowerCase();
}

async function readForms(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const response = await fetch(`${origin}/api/modules/informed-consents/forms`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) return [];

  const payload = await response.json();
  return Array.isArray(payload?.templates) ? payload.templates : [];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const procedure =
    searchParams.get("procedure") ||
    searchParams.get("procedureName") ||
    searchParams.get("plannedProcedure") ||
    "";

  const templateId =
    searchParams.get("templateId") ||
    searchParams.get("consentTemplateId") ||
    searchParams.get("formId") ||
    "";

  const specialty = searchParams.get("specialty") || "";

  try {
    const forms = await readForms(request);

    const procedureKey = normalize(procedure);
    const templateKey = normalize(templateId);
    const specialtyKey = normalize(specialty);

    const selected =
      forms.find((form: { id?: string | null; procedure?: string | null; titleEn?: string | null; specialty?: string | null }) => templateKey && normalize(form.id ?? null) === templateKey) ||
      forms.find((form: { id?: string | null; procedure?: string | null; titleEn?: string | null; specialty?: string | null }) => procedureKey && normalize(form.procedure ?? null).includes(procedureKey)) ||
      forms.find((form: { id?: string | null; procedure?: string | null; titleEn?: string | null; specialty?: string | null }) => procedureKey && normalize(form.titleEn ?? null).includes(procedureKey)) ||
      forms.find((form: { id?: string | null; procedure?: string | null; titleEn?: string | null; specialty?: string | null }) => specialtyKey && normalize(form.specialty ?? null) === specialtyKey) ||
      forms[0] ||
      null;

    return NextResponse.json(
      {
        ok: true,
        source: "forms_fallback_mapping",
        generatedAt: new Date().toISOString(),
        request: {
          procedure,
          templateId,
          specialty,
        },
        mapping: selected
          ? {
              templateId: selected.id,
              templateCode: selected.id,
              titleEn: selected.titleEn,
              titleAr: selected.titleAr,
              procedure: selected.procedure,
              specialty: selected.specialty,
              category: selected.category,
              riskLevel: selected.riskLevel,
              approvalStatus: selected.approvalStatus,
              version: selected.version,
              pdfUrl: selected.pdfUrl,
              pdfTemplateUrl: selected.pdfUrl,
              sourcePdfUrl: selected.pdfUrl,
              approvedPdfUrl: selected.pdfUrl,
            }
          : null,
        clinicalKnowledgeAssembly: selected
          ? {
              assemblyId: `assembly-${selected.id}`,
              packageId: `package-${selected.id}`,
              procedureId: selected.id,
              procedureCode: selected.id,
              procedureNameEn: selected.procedure || selected.titleEn,
              procedureNameAr: selected.titleAr,
              status: "ready",
              consentForm: {
                id: selected.id,
                code: selected.id,
                titleEn: selected.titleEn,
                titleAr: selected.titleAr,
                formType: selected.category,
                riskLevel: selected.riskLevel,
                version: selected.version,
                pdfTemplateUrl: selected.pdfUrl,
                pdfUrl: selected.pdfUrl,
                sourcePdfUrl: selected.pdfUrl,
                approvedPdfUrl: selected.pdfUrl,
                sourceAvailable: Boolean(selected.pdfUrl),
                requiresWitness: Boolean(selected.requiresWitness || false),
                requiresInterpreter: Boolean(selected.requiresInterpreter || false),
              },
              educationMaterials: [],
              riskDisclosures: [],
              illustrations: [],
              suggestions: [],
              blockers: [],
              requiredParticipants: [],
            }
          : null,
        package: selected
          ? {
              consentTemplate: selected,
              education: selected.education || null,
              illustrations: selected.illustrations || [],
              risks: selected.risks || [],
              alternatives: selected.alternatives || [],
            }
          : null,
        items: forms,
        templates: forms,
        total: forms.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[informed-consents/content-mapping/resolve] Safe fallback failed", error);
    return NextResponse.json(
      {
        ok: true,
        source: "safe_empty_fallback",
        mapping: null,
        package: null,
        items: [],
        templates: [],
        total: 0,
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}
