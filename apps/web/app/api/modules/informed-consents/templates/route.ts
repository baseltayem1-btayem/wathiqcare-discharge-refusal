import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";

/**
 * GET /api/modules/informed-consents/templates
 * Get available consent templates filtered by type and specialty
 */
export async function GET(request: NextRequest) {
  await requireModuleOperationalAccess(request, "informed-consents");

  const { searchParams } = new URL(request.url);
  const consentType = searchParams.get("type") || "";
  const specialty = searchParams.get("specialty") || "";

  try {
    // Mock templates - in production, fetch from database
    const mockTemplates = [
      {
        id: "tmpl_001",
        titleAr: "نموذج الموافقة على الجراحة",
        titleEn: "Surgical Consent Form",
        consentType: "SURGICAL_CONSENT",
        specialty: "SURGICAL",
        version: "1.0",
        language: "bilingual",
      },
      {
        id: "tmpl_002",
        titleAr: "نموذج موافقة على التخدير",
        titleEn: "Anesthesia Consent Form",
        consentType: "ANESTHESIA_CONSENT",
        specialty: "ANESTHESIA",
        version: "1.0",
        language: "bilingual",
      },
      {
        id: "tmpl_003",
        titleAr: "نموذج موافقة عام",
        titleEn: "General Consent Form",
        consentType: "GENERAL_CONSENT",
        specialty: "GENERAL_MEDICINE",
        version: "1.0",
        language: "bilingual",
      },
    ];

    const filtered = mockTemplates.filter(
      (t) =>
        (consentType ? t.consentType === consentType : true) &&
        (specialty ? t.specialty === specialty : true)
    );

    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
