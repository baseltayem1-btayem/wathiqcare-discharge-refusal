import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {
  sendModuleSecureSigningLink,
  deriveSendRootOperationKey,
  resolveTrustedPdfHash,
} from "@/lib/server/module-secure-signing-service";
import { getPrisma } from "@/lib/server/prisma";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { ApiError } from "@/lib/server/http";
import { isAllowlistedRecipient } from "@/lib/server/workspace-consent-helpers";
import { hashRecipient } from "@/lib/server/idempotency-core";
import { resolveCanonicalCaseContact } from "@/lib/server/recipient-resolution-service";
import { enforceWitnessPolicyAtSend } from "@/lib/server/witness-requirement-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function maskMobile(value: string): string {
  return value.replace(/\d(?=\d{4})/g, "*");
}

function maskEmail(value: string): string {
  return value.replace(/(.{2}).*?(@.*)/, "$1***$2");
}

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
  const physicianName = String((body.physicianName as string) || auth.email || "").trim();
  const locale = body.locale === "en" ? "en" : "ar";

  if (!caseId || !patientName) {
    return NextResponse.json({ ok: false, error: "caseId and patientName are required" }, { status: 400 });
  }

  const prisma = getPrisma();
  const document = await prisma.consentDocument.findFirst({
    where: { id: documentId, tenantId, caseId },
    select: {
      id: true,
      patientName: true,
      status: true,
      templateVersionId: true,
      immutablePdfHash: true,
      metadata: true,
    },
  });
  if (!document) {
    return NextResponse.json({ ok: false, error: "Consent document not found" }, { status: 404 });
  }

  // Witness-policy gate: evaluate the policy and issue witness requirement
  // records before the signing link is dispatched (fail closed on invalid
  // policy configuration).
  try {
    await enforceWitnessPolicyAtSend({ auth, documentId, request });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status },
      );
    }
    throw error;
  }

  const approvedPdfHash = resolveTrustedPdfHash(document);
  if (!approvedPdfHash) {
    return NextResponse.json(
      { ok: false, error: "Approved PDF hash is missing or untrusted for secure signing" },
      { status: 422 },
    );
  }

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

  if (!isAllowlistedRecipient(mobileNumber, recipientEmail)) {
    return NextResponse.json(
      { ok: false, error: "Recipient is not approved for pilot send. Contact the platform administrator." },
      { status: 403 },
    );
  }

  const docMetadata = (document.metadata || {}) as Record<string, unknown>;
  const approvedConsentFormKey =
    typeof docMetadata.approvedConsentFormCode === "string"
      ? docMetadata.approvedConsentFormCode
      : undefined;

  const serverKey = deriveSendRootOperationKey({
    tenantId,
    caseId,
    documentId,
    approvedConsentFormKey,
    approvedTemplateVersionId: document.templateVersionId || undefined,
    immutablePdfHash: approvedPdfHash,
    mobileNumber,
    recipientEmail,
    locale: locale as "ar" | "en",
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
      locale: locale as "ar" | "en",
      baseUrl: request.nextUrl.origin,
      approvedConsentFormKey,
      approvedTemplateVersionId: document.templateVersionId || undefined,
      immutablePdfHash: approvedPdfHash,
      idempotencyKey: serverKey,
    });

    // Persist only non-sensitive workflow identifiers on the document.
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
        },
      },
    });

    await writeConsentAudit({
      tenantId,
      auth,
      action: "signing_link_created",
      summary: `Secure signing session created for document ${documentId} (session ${workflow.sessionId})`,
      source: "informed-consents-documents-secure-signing",
      caseId,
      consentDocumentId: documentId,
      metadata: {
        sessionId: workflow.sessionId,
        mobileHash: mobileNumber ? hashRecipient(mobileNumber, { tenantId }) : null,
        emailHash: recipientEmail ? hashRecipient(recipientEmail, { tenantId }) : null,
        dispatchStatuses: workflow.dispatchStatuses,
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
