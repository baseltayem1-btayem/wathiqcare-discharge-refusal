import { NextResponse } from "next/server";

type ApprovedConsentTemplate = {
  id: string;
  titleEn: string;
  titleAr: string;
  category: "general-surgery" | "anesthesia" | "medical" | "diagnostic" | "special-procedure";
  specialty: string;
  procedure: string;
  language: "bilingual" | "en" | "ar";
  version: string;
  approvalStatus: "approved";
  legalApprovalDate: string;
  clinicalApprovalDate: string;
  governanceOwner: string;
  riskLevel: "standard" | "medium" | "high";
  tags: string[];
  pdfUrl: string;
  summary: string;
};

const approvedTemplates: ApprovedConsentTemplate[] = [
  {
    id: "imc-gs-appendectomy-v1",
    titleEn: "Appendectomy Consent Form",
    titleAr: "نموذج الموافقة على استئصال الزائدة الدودية",
    category: "general-surgery",
    specialty: "General Surgery",
    procedure: "Appendectomy",
    language: "bilingual",
    version: "1.0",
    approvalStatus: "approved",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    governanceOwner: "IMC Consent Governance",
    riskLevel: "medium",
    tags: ["appendectomy", "general surgery", "abdominal", "surgery", "زائدة", "جراحة عامة"],
    pdfUrl: "/approved-consent-forms/appendectomy-consent.pdf",
    summary: "Approved bilingual surgical consent template for appendectomy procedures."
  },
  {
    id: "imc-gs-cholecystectomy-v1",
    titleEn: "Laparoscopic Cholecystectomy Consent Form",
    titleAr: "نموذج الموافقة على استئصال المرارة بالمنظار",
    category: "general-surgery",
    specialty: "General Surgery",
    procedure: "Laparoscopic Cholecystectomy",
    language: "bilingual",
    version: "1.0",
    approvalStatus: "approved",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    governanceOwner: "IMC Consent Governance",
    riskLevel: "medium",
    tags: ["gallbladder", "cholecystectomy", "laparoscopy", "general surgery", "مرارة", "منظار"],
    pdfUrl: "/approved-consent-forms/cholecystectomy-consent.pdf",
    summary: "Approved bilingual consent for laparoscopic gallbladder removal."
  },
  {
    id: "imc-an-general-v1",
    titleEn: "General Anesthesia Consent Form",
    titleAr: "نموذج الموافقة على التخدير العام",
    category: "anesthesia",
    specialty: "Anesthesia",
    procedure: "General Anesthesia",
    language: "bilingual",
    version: "1.0",
    approvalStatus: "approved",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    governanceOwner: "IMC Anesthesia Governance",
    riskLevel: "high",
    tags: ["anesthesia", "general anesthesia", "sedation", "تخدير", "تخدير عام"],
    pdfUrl: "/approved-consent-forms/general-anesthesia-consent.pdf",
    summary: "Approved bilingual consent template for general anesthesia."
  },
  {
    id: "imc-an-regional-v1",
    titleEn: "Regional Anesthesia Consent Form",
    titleAr: "نموذج الموافقة على التخدير الموضعي أو النصفي",
    category: "anesthesia",
    specialty: "Anesthesia",
    procedure: "Regional Anesthesia",
    language: "bilingual",
    version: "1.0",
    approvalStatus: "approved",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    governanceOwner: "IMC Anesthesia Governance",
    riskLevel: "medium",
    tags: ["regional anesthesia", "spinal", "epidural", "nerve block", "تخدير نصفي", "تخدير موضعي"],
    pdfUrl: "/approved-consent-forms/regional-anesthesia-consent.pdf",
    summary: "Approved bilingual consent for regional anesthesia and nerve block procedures."
  },
  {
    id: "imc-dx-endoscopy-v1",
    titleEn: "Diagnostic Endoscopy Consent Form",
    titleAr: "نموذج الموافقة على المنظار التشخيصي",
    category: "diagnostic",
    specialty: "Gastroenterology",
    procedure: "Diagnostic Endoscopy",
    language: "bilingual",
    version: "1.0",
    approvalStatus: "approved",
    legalApprovalDate: "2026-06-01",
    clinicalApprovalDate: "2026-06-01",
    governanceOwner: "IMC Consent Governance",
    riskLevel: "medium",
    tags: ["endoscopy", "diagnostic", "gastroenterology", "منظار", "تشخيصي"],
    pdfUrl: "/approved-consent-forms/endoscopy-consent.pdf",
    summary: "Approved bilingual diagnostic endoscopy consent template."
  }
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreTemplate(template: ApprovedConsentTemplate, query: string) {
  const q = normalize(query);
  if (!q) return 1;

  const haystack = normalize([
    template.titleEn,
    template.titleAr,
    template.category,
    template.specialty,
    template.procedure,
    template.summary,
    template.tags.join(" ")
  ].join(" "));

  const terms = q.split(" ").filter(Boolean);
  let score = 0;

  for (const term of terms) {
    if (haystack.includes(term)) score += 5;
    if (normalize(template.titleEn).includes(term)) score += 8;
    if (normalize(template.titleAr).includes(term)) score += 8;
    if (normalize(template.procedure).includes(term)) score += 6;
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

  let data = approvedTemplates
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
    source: "approved-imc-consent-library",
    generatedAt: new Date().toISOString(),
    total: data.length,
    filters: {
      q,
      category,
      specialty,
      riskLevel
    },
    specialties,
    templates: data
  });
}
