import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { isGovernanceModuleEnabled } from "@/lib/server/governance/feature-flag";

type PatientCapacityStatusValue = "CAPABLE" | "MINOR" | "LACKS_CAPACITY" | "UNKNOWN";

const governanceDb = prisma as unknown as {
  patient: {
    findMany: (args: {
      where: { tenantId: string };
      orderBy: { createdAt: "desc" };
      take: number;
    }) => Promise<Array<Record<string, unknown>>>;
    create: (args: {
      data: {
        tenantId: string;
        mrn: string | null;
        urn: string | null;
        fullName: string;
        nationalId: string | null;
        mobileNumber: string | null;
        email: string | null;
        dob: Date | null;
        gender: string | null;
        preferredLanguage: string | null;
        legalGuardianName: string | null;
        guardianRelationship: string | null;
        capacityStatus: PatientCapacityStatusValue;
        hisIdentifier: string | null;
        archiveReference: string | null;
        metadata?: Prisma.InputJsonValue;
      };
    }) => Promise<{ id: string; mrn: string | null; fullName: string }>;
  };
};

function parseCapacityStatus(raw: string | undefined): PatientCapacityStatusValue {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "CAPABLE") return "CAPABLE";
  if (value === "MINOR") return "MINOR";
  if (value === "LACKS_CAPACITY") return "LACKS_CAPACITY";
  return "UNKNOWN";
}

export async function GET(request: NextRequest) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const patients = await governanceDb.patient.findMany({
      where: { tenantId: auth.tenant_id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json(toJsonSafe(patients));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const payload = (await request.json().catch(() => null)) as
      | {
          mrn?: string;
          urn?: string;
          fullName?: string;
          nationalId?: string;
          mobileNumber?: string;
          email?: string;
          dob?: string;
          gender?: string;
          preferredLanguage?: string;
          legalGuardianName?: string;
          guardianRelationship?: string;
          capacityStatus?: string;
          hisIdentifier?: string;
          archiveReference?: string;
          metadata?: Prisma.InputJsonValue;
        }
      | null;

    if (!payload?.fullName?.trim()) {
      throw new ApiError(400, "fullName is required");
    }

    const created = await governanceDb.patient.create({
      data: {
        tenantId: auth.tenant_id,
        mrn: payload.mrn?.trim() || null,
        urn: payload.urn?.trim() || null,
        fullName: payload.fullName.trim(),
        nationalId: payload.nationalId?.trim() || null,
        mobileNumber: payload.mobileNumber?.trim() || null,
        email: payload.email?.trim() || null,
        dob: payload.dob ? new Date(payload.dob) : null,
        gender: payload.gender?.trim() || null,
        preferredLanguage: payload.preferredLanguage?.trim() || null,
        legalGuardianName: payload.legalGuardianName?.trim() || null,
        guardianRelationship: payload.guardianRelationship?.trim() || null,
        capacityStatus: parseCapacityStatus(payload.capacityStatus),
        hisIdentifier: payload.hisIdentifier?.trim() || null,
        archiveReference: payload.archiveReference?.trim() || null,
        metadata: payload.metadata ?? undefined,
      },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "patient",
      entityId: created.id,
      action: "patient_created",
      details: "Patient profile created",
      metadataJson: {
        mrn: created.mrn,
        fullName: created.fullName,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(created), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
