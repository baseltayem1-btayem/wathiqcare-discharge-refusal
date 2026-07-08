import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { sendModuleSecureSigningLink } from "@/lib/server/module-secure-signing-service";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { isTaqnyatReady } from "@/services/sms/taqnyatClient";
import { logRuntimeIncident } from "@/lib/server/runtime-observability";
import { getPrisma } from "@/lib/server/prisma";
import {
  envBool,
  extractContactDetails,
  findOrCreateConsentDocument,
  isAllowlistedRecipient,
  normalizePhoneNumber,
  normalizeRecipientEmail,
  resolveCaseFromEncounter,
  resolveTemplateFromProcedure,
} from "@/lib/server/workspace-consent-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isDryRunEnabled(body: Record<string, unknown>): boolean {
  if (body.dryRun === true) return true;
  const envFlag = process.env.FF_INFORMED_CONSENT_SEND_DRY_RUN?.trim().toLowerCase();
  return envFlag === "true" || envFlag === "1" || envFlag === "yes";
}

function readinessGates(
  caseRecord: { metadata?: unknown } | null,
  templateVersion: { id: string } | null,
  document: { id: string; status: string } | null,
): { ok: boolean; reason?: string } {
  if (!caseRecord) return { ok: false, reason: "Patient case not found" };
  if (!templateVersion) return { ok: false, reason: "Procedure package not resolved" };
  if (!document) return { ok: false, reason: "Consent document not ready" };
  if (document.status === "VOID") return { ok: false, reason: "Consent document is void" };

  const { mobileNumber, email } = extractContactDetails(caseRecord.metadata);
  if (!mobileNumber || !email) {
    return { ok: false, reason: "Patient contact details missing" };
  }

  return { ok: true };
}

export async function POST(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  requireInformedConsentPermission(auth, "consent:send_signature");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const encounterId = String(body.encounterId || "");
  const procedureId = String(body.procedureId || "");
  const locale = body.locale === "ar" ? "ar" : "en";

  if (!encounterId || !procedureId) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: encounterId, procedureId" },
      { status: 400 },
    );
  }

  const caseRecord = await resolveCaseFromEncounter(tenantId, encounterId);
  if (!caseRecord) {
    return NextResponse.json({ ok: false, error: "Encounter not found" }, { status: 404 });
  }

  const resolved = await resolveTemplateFromProcedure(tenantId, procedureId);
  if (!resolved) {
    return NextResponse.json({ ok: false, error: "Procedure package not found" }, { status: 404 });
  }

  const { template, version, approvedLink } = resolved;

  const document = await findOrCreateConsentDocument(tenantId, auth, caseRecord.id, template, version, approvedLink);
  const gate = readinessGates(caseRecord, version, document);

  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.reason }, { status: 422 });
  }

  const contacts = extractContactDetails(caseRecord.metadata);
  const patientName = caseRecord.patientName || "Patient";
  const mobileNumber = normalizePhoneNumber(contacts.mobileNumber);
  const recipientEmail = normalizeRecipientEmail(contacts.email);

  if (isDryRunEnabled(body)) {
    await writeConsentAudit({
      tenantId,
      auth,
      action: "consent_dry_run_sent",
      summary: `Dry-run send validation passed for document ${document.id}`,
      source: "api-consents-send",
      caseId: caseRecord.id,
      consentDocumentId: document.id,
      templateId: template.id,
      templateVersionId: version.id,
      metadata: {
        documentId: document.id,
        caseId: caseRecord.id,
        patientName,
        mobileNumber,
        recipientEmail,
        locale,
        dryRun: true,
      },
      request,
    });

    return NextResponse.json({
      ok: true,
      dryRun: true,
      message: "Send validation passed. No consent was sent.",
      providerStatus: {
        smsReady: isTaqnyatReady(),
      },
    });
  }

  await writeConsentAudit({
    tenantId,
    auth,
    action: "real_pilot_send_requested",
    summary: `Real pilot send requested for document ${document.id}`,
    source: "api-consents-send",
    caseId: caseRecord.id,
    consentDocumentId: document.id,
    templateId: template.id,
    templateVersionId: version.id,
    metadata: {
      documentId: document.id,
      caseId: caseRecord.id,
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

    await writeConsentAudit({
      tenantId,
      auth,
      action: "send_blocked_non_allowlisted_recipient",
      summary: reason,
      source: "api-consents-send",
      caseId: caseRecord.id,
      consentDocumentId: document.id,
      templateId: template.id,
      templateVersionId: version.id,
      metadata: {
        documentId: document.id,
        caseId: caseRecord.id,
        patientName,
        mobileNumber: maskedMobile,
        recipientEmail: maskedEmail,
        locale,
      },
      request,
    });

    logRuntimeIncident({
      module: "api-consents-send",
      type: "AUTHORIZATION_FAILURE",
      operation: "send_blocked_non_allowlisted_recipient",
      tenantId,
      error: new Error(reason),
      details: { caseId: caseRecord.id, documentId: document.id, mobileNumber: maskedMobile, recipientEmail: maskedEmail },
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
      documentId: document.id,
      caseId: caseRecord.id,
      patientName,
      mobileNumber,
      recipientEmail,
      locale,
      baseUrl: request.nextUrl.origin,
    });

    const prisma = getPrisma();
    const existingDoc = await prisma.consentDocument.findFirst({
      where: { id: document.id, tenantId },
      select: { metadata: true },
    });
    const existingMetadata = (existingDoc?.metadata ?? {}) as Record<string, unknown>;

    await prisma.consentDocument.update({
      where: { id: document.id },
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
      summary: `Secure signing link created for document ${document.id} (session ${workflow.sessionId})`,
      source: "api-consents-send",
      caseId: caseRecord.id,
      consentDocumentId: document.id,
      templateId: template.id,
      templateVersionId: version.id,
      metadata: {
        documentId: document.id,
        caseId: caseRecord.id,
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
        summary: `Pilot SMS sent to patient for document ${document.id}`,
        source: "api-consents-send",
        caseId: caseRecord.id,
        consentDocumentId: document.id,
        templateId: template.id,
        templateVersionId: version.id,
        metadata: {
          documentId: document.id,
          caseId: caseRecord.id,
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
        summary: `Pilot email sent to patient for document ${document.id}`,
        source: "api-consents-send",
        caseId: caseRecord.id,
        consentDocumentId: document.id,
        templateId: template.id,
        templateVersionId: version.id,
        metadata: {
          documentId: document.id,
          caseId: caseRecord.id,
          sessionId: workflow.sessionId,
          recipientEmail: workflow.recipientEmail,
          locale,
        },
        request,
      });
    }

    return NextResponse.json({
      ok: true,
      workflow: {
        sessionId: workflow.sessionId,
        documentId: workflow.documentId,
        signingUrl: workflow.signingUrl,
        recipientMobile: workflow.recipientMobile,
        recipientEmail: workflow.recipientEmail,
        smsDeliveryStatus: workflow.smsDeliveryStatus,
        emailDeliveryStatus: workflow.emailDeliveryStatus,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
