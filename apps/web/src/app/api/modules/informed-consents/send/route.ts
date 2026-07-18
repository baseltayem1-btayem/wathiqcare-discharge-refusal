import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
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
  validateIdempotencyKey,
  hashRecipient,
} from "@/lib/server/idempotency-core";
import { resolveCanonicalCaseContact } from "@/lib/server/recipient-resolution-service";
import { ApiError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveApprovedPdfSourceUrl(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const candidates = [
      record.url,
      record.href,
      record.pdfUrl,
      record.pdfTemplateUrl,
      record.approvedPdfUrl,
      record.sourcePdfUrl,
      record.immutablePdfUrl,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return "";
}

function resolveMetadataApprovedPdfSource(
  metadata: unknown,
  immutablePdfUrl?: string | null,
): string {
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

function maskMobile(value: string): string {
  return value.replace(/\d(?=\d{4})/g, "*");
}

function maskEmail(value: string): string {
  return value.replace(/(.{2}).*?(@.*)/, "$1***$2");
}

function resolveIdempotencyKey(
  request: NextRequest,
  body: Record<string, unknown>,
): string | undefined {
  const header = request.headers.get("Idempotency-Key")?.trim();
  const fromBody =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : undefined;
  const key = header || fromBody;
  if (key) validateIdempotencyKey(key);
  return key;
}

export async function POST(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  let clientRequestKey: string | undefined;
  try {
    clientRequestKey = resolveIdempotencyKey(request, body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const documentId = String(body.documentId || "");
  const caseId = String(body.caseId || "");
  const patientName = String(body.patientName || "");
  const locale = body.locale === "ar" ? "ar" : "en";
  const explicitResend = body.explicitResend === true;

  if (!documentId || !caseId || !patientName) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing required fields: documentId, caseId, patientName",
      },
      { status: 400 },
    );
  }

  // Resolve the canonical contact from the case metadata. Do not trust
  // request-body patient contact values.
  const canonicalContacts = await resolveCanonicalCaseContact({
    tenantId,
    caseId,
  });
  if (!canonicalContacts?.mobile && !canonicalContacts?.email) {
    return NextResponse.json(
      { ok: false, error: "Patient contact details missing" },
      { status: 422 },
    );
  }
  const mobileNumber = canonicalContacts.mobile ?? "";
  const recipientEmail = canonicalContacts.email ?? "";

  if (isDryRunEnabled(body)) {
    const maskedMobile = maskMobile(mobileNumber);
    const maskedEmail = maskEmail(recipientEmail);

    await writeConsentAudit({
      tenantId,
      auth,
      action: "consent_dry_run_sent",
      summary: `Dry-run send validation passed for case ${caseId}`,
      source: "informed-consents-send",
      caseId,
      metadata: {
        documentId,
        caseId,
        patientName,
        mobileNumber: maskedMobile,
        recipientEmail: maskedEmail,
        mobileHash: hashRecipient(mobileNumber, { tenantId }),
        emailHash: hashRecipient(recipientEmail, { tenantId }),
        locale,
        dryRun: true,
        skippedDocumentLookup: documentId === "dry-run",
      },
      request,
    });

    return NextResponse.json({
      ok: true,
      dryRun: true,
      message: "Send validation passed. No consent sent.",
      auditAction: "consent_dry_run_sent",
      providerStatus: {
        smsReady: isTaqnyatReady(),
        emailReady: Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY),
      },
    });
  }

  const sendGatePrisma = getPrisma();
  const consentDocument = await sendGatePrisma.consentDocument.findFirst({
    where: { id: documentId, tenantId },
    select: {
      id: true,
      status: true,
      immutablePdfUrl: true,
      immutablePdfHash: true,
      metadata: true,
      templateId: true,
      templateVersionId: true,
    },
  });

  if (!consentDocument) {
    return NextResponse.json({ ok: false, error: "Consent document not found" }, { status: 404 });
  }

  if (consentDocument.status === "VOID") {
    return NextResponse.json({ ok: false, error: "Consent document is void" }, { status: 422 });
  }

  const approvedPdfSourceUrl = resolveMetadataApprovedPdfSource(
    consentDocument.metadata,
    consentDocument.immutablePdfUrl,
  );
  const approvedPdfVerification = verifyPublicAssetSource(approvedPdfSourceUrl);

  if (!approvedPdfVerification.sourceVerified) {
    const reason = "Approved consent PDF source is missing or inaccessible.";

    await writeConsentAudit({
      tenantId,
      auth,
      action: "send_blocked_missing_approved_pdf_source",
      summary: reason,
      source: "informed-consents-send",
      caseId,
      consentDocumentId: documentId,
      templateId: consentDocument.templateId,
      templateVersionId: consentDocument.templateVersionId,
      metadata: {
        documentId,
        caseId,
        approvedPdfSourceUrl,
        sourceAvailable: approvedPdfVerification.sourceAvailable,
        sourceVerified: approvedPdfVerification.sourceVerified,
        sourceStatusCode: approvedPdfVerification.statusCode,
        sourceVerificationReason: approvedPdfVerification.reason,
      },
      request,
    });

    logRuntimeIncident({
      module: "informed-consents-send",
      type: "UNHANDLED_EXCEPTION",
      operation: "send_blocked_missing_approved_pdf_source",
      tenantId,
      error: new Error(reason),
      details: {
        caseId,
        documentId,
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

  const approvedPdfHash = resolveTrustedPdfHash(consentDocument);
  if (!approvedPdfHash) {
    const reason = "Approved PDF hash is missing or untrusted for secure signing";
    await writeConsentAudit({
      tenantId,
      auth,
      action: "send_blocked_missing_approved_pdf_hash",
      summary: reason,
      source: "informed-consents-send",
      caseId,
      consentDocumentId: documentId,
      templateId: consentDocument.templateId,
      templateVersionId: consentDocument.templateVersionId,
      metadata: {
        documentId,
        caseId,
      },
      request,
    });
    return NextResponse.json({ ok: false, error: reason }, { status: 422 });
  }

  const docMetadata = (consentDocument.metadata || {}) as Record<string, unknown>;
  const approvedConsentFormKey =
    typeof docMetadata.approvedConsentFormCode === "string"
      ? docMetadata.approvedConsentFormCode
      : undefined;

  // Explicit resend requires a distinct client request key; it cannot fall back
  // to the canonical server-derived root key.
  if (explicitResend && !clientRequestKey) {
    return NextResponse.json(
      { ok: false, error: "Explicit resend requires a request key" },
      { status: 400 },
    );
  }

  const serverRootKey = deriveSendRootOperationKey({
    tenantId,
    caseId,
    documentId,
    approvedConsentFormKey,
    approvedTemplateVersionId: consentDocument.templateVersionId || undefined,
    immutablePdfHash: approvedPdfHash,
    mobileNumber,
    recipientEmail,
    locale: locale as "ar" | "en",
  });

  const initialKey = clientRequestKey || serverRootKey;

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
      mobileNumber: maskMobile(mobileNumber),
      recipientEmail: maskEmail(recipientEmail),
      mobileHash: hashRecipient(mobileNumber, { tenantId }),
      emailHash: hashRecipient(recipientEmail, { tenantId }),
      locale,
    },
    request,
  });

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
      explicitResend,
      ...(explicitResend
        ? { resendRequestKey: clientRequestKey }
        : { idempotencyKey: initialKey }),
      approvedConsentFormKey,
      approvedTemplateVersionId: consentDocument.templateVersionId || undefined,
      immutablePdfHash: approvedPdfHash,
    });

    // Persist only non-sensitive workflow identifiers on the consent document.
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
      summary: `Secure signing session created for document ${documentId} (session ${workflow.sessionId})`,
      source: "informed-consents-send",
      caseId,
      consentDocumentId: documentId,
      metadata: {
        documentId,
        caseId,
        sessionId: workflow.sessionId,
        mobileHash: hashRecipient(mobileNumber, { tenantId }),
        emailHash: hashRecipient(recipientEmail, { tenantId }),
        dispatchStatuses: workflow.dispatchStatuses,
        locale,
      },
      request,
    });

    return NextResponse.json({ ok: true, workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json(
      { ok: false, error: message, code: status === 409 ? "IDEMPOTENCY_CONFLICT" : undefined },
      { status },
    );
  }
}
