import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { handleApiError, ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {

  refreshModuleSecureSigningStatus,
  sendModuleSecureSigningLink,
  type SecureSigningWorkflow,
} from "@/lib/server/module-secure-signing-service";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getWorkflow(metadata: Prisma.JsonValue | null | undefined): SecureSigningWorkflow | null {
  const root = asRecord(metadata);
  const workflow = root.secureSigningWorkflow;
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow)) return null;
  return workflow as SecureSigningWorkflow;
}

function getPatientMobile(metadata: Record<string, unknown>): string {
  const keys = ["patientMobile", "patient_mobile", "mobile", "phone_number", "contact_numbers"];
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function persistWorkflow(documentId: string, metadata: Prisma.JsonValue | null | undefined, workflow: SecureSigningWorkflow) {
  const root = asRecord(metadata);
  const prisma = getPrisma();
  await prisma.consentDocument.update({
    where: { id: documentId },
    data: {
      metadata: {
        ...root,
        secureSigningWorkflow: workflow,
      } as Prisma.InputJsonValue,
    },
  });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:send_signature");
    const { id } = await params;

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId: auth.tenant_id },
      select: { id: true, metadata: true },
    });

    if (!doc) {
      throw new ApiError(404, "Consent document not found");
    }

    const workflow = getWorkflow(doc.metadata);
    if (!workflow) {
      return NextResponse.json({ workflow: null });
    }

    const refreshed = await refreshModuleSecureSigningStatus({
      tenantId: auth.tenant_id || "",
      workflow,
    });
    await persistWorkflow(id, doc.metadata, refreshed);

    return NextResponse.json({ workflow: refreshed });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const prisma = getPrisma();
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:send_signature");
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { mobileNumber?: string } | null;

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId: auth.tenant_id },
      select: {
        id: true,
        caseId: true,
        patientName: true,
        metadata: true,
      },
    });

    if (!doc) {
      throw new ApiError(404, "Consent document not found");
    }

    const metadata = asRecord(doc.metadata);
    const mobile = body?.mobileNumber?.trim() || getPatientMobile(metadata);

    const workflow = await sendModuleSecureSigningLink({
      tenantId: auth.tenant_id || "",
      initiatedBy: auth.sub,
      moduleKey: "informed_consent",
      moduleType: "informed_consent",
      documentId: doc.id,
      caseId: doc.caseId,
      patientName: doc.patientName,
      mobileNumber: mobile,
      locale: "ar",
    });

    await persistWorkflow(id, doc.metadata, workflow);

    return NextResponse.json({ workflow });
  } catch (error) {
    return handleApiError(error);
  }
}
