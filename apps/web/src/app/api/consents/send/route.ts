import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import {
  sendModuleSecureSigningLink,
  deriveSendRootOperationKey,
  resolveTrustedPdfHash,
} from "@/lib/server/module-secure-signing-service";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { isTaqnyatReady } from "@/services/sms/taqnyatClient";
import { logRuntimeIncident } from "@/lib/server/runtime-observability";
import { verifyPublicAssetSource } from "@/lib/server/clinical-knowledge/services/source-verification";
import { getPrisma } from "@/lib/server/prisma";
import {
  envBool,
  findOrCreateConsentDocument,
  isAllowlistedRecipient,
  resolveCaseFromEncounter,
  resolveTemplateFromProcedure,
} from "@/lib/server/workspace-consent-helpers";
import { hashRecipient } from "@/lib/server/idempotency-core";
import { resolveCanonicalCaseContact } from "@/lib/server/recipient-resolution-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;


function resolveApprovedPdfSourceUrl(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directCandidates = [
      record.url,
      record.href,
      record.pdfUrl,
      record.pdfTemplateUrl,
      record.approvedPdfUrl,
      record.sourcePdfUrl,
      record.immutablePdfUrl,
    ];

    for (const candidate of directCandidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return "";
}

function resolveMetadataApprovedPdfSource(metadata: unknown, immutablePdfUrl?: string | null): string {
  const direct = resolveApprovedPdfSourceUrl(immutablePdfUrl);
  if (direct) return direct;

  if (!metadata || typeof metadata !== "object") return "";

  const record = metadata as Record<string, unknown>;
  const candidates = [
    record.approvedPdfUrl,
    record.sourcePdfUrl,
    record.pdfTemplateUrl,
    record.immutablePdfUrl,
    record.approvedLink,
    record.approvedConsentSource,
    record.consentForm,
    record.package,
  ];

  for (const candidate of candidates) {
    const resolved = resolveApprovedPdfSourceUrl(candidate);
    if (resolved) return resolved;
  }

  return "";
}

function isDryRunEnabled(body: Record<string, unknown>): boolean {
  if (body.dryRun === true) return true;
  const envFlag = process.env.FF_INFORMED_CONSENT_SEND_DRY_RUN?.trim().toLowerCase();
  return envFlag === "true" || envFlag === "1" || envFlag === "yes";
}

function readinessGates(
  contacts: { mobile?: string; email?: string },
  templateVersion: { id: string } | null,
  document: { id: string; status: string } | null,
): { ok: boolean; reason?: string } {
  if (!contacts.mobile || !contacts.email) {
    return { ok: false, reason: "Patient contact details missing" };
  }
  if (!templateVersion) return { ok: false, reason: "Procedure package not resolved" };
  if (!document) return { ok: false, reason: "Consent document not ready" };
  if (document.status === "VOID") return { ok: false, reason: "Consent document is void" };

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

  const approvedPdfSourceUrl = resolveApprovedPdfSourceUrl(approvedLink);
  const approvedPdfVerification = verifyPublicAssetSource(approvedPdfSourceUrl);

  if (!approvedPdfVerification.sourceVerified) {
    const reason = "Approved consent PDF source is missing or inaccessible.";

    await writeConsentAudit({
      tenantId,
      auth,
      action: "send_blocked_missing_approved_pdf_source",
      summary: reason,
      source: "api-consents-send",
      caseId: caseRecord.id,
      templateId: template.id,
      templateVersionId: version.id,
      metadata: {
        caseId: caseRecord.id,
        encounterId,
        procedureId,
        approvedPdfSourceUrl,
        sourceAvailable: approvedPdfVerification.sourceAvailable,
        sourceVerified: approvedPdfVerification.sourceVerified,
        sourceStatusCode: approvedPdfVerification.statusCode,
        sourceVerificationReason: approvedPdfVerification.reason,
      },
      request,
    });

    logRuntimeIncident({
      module: "api-consents-send",
      type: "UNHANDLED_EXCEPTION",
      operation: "send_blocked_missing_approved_pdf_source",
      tenantId,
      error: new Error(reason),
      details: {
        caseId: caseRecord.id,
        encounterId,
        procedureId,
        approvedPdfSourceUrl,
        sourceVerificationReason: approvedPdfVerification.reason,
        sourceStatusCode: approvedPdfVerification.statusCode,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: reason,
        sourceVerification: approvedPdfVerification,
      },
      { status: 422 },
    );
  }

  const document = await findOrCreateConsentDocument(tenantId, auth, caseRecord.id, template, version, approvedLink);
  const prisma = getPrisma();
  const documentWithHash = await prisma.consentDocument.findFirst({
    where: { id: document.id, tenantId },
    select: { id: true, immutablePdfHash: true, metadata: true },
  });
  const approvedPdfHash = resolveTrustedPdfHash(documentWithHash ?? document);
  if (!approvedPdfHash) {
    const reason = "Approved PDF hash is missing or untrusted for secure signing";
    await writeConsentAudit({
      tenantId,
      auth,
      action: "send_blocked_missing_approved_pdf_hash",
      summary: reason,
      source: "api-consents-send",
      caseId: caseRecord.id,
      consentDocumentId: document.id,
      templateId: template.id,
      templateVersionId: version.id,
      metadata: { documentId: document.id, caseId: caseRecord.id },
      request,
    });
    return NextResponse.json({ ok: false, error: reason }, { status: 422 });
  }

  const canonicalContacts = await resolveCanonicalCaseContact({
    tenantId,
    caseId: caseRecord.id,
  });
  const gate = readinessGates(canonicalContacts ?? {}, version, document);

  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.reason }, { status: 422 });
  }

  const patientName = caseRecord.patientName || "Patient";
  const mobileNumber = canonicalContacts?.mobile ?? "";
  const recipientEmail = canonicalContacts?.email ?? "";
  const maskedMobile = mobileNumber.replace(/\d(?=\d{4})/g, "*");
  const maskedEmail = recipientEmail.replace(/(.{2}).*?(@.*)/, "$1***$2");

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
        mobileNumber: maskedMobile,
        recipientEmail: maskedEmail,
        mobileHash: hashRecipient(mobileNumber, { tenantId }),
        emailHash: hashRecipient(recipientEmail, { tenantId }),
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
      mobileNumber: maskedMobile,
      recipientEmail: maskedEmail,
      mobileHash: hashRecipient(mobileNumber, { tenantId }),
      emailHash: hashRecipient(recipientEmail, { tenantId }),
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

  const idempotencyKey = deriveSendRootOperationKey({
    tenantId,
    caseId: caseRecord.id,
    documentId: document.id,
    approvedConsentFormKey: template.templateCode,
    approvedTemplateVersionId: version.id,
    immutablePdfHash: approvedPdfHash,
    mobileNumber,
    recipientEmail,
    locale,
  });

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
      idempotencyKey: idempotencyKey,
      approvedConsentFormKey: template.templateCode,
      approvedTemplateVersionId: version.id,
      immutablePdfHash: approvedPdfHash,
    });

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
            sessionId: workflow.sessionId,
            dispatchStatuses: workflow.dispatchStatuses,
            queuedAt: new Date().toISOString(),
          },
        } as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    await writeConsentAudit({
      tenantId,
      auth,
      action: "signing_link_created",
      summary: `Secure signing session created for document ${document.id} (session ${workflow.sessionId})`,
      source: "api-consents-send",
      caseId: caseRecord.id,
      consentDocumentId: document.id,
      templateId: template.id,
      templateVersionId: version.id,
      metadata: {
        documentId: document.id,
        caseId: caseRecord.id,
        sessionId: workflow.sessionId,
        mobileHash: hashRecipient(mobileNumber, { tenantId }),
        emailHash: hashRecipient(recipientEmail, { tenantId }),
        dispatchStatuses: workflow.dispatchStatuses,
        locale,
      },
      request,
    });

    return NextResponse.json({
      ok: true,
      workflow: {
        sessionId: workflow.sessionId,
        documentId: workflow.documentId,
        expiresAt: workflow.expiresAt,
        dispatchStatuses: workflow.dispatchStatuses,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
