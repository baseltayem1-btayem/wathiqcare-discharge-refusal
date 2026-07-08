import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { sendModuleSecureSigningLink } from "@/lib/server/module-secure-signing-service";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { isTaqnyatReady } from "@/services/sms/taqnyatClient";
import { logRuntimeIncident } from "@/lib/server/runtime-observability";
import { getPrisma } from "@/lib/server/prisma";
import { isAllowlistedRecipient } from "@/lib/server/workspace-consent-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isDryRunEnabled(body: Record<string, unknown>): boolean {
  if (body.dryRun === true) return true;
  const envFlag = process.env.FF_INFORMED_CONSENT_SEND_DRY_RUN?.trim().toLowerCase();
  return envFlag === "true" || envFlag === "1" || envFlag === "yes";
}

export async function POST(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const documentId = String(body.documentId || "");
  const caseId = String(body.caseId || "");
  const patientName = String(body.patientName || "");
  const mobileNumber = String(body.mobileNumber || "");
  const recipientEmail = String(body.recipientEmail || "");
  const locale = body.locale === "ar" ? "ar" : "en";

  if (!documentId || !caseId || !patientName || !mobileNumber || !recipientEmail) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: documentId, caseId, patientName, mobileNumber, recipientEmail" },
      { status: 400 },
    );
  }

  if (isDryRunEnabled(body)) {
    console.log("[informed-consents-send] dry-run validation passed", {
      tenantId,
      moduleKey: "informed_consent",
      documentId,
      locale,
    });
    await writeConsentAudit({
      tenantId,
      auth,
      action: "consent_dry_run_sent",
      summary: `Dry-run send validation passed for document ${documentId}`,
      source: "informed-consents-send",
      caseId,
      metadata: {
        documentId,
        caseId,
        patientName,
        mobileNumber,
        locale,
        dryRun: true,
      },
      request,
    });
    return NextResponse.json({
      ok: true,
      dryRun: true,
      message: "Send validation passed. No consent sent.",
      providerStatus: {
        smsReady: isTaqnyatReady(),
      },
    });
  }

  await writeConsentAudit({
    tenantId,
    auth,
    action: "real_pilot_send_requested",
    summary: `Real pilot send requested for document ${documentId}`,
    source: "informed-consents-send",
    caseId,
    consentDocumentId: documentId,
    metadata: {
      documentId,
      caseId,
      patientName,
      mobileNumber,
      recipientEmail,
      locale,
    },
    request,
  });

  if (!isAllowlistedRecipient(mobileNumber, recipientEmail)) {
    const maskedMobile = mobileNumber.replace(/\d(?=\d{4})/g, "*");
    const maskedEmail = recipientEmail.replace(/(.{2}).*?(@.*)/, "$1***$2");
    const reason = `Recipient not in pilot allowlist (mobile: ${maskedMobile}, email: ${maskedEmail})`;

    console.warn("[informed-consents-send] blocked non-allowlisted recipient", {
      tenantId,
      caseId,
      documentId,
      mobileNumber: maskedMobile,
      recipientEmail: maskedEmail,
    });

    await writeConsentAudit({
      tenantId,
      auth,
      action: "send_blocked_non_allowlisted_recipient",
      summary: reason,
      source: "informed-consents-send",
      caseId,
      consentDocumentId: documentId,
      metadata: {
        documentId,
        caseId,
        patientName,
        mobileNumber: maskedMobile,
        recipientEmail: maskedEmail,
        locale,
      },
      request,
    });

    logRuntimeIncident({
      module: "informed-consents-send",
      type: "AUTHORIZATION_FAILURE",
      operation: "send_blocked_non_allowlisted_recipient",
      tenantId,
      error: new Error(reason),
      details: { caseId, documentId, mobileNumber: maskedMobile, recipientEmail: maskedEmail },
    });

    return NextResponse.json(
      { ok: false, error: "Recipient is not approved for pilot send. Contact the platform administrator to add the recipient to the allowlist." },
      { status: 403 },
    );
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
      locale,
      baseUrl: request.nextUrl.origin,
    });

    // Persist the pilot recipient contact details on the consent document so
    // downstream OTP/email fallback and audit have a stable source of truth.
    const prisma = getPrisma();
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
        } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    await writeConsentAudit({
      tenantId,
      auth,
      action: "signing_link_created",
      summary: `Secure signing link created for document ${documentId} (session ${workflow.sessionId})`,
      source: "informed-consents-send",
      caseId,
      consentDocumentId: documentId,
      metadata: {
        documentId,
        caseId,
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

    if (workflow.smsDeliveryStatus === "sent") {
      await writeConsentAudit({
        tenantId,
        auth,
        action: "patient_sms_sent",
        summary: `Pilot SMS sent to patient for document ${documentId}`,
        source: "informed-consents-send",
        caseId,
        consentDocumentId: documentId,
        metadata: {
          documentId,
          caseId,
          sessionId: workflow.sessionId,
          mobileNumber: workflow.recipientMobile,
          locale,
        },
        request,
      });
    }

    if (workflow.emailDeliveryStatus === "sent") {
      await writeConsentAudit({
        tenantId,
        auth,
        action: "patient_email_sent",
        summary: `Pilot email sent to patient for document ${documentId}`,
        source: "informed-consents-send",
        caseId,
        consentDocumentId: documentId,
        metadata: {
          documentId,
          caseId,
          sessionId: workflow.sessionId,
          recipientEmail: workflow.recipientEmail,
          locale,
        },
        request,
      });
    }

    return NextResponse.json({ ok: true, workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
