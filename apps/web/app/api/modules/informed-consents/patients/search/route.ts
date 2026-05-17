import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import {
  requireModuleOperationalAccess,
  requireTenantId,
} from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import {
  isUatMrnAliasEnabled,
  normalizePatientSearchQuery,
} from "@/lib/server/patient-search";
import { getPrisma } from "@/lib/server/prisma";
import { buildTrakCareRequestContext } from "@/lib/server/trakcare/request-context";
import { searchPatients } from "@/lib/server/trakcare/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PatientSearchItem = {
  id: string;
  mrn: string;
  name: string;
  caseId?: string;
  caseNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationalId?: string | null;
  iqamaNumber?: string | null;
  mobileNumber?: string | null;
  emergencyContact?: string | null;
  emergencyContactPhone?: string | null;
  sourceTransactionId?: string | null;
  source: "trakcare" | "case_fallback";
};

function dedupePatients(rows: PatientSearchItem[]): PatientSearchItem[] {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = `${row.mrn}:${row.caseId ?? row.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchLocalCases(
  tenantId: string,
  rawQuery: string,
): Promise<PatientSearchItem[]> {
  const prisma = getPrisma();

  const normalized = normalizePatientSearchQuery(rawQuery, {
    enableUatMrnAlias: isUatMrnAliasEnabled(),
  });

  if (!normalized.trimmedQuery || normalized.trimmedQuery.length < 2) {
    return [];
  }

  const orFilters: Prisma.CaseWhereInput[] = [];

  for (const mrn of normalized.mrnVariants) {
    orFilters.push({
      medicalRecordNo: {
        equals: mrn,
        mode: "insensitive",
      },
    });
  }

  if (normalized.containsQuery) {
    orFilters.push({
      patientName: {
        contains: normalized.containsQuery,
        mode: "insensitive",
      },
    });

    orFilters.push({
      caseNumber: {
        equals: normalized.containsQuery.toUpperCase(),
        mode: "insensitive",
      },
    });
  }

  if (orFilters.length === 0) {
    return [];
  }

  const cases = await prisma.case.findMany({
    where: {
      tenantId,
      medicalRecordNo: {
        not: null,
      },
      OR: orFilters,
    },
    select: {
      id: true,
      caseNumber: true,
      patientName: true,
      medicalRecordNo: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 10,
  });

  return dedupePatients(
    cases
      .filter(
        (item) =>
          typeof item.medicalRecordNo === "string" &&
          item.medicalRecordNo.trim().length > 0,
      )
      .map((item) => {
        const mrn = item.medicalRecordNo!.trim().toUpperCase();

        return {
          id: mrn,
          mrn,
          name: item.patientName?.trim() || item.caseNumber || item.id,
          caseId: item.id,
          caseNumber: item.caseNumber,
          source: "case_fallback" as const,
        };
      }),
  );
}

/**
 * GET /api/modules/informed-consents/patients/search
 *
 * Searches live TrakCare first. If TrakCare is unavailable, empty, or fails,
 * falls back to tenant-scoped local Case data.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(
      request,
      "informed-consents",
    );

    requireInformedConsentPermission(auth, "consent:create");

    const tenantId = requireTenantId(auth);
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json([]);
    }

    let trakCareResults: PatientSearchItem[] = [];

    try {
      const context = buildTrakCareRequestContext(request, auth);
      const result = await searchPatients(context, q);

      trakCareResults = result.data.map((patient) => ({
        id: patient.mrn || patient.id,
        mrn: patient.mrn,
        name: patient.name,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        nationalId: patient.nationalId,
        iqamaNumber: patient.iqamaNumber,
        mobileNumber: patient.mobileNumber,
        emergencyContact: patient.emergencyContact,
        emergencyContactPhone: patient.emergencyContactPhone,
        sourceTransactionId: result.sourceTransactionId,
        source: "trakcare" as const,
      }));
    } catch {
      trakCareResults = [];
    }

    if (trakCareResults.length > 0) {
      return NextResponse.json(dedupePatients(trakCareResults));
    }

    const fallbackResults = await searchLocalCases(tenantId, q);

    return NextResponse.json(fallbackResults);
  } catch (error) {
    return handleApiError(error);
  }
}