import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { sendModuleSecureSigningLink } from "@/lib/server/module-secure-signing-service";
import { getPrisma } from "@/lib/server/prisma";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { ApiError } from "@/lib/server/http";
import { isAllowlistedRecipient } from "@/lib/server/workspace-consent-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { id: documentId } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const caseId = String(body.caseId || "").trim();
  const patientName = String(body.patientName || "").trim();
  const mobileNumber = String(body.mobileNumber || "").trim();
  const recipientEmail = String(body.recipientEmail || "").trim().toLowerCase();
  const physicianName = String((body.physicianName as string) || auth.email || "").trim();
  const locale = body.locale === "en" ? "en" : "ar";

  if (!caseId || !patientName) {
    return NextResponse.json({ ok: false, error: "caseId and patientName are required" }, { status: 400 });
  }

  if (!mobileNumber && !recipientEmail) {
    return NextResponse.json({ ok: false, error: "Patient mobile number or email is required" }, { status: 400 });
  }

  if (!isAllowlistedRecipient(mobileNumber, recipientEmail)) {
    return NextResponse.json(
      { ok: false, error: "Recipient is not approved for pilot send. Contact the platform administrator." },
      { status: 403 },
    );
  }

  const prisma = getPrisma();
  const document = await prisma.consentDocument.findFirst({
    where: { id: documentId, tenantId, caseId },
    select: { id: true, patientName: true, status: true },
  });
  if (!document) {
    return NextResponse.json({ ok: false, error: "Consent document not found" }, { status: 404 });
  }

  try {
    const workflow = await sendModuleSecureSigningLink({
      tenantId,
      initiatedBy: auth.sub,
      moduleKey: "informed_consent",
      moduleType: "informed_consent",
      documentId,
      caseId,
      patientName,
      mobileNumber,
      recipientEmail,
      locale: locale as "ar" | "en",
      baseUrl: request.nextUrl.origin,
    });

    // Persist recipient contact details on the document for downstream use.
    const existingDoc = await prisma.consentDocument.findFirst({
      where: { id: documentId, tenantId },
      select: { metadata: true },
    });
    const existingMetadata = (existingDoc?.metadata ?? {}) as Record<string, unknown>;
    await prisma.consentDocument.update({
      where: { id: documentId },
      data: {
        metadata: {
          ...existingMetadata,
          secureSigningWorkflow: {
            ...(existingMetadata.secureSigningWorkflow as Record<string, unknown> ?? {}),
            recipientEmail: workflow.recipientEmail,
            mobileNumber: workflow.recipientMobile,
            sentAt: new Date().toISOString(),
          },
        },
      },
    });

    await writeConsentAudit({
      tenantId,
      auth,
      action: "signing_link_created",
      summary: `Secure signing link created for document ${documentId} (session ${workflow.sessionId})`,
      source: "informed-consents-documents-secure-signing",
      caseId,
      consentDocumentId: documentId,
      metadata: {
        sessionId: workflow.sessionId,
        tokenHash: workflow.tokenHash,
        signingUrl: workflow.signingUrl,
        mobileNumber: workflow.recipientMobile,
        recipientEmail: workflow.recipientEmail,
        smsDeliveryStatus: workflow.smsDeliveryStatus,
        emailDeliveryStatus: workflow.emailDeliveryStatus,
        locale,
      },
      request,
    });

    return NextResponse.json({ ok: true, workflow });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
