import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import {
  buildInformedConsentPdfRuntimeProbe,
  isInformedConsentPdfEnginePreviewEnabled,
} from "@/lib/server/informed-consent-pdf-runtime-probe";

function buildMockPreviewInput() {
  return {
    document: {
      id: "mock-consent-doc-preview",
      tenantId: "mock-tenant",
      consentReference: "MOCK-CONSENT-0001",
      documentVersion: "v1.0",
      patientName: "Test Patient",
      mrn: "TEST-MRN-0001",
      physicianName: "Dr. Test",
      physicianLicense: "MOCK-LIC-1",
      physicianSpecialty: "General Surgery",
      plannedProcedure: "Mock Procedure",
      procedureDetails: "Internal preview evidence package only",
      diagnosis: "Internal preview diagnosis",
      createdAt: new Date("2026-05-18T00:00:00.000Z"),
      template: {
        titleAr: "معاينة داخلية للموافقة",
        titleEn: "Internal Consent Preview",
        consentType: "INTERNAL_PREVIEW",
        specialty: "Internal Testing",
      },
      case: {
        caseNumber: "MOCK-CASE-0001",
      },
      auditChecksum: null,
      immutablePdfHash: null,
      generatedByModel: null,
    },
    language: "en" as const,
    origin: "https://wathiqcare.online",
  };
}

export async function GET(request: NextRequest) {
  try {
    if (!isInformedConsentPdfEnginePreviewEnabled()) {
      return new NextResponse(null, { status: 404 });
    }

    await requireAuth(request);
    const probe = await buildInformedConsentPdfRuntimeProbe(buildMockPreviewInput());

    return NextResponse.json({
      complianceReview: probe.complianceReview,
      evidenceTimelineModel: probe.evidenceTimelineModel,
      forensicInspectionModel: probe.forensicInspectionModel,
      judicialExportModel: probe.judicialExportModel,
      legalDisclosurePackage: probe.legalDisclosurePackage,
      operationsConsoleModel: probe.operationsConsoleModel,
      retentionDashboardModel: probe.retentionDashboardModel,
      verificationPageModel: probe.verificationPageModel,
    });
  } catch (error) {
    return handleApiError(error);
  }
}