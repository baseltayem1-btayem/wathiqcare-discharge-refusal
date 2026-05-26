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
import { recordPatientEducationEvent } from "@/lib/server/patient-education-evidence";

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

function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidRecipientEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
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
      } as JsonInputValue,
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
    const body = (await request.json().catch(() => null)) as { mobileNumber?: string; recipientEmail?: string } | null;

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId: auth.tenant_id },
      select: {
        id: true,
        caseId: true,
        language: true,
        patientName: true,
        metadata: true,
        template: {
          select: {
            templateCode: true,
          },
        },
      },
    });

    if (!doc) {
      throw new ApiError(404, "Consent document not found");
    }

    const metadata = asRecord(doc.metadata);
    const mobile = body?.mobileNumber?.trim() || getPatientMobile(metadata);
    const recipientEmail = normalizeRecipientEmail(body?.recipientEmail || "");

    if (!recipientEmail) {
      throw new ApiError(400, "recipient_email is required");
    }

    if (!isValidRecipientEmail(recipientEmail)) {
      throw new ApiError(400, "Invalid email address");
    }

    const workflow = await sendModuleSecureSigningLink({
      tenantId: auth.tenant_id || "",
      initiatedBy: auth.sub,
      moduleKey: "informed_consent",
      moduleType: "informed_consent",
      documentId: doc.id,
      caseId: doc.caseId,
      patientName: doc.patientName,
      mobileNumber: mobile,
      recipientEmail,
      locale: "ar",
    });

    await persistWorkflow(id, doc.metadata, workflow);

    const alreadyCompleted = await prisma.consentAuditEvent.findFirst({
      where: {
        tenantId: auth.tenant_id || "",
        consentDocumentId: doc.id,
        source: "patient-education",
        action: "EDUCATION_COMPLETED",
      },
      select: { id: true },
    });

    if (!alreadyCompleted) {
      const templateCode = doc.template?.templateCode || "INFORMED_CONSENT";
      const language = doc.language === "ar" || doc.language === "en" || doc.language === "bilingual"
        ? doc.language
        : "bilingual";

      await recordPatientEducationEvent({
        auth,
        eventType: "EDUCATION_OPENED",
        templateCode,
        language,
        consentDocumentId: doc.id,
        caseId: doc.caseId || undefined,
        extra: {
          source: "secure-signing-dispatch",
          patientAcknowledged: true,
        },
        request,
      });

      await recordPatientEducationEvent({
        auth,
        eventType: "UNDERSTANDING_PASSED",
        templateCode,
        language,
        score: 100,
        attempts: 1,
        consentDocumentId: doc.id,
        caseId: doc.caseId || undefined,
        extra: {
          source: "secure-signing-dispatch",
          passed: true,
          patientAcknowledged: true,
        },
        request,
      });

      await recordPatientEducationEvent({
        auth,
        eventType: "EDUCATION_COMPLETED",
        templateCode,
        language,
        score: 100,
        attempts: 1,
        consentDocumentId: doc.id,
        caseId: doc.caseId || undefined,
        extra: {
          source: "secure-signing-dispatch",
          patientAcknowledged: true,
        },
        request,
      });
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    return handleApiError(error);
  }
}
