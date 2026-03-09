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
    findUnique: (args: { where: { id: string } }) => Promise<
      | {
          id: string;
          tenantId: string;
          mrn: string | null;
          fullName: string;
        }
      | null
    >;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const { id } = await params;

    const patient = await governanceDb.patient.findUnique({ where: { id } });
    if (!patient) {
      throw new ApiError(404, "Patient not found");
    }
    if (patient.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    return NextResponse.json(toJsonSafe(patient));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isGovernanceModuleEnabled()) {
      throw new ApiError(404, "Governance module is disabled");
    }

    const auth = requireAuth(request);
    const { id } = await params;

    const existing = await governanceDb.patient.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, "Patient not found");
    }
    if (existing.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    const payload = (await request.json().catch(() => null)) as
      | {
          mrn?: string | null;
          urn?: string | null;
          fullName?: string;
          nationalId?: string | null;
          mobileNumber?: string | null;
          email?: string | null;
          dob?: string | null;
          gender?: string | null;
          preferredLanguage?: string | null;
          legalGuardianName?: string | null;
          guardianRelationship?: string | null;
          capacityStatus?: string;
          hisIdentifier?: string | null;
          archiveReference?: string | null;
          metadata?: Prisma.InputJsonValue | null;
        }
      | null;

    if (!payload) {
      throw new ApiError(400, "Invalid JSON body");
    }

    const updated = await governanceDb.patient.update({
      where: { id },
      data: {
        ...(payload.mrn !== undefined ? { mrn: payload.mrn } : {}),
        ...(payload.urn !== undefined ? { urn: payload.urn } : {}),
        ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
        ...(payload.nationalId !== undefined ? { nationalId: payload.nationalId } : {}),
        ...(payload.mobileNumber !== undefined ? { mobileNumber: payload.mobileNumber } : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.dob !== undefined ? { dob: payload.dob ? new Date(payload.dob) : null } : {}),
        ...(payload.gender !== undefined ? { gender: payload.gender } : {}),
        ...(payload.preferredLanguage !== undefined
          ? { preferredLanguage: payload.preferredLanguage }
          : {}),
        ...(payload.legalGuardianName !== undefined
          ? { legalGuardianName: payload.legalGuardianName }
          : {}),
        ...(payload.guardianRelationship !== undefined
          ? { guardianRelationship: payload.guardianRelationship }
          : {}),
        ...(payload.capacityStatus !== undefined
          ? { capacityStatus: parseCapacityStatus(payload.capacityStatus) }
          : {}),
        ...(payload.hisIdentifier !== undefined ? { hisIdentifier: payload.hisIdentifier } : {}),
        ...(payload.archiveReference !== undefined
          ? { archiveReference: payload.archiveReference }
          : {}),
        ...(payload.metadata !== undefined
          ? { metadata: payload.metadata === null ? null : payload.metadata }
          : {}),
      },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "patient",
      entityId: id,
      action: "patient_updated",
      details: "Patient profile updated",
      metadataJson: {
        mrn: updated.mrn,
        fullName: updated.fullName,
      },
      request,
    });

    return NextResponse.json(toJsonSafe(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
