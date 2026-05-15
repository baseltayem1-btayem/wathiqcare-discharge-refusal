import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { buildTrakCareRequestContext } from "@/lib/server/trakcare/request-context";
import { getPatientByMrn, searchPatients } from "@/lib/server/trakcare/service";

function readMetadataValue(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function searchPatientsFromCases(tenantId: string, query: string) {
  const prisma = getPrisma();

  const cases = await prisma.case.findMany({
    where: {
      tenantId,
      OR: [
        { medicalRecordNo: { equals: query, mode: "insensitive" } },
        { medicalRecordNo: { contains: query, mode: "insensitive" } },
        { patientName: { contains: query, mode: "insensitive" } },
        { patientIdNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      medicalRecordNo: true,
      patientName: true,
      patientIdNumber: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const seen = new Set<string>();

  return cases
    .map((record) => {
      const mrn = record.medicalRecordNo?.trim();
      if (!mrn || seen.has(mrn)) {
        return null;
      }

      seen.add(mrn);

      return {
        id: mrn,
        mrn,
        name: record.patientName?.trim() || "Unknown Patient",
        dateOfBirth: readMetadataValue(record.metadata, "dob"),
        gender: readMetadataValue(record.metadata, "gender"),
        nationalId: record.patientIdNumber?.trim() || null,
        iqamaNumber: readMetadataValue(record.metadata, "iqamaNumber"),
        mobileNumber: readMetadataValue(record.metadata, "mobileNumber"),
        emergencyContact: readMetadataValue(record.metadata, "emergencyContact"),
        emergencyContactPhone: readMetadataValue(record.metadata, "emergencyContactPhone"),
        sourceTransactionId: null,
      };
    })
    .filter((record): record is NonNullable<typeof record> => Boolean(record));
}

function isLikelyMrn(value: string): boolean {
  const normalized = value.trim();
  return /^[A-Za-z0-9]+-[0-9]{4}-[0-9]{4,}$/.test(normalized) || /^MRN[-A-Za-z0-9]+$/i.test(normalized);
}

/**
 * GET /api/modules/informed-consents/patients/search
 * Search patients from live TrakCare by MRN/name/identifier.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:create");

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const context = buildTrakCareRequestContext(request, auth);

    let searchResult = await searchPatients(context, q).catch(() => ({
      data: [],
      sourceTransactionId: null,
      correlationId: context.correlationId,
    }));

    // Some upstream TrakCare environments don't support free-text search for MRN.
    // Fall back to direct MRN lookup to keep UAT/production issuance workflow working.
    if (searchResult.data.length === 0 && isLikelyMrn(q)) {
      const byMrn = await getPatientByMrn(context, q).catch(() => null);
      if (byMrn?.data) {
        searchResult = {
          data: [byMrn.data],
          sourceTransactionId: byMrn.sourceTransactionId,
          correlationId: byMrn.correlationId,
        };
      }
    }

    const trakCarePatients = searchResult.data.map((patient) => ({
      id: (patient.mrn || patient.id || q).trim(),
      mrn: patient.mrn,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      nationalId: patient.nationalId,
      iqamaNumber: patient.iqamaNumber,
      mobileNumber: patient.mobileNumber,
      emergencyContact: patient.emergencyContact,
      emergencyContactPhone: patient.emergencyContactPhone,
      sourceTransactionId: searchResult.sourceTransactionId,
    }));

    if (trakCarePatients.length > 0 || !auth.tenant_id) {
      return NextResponse.json(trakCarePatients);
    }

    const casePatients = await searchPatientsFromCases(auth.tenant_id, q);
    return NextResponse.json(casePatients);
  } catch (error) {
    return handleApiError(error);
  }
}
