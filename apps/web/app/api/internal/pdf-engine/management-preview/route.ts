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
      id: "mock-consent-doc-management-preview",
      tenantId: "mock-tenant",
      consentReference: "MOCK-CONSENT-MGMT-0001",
      documentVersion: "v1.0",
      patientName: "Test Patient",
      mrn: "TEST-MRN-MGMT-0001",
      physicianName: "Dr. Test",
      physicianLicense: "MOCK-LIC-1",
      physicianSpecialty: "General Surgery",
      plannedProcedure: "Mock Procedure",
      procedureDetails: "Internal management preview evidence package only",
      diagnosis: "Internal preview diagnosis",
      createdAt: new Date("2026-05-18T00:00:00.000Z"),
      template: {
        titleAr: "معاينة إدارة الأدلة",
        titleEn: "Management Preview",
        consentType: "INTERNAL_MANAGEMENT_PREVIEW",
        specialty: "Internal Testing",
      },
      case: {
        caseNumber: "MOCK-CASE-MGMT-0001",
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
      accessEvaluation: probe.accessEvaluation,
      analyticsSummary: probe.analyticsSummary,
      complianceDashboard: probe.complianceDashboard,
      evidenceDashboard: probe.evidenceDashboard,
      forensicAlerts: probe.forensicAlerts,
      forensicDashboard: probe.forensicDashboard,
      integrityHealthReport: probe.integrityHealthReport,
      legalOperationsDashboard: probe.legalOperationsDashboard,
      lifecycleState: probe.lifecycleState,
      retentionComplianceSummary: probe.retentionComplianceSummary,
      tenantPartitionInfo: probe.tenantPartitionInfo,
    });
  } catch (error) {
    return handleApiError(error);
  }
}