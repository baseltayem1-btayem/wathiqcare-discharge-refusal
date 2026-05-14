import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { getPrisma } from "@/lib/server/prisma";
import { requireTenantId } from "@/lib/server/auth";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, ...keys: string[]): string | null {
  if (!record) {
    return null;
  }
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readBoolean(record: Record<string, unknown> | null, key: string): boolean | null {
  if (!record) {
    return null;
  }
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}

/**
 * GET /api/modules/informed-consents/patients/search
 * Search patients/cases from existing tenant Case records for informed consent workflow.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:create");
    let tenantId: string | null = null;
    try {
      tenantId = requireTenantId(auth);
    } catch {
      tenantId = null;
    }
    const prisma = getPrisma();

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const normalizedEmail = (auth.email || "").trim().toLowerCase();

    let recentCases: Awaited<ReturnType<typeof prisma.case.findMany>> = [];

    // Primary: tenant-scoped query by required searchable fields.
    if (tenantId) {
      recentCases = await prisma.case.findMany({
        where: {
          tenantId,
          OR: [
            { medicalRecordNo: { contains: q, mode: "insensitive" } },
            { patientName: { contains: q, mode: "insensitive" } },
            { caseNumber: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 250,
      });

      // Fallback inside tenant: recent UAT cases so exact MRN can still be found reliably.
      if (recentCases.length === 0) {
        recentCases = await prisma.case.findMany({
          where: { tenantId },
          orderBy: { updatedAt: "desc" },
          take: 1500,
        });
      }
    }

    // Cross-tenant guarded fallback for physician-assigned UAT pilot records.
    if (recentCases.length === 0 && normalizedEmail) {
      const physicianScopedCases = await prisma.case.findMany({
        where: {
          metadata: {
            path: ["assignedPhysicianEmail"],
            equals: normalizedEmail,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 1500,
      });

      recentCases = physicianScopedCases.filter((item) => {
        const metadata = asRecord(item.metadata);
        return readBoolean(metadata, "uatTestData") === true;
      });
    }

    const queryLower = q.toLowerCase();

    const results = recentCases
      .filter((caseItem) => {
        const metadata = asRecord(caseItem.metadata);
        const assignedPhysicianEmail = readString(metadata, "assignedPhysicianEmail");
        const isUat = readBoolean(metadata, "uatTestData") === true;
        const mrn = caseItem.medicalRecordNo || readString(metadata, "mrn");

        return (
          (mrn || "").toLowerCase().includes(queryLower) ||
          (caseItem.patientName || "").toLowerCase().includes(queryLower) ||
          (caseItem.caseNumber || "").toLowerCase().includes(queryLower) ||
          (assignedPhysicianEmail || "").toLowerCase().includes(queryLower) ||
          (queryLower === "uat" && isUat)
        );
      })
      .map((caseItem) => {
        const metadata = asRecord(caseItem.metadata);
        const mrn = caseItem.medicalRecordNo || readString(metadata, "mrn") || "";
        return {
          id: mrn || caseItem.id,
          caseId: caseItem.id,
          patientName: caseItem.patientName || readString(metadata, "patient_name") || "",
          name: caseItem.patientName || readString(metadata, "patient_name") || "",
          medicalRecordNo: mrn,
          mrn,
          caseNumber: caseItem.caseNumber || "",
          caseType: caseItem.caseType,
          department: readString(metadata, "department", "departmentName", "clinicalDepartment") || "",
          diagnosis: readString(metadata, "diagnosis", "primaryDiagnosis") || "",
          assignedPhysicianNameEn: readString(metadata, "assignedPhysicianNameEn") || "",
          assignedPhysicianNameAr: readString(metadata, "assignedPhysicianNameAr") || "",
          assignedPhysicianEmail: readString(metadata, "assignedPhysicianEmail") || "",
          uatTestData: readBoolean(metadata, "uatTestData") === true,
        };
      })
      .sort((a, b) => {
        const aExact = a.mrn.toLowerCase() === queryLower ? 1 : 0;
        const bExact = b.mrn.toLowerCase() === queryLower ? 1 : 0;
        return bExact - aExact;
      })
      .slice(0, 50);

    return NextResponse.json(results);
  } catch (error) {
    return handleApiError(error);
  }
}
