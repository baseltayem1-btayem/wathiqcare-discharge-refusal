import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { listConsentDocuments } from "@/lib/server/consent-library-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getProgressFromStatus(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "DRAFT" || normalized === "AI_DRAFT") return 20;
  if (normalized === "PHYSICIAN_REVIEW") return 35;
  if (normalized === "APPROVED") return 50;
  if (normalized === "READY_FOR_SIGNATURE") return 65;
  if (normalized === "SIGNED") return 85;
  if (normalized === "FINALIZED") return 100;

  return 25;
}

function getPriorityFromStatus(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "READY_FOR_SIGNATURE") return "high";
  if (normalized === "APPROVED") return "medium";
  if (normalized === "SIGNED") return "medium";
  if (normalized === "FINALIZED") return "low";

  return "normal";
}

function getDisplayStatus(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "DRAFT" || normalized === "AI_DRAFT") return "Draft";
  if (normalized === "PHYSICIAN_REVIEW") return "Physician Review";
  if (normalized === "APPROVED") return "Approved";
  if (normalized === "READY_FOR_SIGNATURE") return "Ready for Signature";
  if (normalized === "SIGNED") return "Signed";
  if (normalized === "FINALIZED") return "Finalized";

  return status;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || "100");
    const status = url.searchParams.get("status") || undefined;
    const caseId = url.searchParams.get("caseId") || undefined;

    const docs = await listConsentDocuments(auth, {
      caseId,
      status,
      limit,
    });

    const records = docs.map((doc) => {
      const signatureCount = Array.isArray(doc.signatures) ? doc.signatures.length : 0;
      const templateTitle =
        doc.template?.titleEn ||
        doc.template?.titleAr ||
        doc.template?.templateCode ||
        "Informed Consent";

      return {
        id: doc.id,
        consentReference: doc.consentReference,
        caseId: doc.caseId,
        caseNumber: doc.case?.caseNumber || null,

        patientName: doc.patientName || doc.case?.patientName || "Unknown Patient",
        mrn: doc.mrn || doc.case?.medicalRecordNo || "N/A",
        patientIdNumber: doc.case?.patientIdNumber || null,

        procedure:
          doc.plannedProcedure ||
          doc.procedureDetails ||
          templateTitle,

        templateTitle,
        consentType: doc.template?.consentType || null,
        specialty: doc.template?.specialty || doc.physicianSpecialty || null,
        department: doc.department || doc.template?.department || null,

        physicianName: doc.physicianName,
        physicianLicense: doc.physicianLicense,
        physicianSpecialty: doc.physicianSpecialty,

        status: doc.status,
        displayStatus: getDisplayStatus(doc.status),
        progress: getProgressFromStatus(doc.status),
        priority: getPriorityFromStatus(doc.status),

        signatureCount,
        isSigned: doc.status === "SIGNED" || doc.status === "FINALIZED",
        isFinalized: doc.status === "FINALIZED",

        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        approvedAt: doc.approvedAt,
        finalizedAt: doc.finalizedAt,

        source: "database",
      };
    });

    return NextResponse.json(toJsonSafe({
      records,
      total: records.length,
      generatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    return handleApiError(error);
  }
}
