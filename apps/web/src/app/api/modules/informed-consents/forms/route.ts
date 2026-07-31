import { NextResponse } from "next/server";
import { IMC_APPROVED_CONSENT_FORMS_MANIFEST } from "@/lib/server/imc-approved-consent-forms.manifest";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTemplate(
  template: (typeof IMC_APPROVED_CONSENT_FORMS_MANIFEST)[number],
  query: string,
) {
  const q = normalize(query);
  if (!q) return 1;

  const haystack = normalize([
    template.titleEn,
    template.titleAr,
    template.category,
    template.specialty,
    template.procedure,
    template.summary,
    template.tags.join(" "),
    template.slug,
    template.sourceFile,
  ].join(" "));

  const terms = q.split(" ").filter(Boolean);
  let score = 0;

  for (const term of terms) {
    if (haystack.includes(term)) score += 5;
    if (normalize(template.titleEn).includes(term)) score += 10;
    if (normalize(template.titleAr).includes(term)) score += 10;
    if (normalize(template.procedure).includes(term)) score += 8;
    if (normalize(template.slug).includes(term)) score += 6;
    if (template.tags.some((tag) => normalize(tag).includes(term))) score += 4;
  }

  return score;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const q = searchParams.get("q") || "";
  const category = searchParams.get("category") || "all";
  const specialty = searchParams.get("specialty") || "all";
  const riskLevel = searchParams.get("riskLevel") || "all";

  const approvedTemplates = IMC_APPROVED_CONSENT_FORMS_MANIFEST;

  const templates = approvedTemplates
    .filter((item) => item.approvalStatus === "approved")
    .filter((item) => category === "all" || item.category === category)
    .filter((item) => specialty === "all" || item.specialty === specialty)
    .filter((item) => riskLevel === "all" || item.riskLevel === riskLevel)
    .map((item) => ({ ...item, searchScore: scoreTemplate(item, q) }))
    .filter((item) => !q || item.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore || a.titleEn.localeCompare(b.titleEn));

  const specialties = Array.from(new Set(approvedTemplates.map((item) => item.specialty))).sort();

  return NextResponse.json({
    ok: true,
    source: "approved-imc-consent-library-manifest",
    generatedAt: new Date().toISOString(),
    total: templates.length,
    libraryTotal: approvedTemplates.length,
    filters: {
      q,
      category,
      specialty,
      riskLevel,
    },
    specialties,
    templates,
  });
}
