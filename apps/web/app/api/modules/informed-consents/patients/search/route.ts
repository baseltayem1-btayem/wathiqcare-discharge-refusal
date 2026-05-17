import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireTenantId, requireTenantOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { normalizePatientSearchQuery, isUatMrnAliasEnabled } from "@/lib/server/patient-search";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PatientSearchItem = {
  id: string;
  mrn: string;
  name: string;
  caseId: string;
  caseNumber: string | null;
  source: "case_fallback";
};

function dedupePatients(rows: PatientSearchItem[]): PatientSearchItem[] {
  const seen = new Set<string>();
  const deduped: PatientSearchItem[] = [];

  for (const row of rows) {
    const key = `${row.id}:${row.caseId}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

async function searchLocalCases(tenantId: string, rawQuery: string): Promise<PatientSearchItem[]> {
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
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: 10,
  });

  return dedupePatients(
    cases
      .filter((item) => typeof item.medicalRecordNo === "string" && item.medicalRecordNo.trim().length > 0)
      .map((item) => ({
        id: item.medicalRecordNo!.trim().toUpperCase(),
        mrn: item.medicalRecordNo!.trim().toUpperCase(),
        name: item.patientName?.trim() || item.caseNumber || item.id,
        caseId: item.id,
        caseNumber: item.caseNumber,
        source: "case_fallback" as const,
      })),
  );
}

/**
 * GET /api/modules/informed-consents/patients/search
 * Normalizes MRN input and falls back to tenant-scoped local case data when
 * external patient search is empty or unavailable.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    requireTenantOperationalAccess(auth);
    const tenantId = requireTenantId(auth);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!q.trim() || q.trim().length < 2) {
      return NextResponse.json([]);
    }

    const fallbackResults = await searchLocalCases(tenantId, q);

    return NextResponse.json(fallbackResults);
  } catch (error) {
    return handleApiError(error);
  }
}import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { buildTrakCareRequestContext } from "@/lib/server/trakcare/request-context";
import { searchPatients } from "@/lib/server/trakcare/service";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/modules/informed-consents/patients/search
 * Search patients from live TrakCare by MRN/name/identifier.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:create");

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const context = buildTrakCareRequestContext(request, auth);
    const result = await searchPatients(context, q);

    return NextResponse.json(
      result.data.map((patient) => ({
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
      })),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
