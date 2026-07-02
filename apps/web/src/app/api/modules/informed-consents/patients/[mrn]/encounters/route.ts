import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { ENABLE_IMC_PILOT_PATIENTS } from "@/lib/config/feature-flags";
import { imcPilotPatients } from "@/components/informed-consents/production-workspace/lib/pilot-patients";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest, { params }: { params: Promise<{ mrn: string }> }) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { mrn } = await params;
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant context" }, { status: 400 });
  }

  const prisma = getPrisma();

  const caseRecord = await prisma.case.findFirst({
    where: {
      tenantId,
      OR: [
        { medicalRecordNo: { equals: mrn, mode: "insensitive" } },
        { caseNumber: { equals: mrn, mode: "insensitive" } },
        { id: mrn },
      ],
    },
    select: {
      id: true,
      caseNumber: true,
      patientName: true,
      medicalRecordNo: true,
      title: true,
      metadata: true,
      createdAt: true,
      tenant: { select: { name: true } },
    },
  });

  if (!caseRecord) {
    // Static IMC pilot encounter fallback — gated by feature flag.
    if (ENABLE_IMC_PILOT_PATIENTS) {
      const normalizedMrn = mrn.trim().toLowerCase();
      const pilot = imcPilotPatients.find(
        (p) =>
          p.mrn.toLowerCase() === normalizedMrn ||
          p.urn.toLowerCase() === normalizedMrn ||
          p.pilotId.toLowerCase() === normalizedMrn,
      );
      if (pilot) {
        return NextResponse.json([
          {
            id: pilot.pilotId,
            encounterId: pilot.encounterNo,
            admissionDate: pilot.admissionDate || new Date().toISOString(),
            department: pilot.department,
            physician: pilot.consultant,
            physicianLicense: "",
            physicianId: "",
            diagnosis: pilot.diagnosis,
            procedure: pilot.plannedSurgery,
            allergies: pilot.allergies || "",
            currentMedications: pilot.currentMedication || "",
            physicianSpecialty: "",
            caseNumber: pilot.visitNo,
            syncStatus: "SYNCED",
            source: "pilot_fallback",
            isMock: true,
          },
        ]);
      }
    }
    return NextResponse.json([], { status: 200 });
  }

  const metadata = (caseRecord.metadata || {}) as Record<string, unknown>;
  const department =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.department ?? metadata.encounterDepartment ?? "") || "")
      : "";
  const physician =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.physician ?? metadata.treatingPhysician ?? "") || "")
      : "";
  const physicianSpecialty =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.physicianSpecialty ?? metadata.specialty ?? "") || "")
      : "";
  const diagnosis =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.diagnosis ?? metadata.primaryDiagnosis ?? caseRecord.title ?? "") || "")
      : "";
  const procedure =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.procedure ?? metadata.plannedProcedure ?? "") || "")
      : "";
  const admissionDate =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.admissionDate ?? metadata.encounterDate ?? "") || "")
      : "";

  const encounter = {
    id: caseRecord.id,
    encounterId: caseRecord.caseNumber || `ENC-${caseRecord.id.slice(0, 8).toUpperCase()}`,
    admissionDate: admissionDate || caseRecord.createdAt.toISOString(),
    department: department || "General",
    physician: physician || "Attending Physician",
    physicianLicense: "",
    physicianId: "",
    diagnosis,
    procedure,
    allergies: "",
    currentMedications: "",
    physicianSpecialty: physicianSpecialty || "",
    caseNumber: caseRecord.caseNumber,
    syncStatus: "SYNCED" as const,
    source: "cached_local" as const,
  };

  return NextResponse.json([encounter]);
}
