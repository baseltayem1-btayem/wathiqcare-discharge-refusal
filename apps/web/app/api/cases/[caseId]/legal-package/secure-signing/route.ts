import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
  refreshModuleSecureSigningStatus,
  sendModuleSecureSigningLink,
  type SecureSigningWorkflow,
} from "@/lib/server/module-secure-signing-service";

const prisma = getPrisma();

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getPatientMobile(metadata: Record<string, unknown>): string {
  const keys = ["patient_mobile", "mobile", "phone_number", "contact_numbers"];
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function getWorkflow(metadata: Prisma.JsonValue | null | undefined): SecureSigningWorkflow | null {
  const root = asRecord(metadata);
  const secureSigning = asRecord(root.secureSigning);
  const legal = secureSigning.legal;
  if (!legal || typeof legal !== "object" || Array.isArray(legal)) return null;
  return legal as SecureSigningWorkflow;
}

async function persistWorkflow(caseId: string, metadata: Prisma.JsonValue | null | undefined, workflow: SecureSigningWorkflow) {
  const root = asRecord(metadata);
  const secureSigning = asRecord(root.secureSigning);
  await prisma.case.update({
    where: { id: caseId },
    data: {
      metadata: {
        ...root,
        secureSigning: {
          ...secureSigning,
          legal: workflow,
        },
      } as Prisma.InputJsonValue,
    },
  });
}

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const { caseId } = await params;

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, tenantId: true, metadata: true },
    });

    if (!caseRecord || caseRecord.tenantId !== tenantId) {
      throw new ApiError(404, "Case not found");
    }

    const workflow = getWorkflow(caseRecord.metadata);
    if (!workflow) {
      return NextResponse.json({ workflow: null });
    }

    const refreshed = await refreshModuleSecureSigningStatus({ tenantId, workflow });
    await persistWorkflow(caseId, caseRecord.metadata, refreshed);

    return NextResponse.json({ workflow: refreshed });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const { caseId } = await params;
    const body = (await request.json().catch(() => null)) as { mobileNumber?: string } | null;

    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, tenantId: true, patientName: true, metadata: true },
    });

    if (!caseRecord || caseRecord.tenantId !== tenantId) {
      throw new ApiError(404, "Case not found");
    }

    const metadata = asRecord(caseRecord.metadata);
    const mobile = body?.mobileNumber?.trim() || getPatientMobile(metadata);

    const workflow = await sendModuleSecureSigningLink({
      tenantId,
      initiatedBy: auth.sub,
      moduleKey: "legal_evidence",
      moduleType: "promissory_note",
      documentId: caseId,
      caseId,
      patientName: caseRecord.patientName || "Patient",
      mobileNumber: mobile,
      locale: "ar",
    });

    await persistWorkflow(caseId, caseRecord.metadata, workflow);

    return NextResponse.json({ workflow });
  } catch (error) {
    return handleApiError(error);
  }
}