import crypto from "node:crypto";
import {
  $Enums,
  ConsentDocumentStatus,
  ConsentEvidenceCopyType,
  ConsentSignatureRole,
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import type { NextRequest } from "next/server";
import { ensureEvidenceEventSchema, recordEvidenceEvent } from "@/lib/server/evidence-package-2-service";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { sendPatientCopyNotificationEmail } from "@/lib/server/pilot-email-override";
import {
  buildConsentContentHash,
  buildRefusalFormPayload,
  computeDocumentHash,
  getDecisionStatus,
  getEducationStatus,
  getLinkedEducationPackage,
  getString,
  loadPublicDocumentRecord,
  mergeDecisionExecutionContext,
  validatePublicSigningSession,
  writePublicConsentAudit,
} from "@/lib/server/public-signing-decision-service";

const prisma = () => getPrisma();

const OTP_PROVIDER_KEY = "public_signing_otp";
const OTP_REQUESTED_EVENT = "OTP_REQUESTED";

type PublicSignatureResult = {
  documentId: string;
  status: string;
  signatureId: string;
  signerRole: string;
  signerName: string;
  signatureMethod: string;
  signedAt: string;
  finalPdf: {
    status:
      | "generated"
      | "failed"
      | "pending"
      | "patient_copy_available"
      | "pending_physician_signature"
      | "finalization_pending";
    viewUrl: string;
    downloadUrl: string;
    retryUrl: string;
    error: string | null;
  };
  evidence: {
    documentHash: string;
    otpHash: string;
    educationCompleted: boolean;
    patientAcknowledged: boolean;
    decisionStatus: string;
  };
};

function getClientIpAddress(request?: NextRequest): string | null {
  return request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

function normalizeSignerRole(value: string): $Enums.ConsentSignatureRole {
  const normalized = value.trim().toUpperCase();
  if (normalized === ConsentSignatureRole.GUARDIAN) return ConsentSignatureRole.GUARDIAN;
  return ConsentSignatureRole.PATIENT;
}

function normalizeRecipientEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidRecipientEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function getSecureSigningRecipientEmail(metadata: unknown): string | null {
  const root = typeof metadata === "object" && metadata && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : null;
  const workflow = root && typeof root.secureSigningWorkflow === "object" && root.secureSigningWorkflow && !Array.isArray(root.secureSigningWorkflow)
    ? (root.secureSigningWorkflow as Record<string, unknown>)
    : null;
  const recipientEmail = normalizeRecipientEmail(getString(workflow?.recipientEmail));
  if (!recipientEmail || !isValidRecipientEmail(recipientEmail)) {
    return null;
  }
  return recipientEmail;
}

function getPublicFinalPdfUrls(token: string) {
  const basePath = `/api/public/informed-consents/signing/${encodeURIComponent(token)}/final-pdf`;
  return {
    viewUrl: `${basePath}?disposition=inline&lang=bilingual&copy=PATIENT_COPY`,
    downloadUrl: `${basePath}?disposition=attachment&lang=bilingual&copy=PATIENT_COPY`,
    retryUrl: `${basePath}?disposition=inline&lang=bilingual&copy=PATIENT_COPY`,
  };
}

function buildFinalPdfState(
  token: string,
  args: { signerCompletesWorkflow: boolean; hasPhysicianSignature: boolean },
): PublicSignatureResult["finalPdf"] {
  if (!args.signerCompletesWorkflow) {
    return {
      status: "pending",
      error: "Final PDF will be available after the patient-side signing journey is complete.",
      ...getPublicFinalPdfUrls(token),
    };
  }

  if (!args.hasPhysicianSignature) {
    return {
      status: "patient_copy_available",
      error: "Patient copy is available. Finalization is pending physician countersignature.",
      ...getPublicFinalPdfUrls(token),
    };
  }

  return {
    status: "finalization_pending",
    error: "Final PDF will be available from the dedicated final PDF route.",
    ...getPublicFinalPdfUrls(token),
  };
}

type OtpChallengePayload = {
  challengeId: string;
  tokenHash: string;
  otpHash: string;
  phoneNumber: string;
  maskedPhone: string;
  expiresAt: string;
  sessionId: string;
  documentId: string;
  moduleType: string;
};

type OtpEventRow = {
  id: string;
  raw_payload: unknown;
  received_at: Date | string;
};

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseOtpPayload(raw: unknown): OtpChallengePayload | null {
  if (!raw) return null;

  const value = typeof raw === "string" ? safeJsonParse(raw) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const payload = value as Partial<OtpChallengePayload>;
  if (!payload.challengeId || !payload.tokenHash || !payload.otpHash || !payload.expiresAt) {
    return null;
  }

  return {
    challengeId: String(payload.challengeId),
    tokenHash: String(payload.tokenHash),
    otpHash: String(payload.otpHash),
    phoneNumber: String(payload.phoneNumber || ""),
    maskedPhone: String(payload.maskedPhone || ""),
    expiresAt: String(payload.expiresAt),
    sessionId: String(payload.sessionId || ""),
    documentId: String(payload.documentId || ""),
    moduleType: String(payload.moduleType || ""),
  };
}

async function getLatestOtpEventByChallenge(challengeId: string, eventType: string): Promise<OtpChallengePayload | null> {
  const rows = await prisma().$queryRawUnsafe<OtpEventRow[]>(
    `SELECT id, raw_payload, received_at
     FROM webhook_events
     WHERE provider_key = $1
       AND event_type = $2
       AND raw_payload ->> 'challengeId' = $3
     ORDER BY received_at DESC
     LIMIT 1`,
    OTP_PROVIDER_KEY,
    eventType,
    challengeId,
  );

  return parseOtpPayload(rows[0]?.raw_payload);
}

function buildEvidenceCopyFileName(reference: string, copyType: string): string {
  switch (copyType) {
    case ConsentEvidenceCopyType.PATIENT_COPY:
      return `CONSENT-${reference}-PATIENT.pdf`;
    case ConsentEvidenceCopyType.MEDICAL_RECORD_COPY:
      return `CONSENT-${reference}-MR.pdf`;
    case ConsentEvidenceCopyType.LEGAL_ARCHIVE_COPY:
      return `CONSENT-${reference}-LEGAL.pdf`;
    default:
      return `CONSENT-${reference}-EVIDENCE.pdf`;
  }
}

const CONSENT_EVIDENCE_PACKAGE_SCHEMA_STATEMENTS = [
  `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'ConsentEvidenceCopyType'
      ) THEN
        CREATE TYPE "ConsentEvidenceCopyType" AS ENUM (
          'PATIENT_COPY',
          'MEDICAL_RECORD_COPY',
          'LEGAL_ARCHIVE_COPY'
        );
      END IF;
    END
    $$
  `,
  `
    CREATE TABLE IF NOT EXISTS consent_evidence_packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      consent_document_id UUID NOT NULL,
      copy_type "ConsentEvidenceCopyType" NOT NULL,
      file_name TEXT NOT NULL,
      storage_path TEXT,
      checksum_hash TEXT NOT NULL,
      generated_by TEXT,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metadata JSONB
    )
  `,
  `
    ALTER TABLE consent_evidence_packages
      ALTER COLUMN copy_type TYPE "ConsentEvidenceCopyType"
      USING copy_type::text::"ConsentEvidenceCopyType"
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_consent_evidence_packages_doc_type
      ON consent_evidence_packages (tenant_id, consent_document_id, copy_type)
  `,
];

let ensureConsentEvidencePackageSchemaPromise: Promise<void> | null = null;

async function ensureConsentEvidencePackageSchema(): Promise<void> {
  if (!ensureConsentEvidencePackageSchemaPromise) {
    ensureConsentEvidencePackageSchemaPromise = (async () => {
      const client = prisma();
      for (const statement of CONSENT_EVIDENCE_PACKAGE_SCHEMA_STATEMENTS) {
        await client.$executeRawUnsafe(statement);
      }
    })().finally(() => {
      ensureConsentEvidencePackageSchemaPromise = null;
    });
  }

  await ensureConsentEvidencePackageSchemaPromise;
}

async function persistPublicSigningEvidencePackages(
  args: {
    tenantId: string;
    documentId: string;
    caseId: string | null;
    patientName: string | null;
    patientEmail: string | null;
    consentReference: string | null;
    generatedAt: Date;
    generatedBy: string;
    pdfHash: string;
    documentHash: string;
    otpHash: string;
    otpVerifiedAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    education: Awaited<ReturnType<typeof getEducationStatus>>;
    decision: Awaited<ReturnType<typeof getDecisionStatus>>;
    signerName: string;
    signatureHash: string | null;
    signatureId: string;
    consentVersion: string;
    sendPatientCopyNotification?: boolean;
  },
  tx?: PrismaClient | Prisma.TransactionClient,
): Promise<void> {
  await ensureConsentEvidencePackageSchema();
  const reference = (args.consentReference || args.documentId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const copyTypes = [
    ConsentEvidenceCopyType.PATIENT_COPY,
    ConsentEvidenceCopyType.MEDICAL_RECORD_COPY,
    ConsentEvidenceCopyType.LEGAL_ARCHIVE_COPY,
  ];
  const filePrefix = args.decision.status === "CONSENT_REFUSED" ? `REFUSAL-${reference}` : reference;
  const metadata: Prisma.InputJsonValue = {
    source: "public-signing",
    generatedAt: args.generatedAt.toISOString(),
    otpHash: args.otpHash,
    otpVerifiedAt: args.otpVerifiedAt,
    ipAddress: args.ipAddress,
    userAgent: args.userAgent,
    decision: {
      status: args.decision.status,
      consentPresentedAt: args.decision.consentPresentedAt,
      selectedAt: args.decision.selectedAt,
      refusalAcknowledged: args.decision.refusalAcknowledged,
      refusalAcknowledgedAt: args.decision.refusalAcknowledgedAt,
      refusalSignedAt: args.decision.refusalSignedAt,
    },
    education: {
      displayedAt: args.education.viewedAt,
      acknowledgedAt: args.education.acknowledgedAt,
      completed: args.education.completed,
      patientAcknowledged: args.education.patientAcknowledged,
      completedAt: args.education.completedAt,
      durationSeconds: args.education.durationSeconds,
      scrollCompletion: args.education.scrollCompletion,
      session: args.education.session,
    },
    evidenceBundle: {
      educationVersion: args.education.versionLabel,
      educationHash: args.education.contentHash,
      consentVersion: args.consentVersion,
      consentHash: args.documentHash,
      refusalFormHash: args.decision.refusalForm?.formHash || null,
      otpVerification: {
        verifiedAt: args.otpVerifiedAt,
        otpHash: args.otpHash,
      },
      signature: {
        signerName: args.signerName,
        signatureHash: args.signatureHash,
        signatureId: args.signatureId,
      },
    },
    refusalForm: args.decision.refusalForm,
  };

  const client = tx ?? prisma();

  const existing = await client.consentEvidencePackage.findMany({
    where: {
      tenantId: args.tenantId,
      consentDocumentId: args.documentId,
      copyType: { in: copyTypes },
    },
    select: {
      id: true,
      copyType: true,
    },
  });
  const existingByType = new Map(existing.map((item) => [item.copyType, item]));

  for (const copyType of copyTypes) {
    const fileName = buildEvidenceCopyFileName(filePrefix, copyType);
    const storagePath = `informed-consents/${args.documentId}/evidence/${fileName}`;
    const row = existingByType.get(copyType);

    if (row) {
      await client.consentEvidencePackage.update({
        where: { id: row.id },
        data: {
          fileName,
          storagePath,
          checksumHash: args.pdfHash,
          generatedBy: args.generatedBy,
          generatedAt: args.generatedAt,
          metadata,
        },
      });
      continue;
    }

    await client.consentEvidencePackage.create({
      data: {
        tenantId: args.tenantId,
        consentDocumentId: args.documentId,
        copyType,
        fileName,
        storagePath,
        checksumHash: args.pdfHash,
        generatedBy: args.generatedBy,
        generatedAt: args.generatedAt,
        metadata,
      },
    });
  }

  if (args.patientEmail && args.sendPatientCopyNotification !== false) {
    try {
      await sendPatientCopyNotificationEmail({
        tenantId: args.tenantId,
        caseId: args.caseId,
        patientName: args.patientName,
        documentId: args.documentId,
        consentReference: args.consentReference,
        copyType: ConsentEvidenceCopyType.PATIENT_COPY,
        recipientEmail: args.patientEmail,
      });
    } catch (error) {
      console.error("[public-signing] patient copy notification email failed", error);
    }
  }
}

export async function submitPublicSigningSignature(args: {
  token: string;
  signerName: string;
  signatureDataUrl?: string;
  request: NextRequest;
}): Promise<PublicSignatureResult> {
  const context = await validatePublicSigningSession({
    token: args.token,
    request: args.request,
  });
  const signerRole = normalizeSignerRole(context.signerRole);
  const signerName = getString(args.signerName);

  if (!signerName) {
    throw new ApiError(400, "signerName is required");
  }

  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  const patientEmail = getSecureSigningRecipientEmail(doc.metadata);
  if (doc.status === ConsentDocumentStatus.FINALIZED) {
    throw new ApiError(409, "Finalized consent cannot accept signatures");
  }

  if (doc.signatures.some((signature) => signature.role === signerRole)) {
    throw new ApiError(409, "Signature already captured for this signer role");
  }

  const latestRequestedChallenge = await getLatestOtpEventByChallenge(context.publicSession.challengeId, OTP_REQUESTED_EVENT);
  if (!latestRequestedChallenge?.otpHash) {
    throw new ApiError(409, "Missing OTP evidence for this signing session");
  }

  const linkedEducationPackage = await getLinkedEducationPackage(
    context.tenantId,
    doc.templateId,
    doc.templateVersionId,
  );
  const education = await getEducationStatus(context.tenantId, context.documentId, linkedEducationPackage, context.sessionId);
  const decision = await getDecisionStatus(context.tenantId, doc, education);
  if (linkedEducationPackage && (!education.completed || !education.patientAcknowledged)) {
    throw new ApiError(409, "Education must be completed and acknowledged before signature capture");
  }
  if (decision.status === "UNDECIDED") {
    throw new ApiError(409, "Consent decision is required before signature capture");
  }
  const signatureHash = args.signatureDataUrl
    ? crypto.createHash("sha256").update(args.signatureDataUrl).digest("hex")
    : null;
  const requestIpAddress = getClientIpAddress(args.request);
  const requestUserAgent = args.request.headers.get("user-agent") || null;
  const documentHash = computeDocumentHash({
    documentId: doc.id,
    consentReference: doc.consentReference,
    status: doc.status,
    diagnosis: doc.diagnosis,
    plannedProcedure: doc.plannedProcedure,
    templateVersionId: doc.templateVersionId,
    updatedAt: doc.updatedAt.toISOString(),
  });

  await ensureConsentEvidencePackageSchema();
  await ensureEvidenceEventSchema();

  if (decision.status === "CONSENT_REFUSED") {
    if (!decision.refusalAcknowledged) {
      throw new ApiError(409, "Refusal acknowledgement is required before refusal signature capture");
    }
    if (decision.refusalSignatureCaptured) {
      throw new ApiError(409, "Refusal form signature already captured for this signer role");
    }

    const signatureId = crypto.randomUUID();
    const capturedAt = new Date().toISOString();
    const refusalForm = decision.refusalForm || buildRefusalFormPayload({ doc, education });
    const hasPhysicianSignature = doc.signatures.some((signature) => signature.role === ConsentSignatureRole.PHYSICIAN);

    await prisma().$transaction(async (tx) => {
      await tx.consentDocument.update({
        where: { id: context.documentId },
        data: {
          status: ConsentDocumentStatus.SIGNED,
          metadata: mergeDecisionExecutionContext({
            rawMetadata: doc.metadata,
            eventType: "REFUSAL_ACKNOWLEDGED",
            decisionStatus: decision.status,
            consentHash: buildConsentContentHash(doc),
            consentVersion: doc.templateVersion.versionLabel,
            education,
            refusalForm,
            refusalAcknowledged: true,
            refusalSignature: {
              signatureId,
              signerName,
              signatureHash,
              capturedAt,
              ipAddress: requestIpAddress,
              userAgent: requestUserAgent,
              otpVerifiedAt: context.publicSession.verifiedAt,
            },
          }) as Prisma.InputJsonValue,
        },
      });

      await persistPublicSigningEvidencePackages({
        tenantId: context.tenantId,
        documentId: context.documentId,
        caseId: doc.caseId,
        patientName: doc.patientName,
        patientEmail: null,
        consentReference: doc.consentReference,
        generatedAt: new Date(capturedAt),
        generatedBy: "public_signer",
        pdfHash: doc.auditChecksum || doc.immutablePdfHash || documentHash,
        documentHash,
        otpHash: latestRequestedChallenge.otpHash,
        otpVerifiedAt: context.publicSession.verifiedAt,
        ipAddress: requestIpAddress,
        userAgent: requestUserAgent,
        education,
        decision: {
          ...decision,
          refusalAcknowledged: true,
          refusalSignedAt: capturedAt,
          refusalSignatureCaptured: true,
          refusalSignatureId: signatureId,
          refusalForm,
        },
        signerName,
        signatureHash,
        signatureId,
        consentVersion: doc.templateVersion.versionLabel,
        sendPatientCopyNotification: false,
      }, tx);

      await writePublicConsentAudit({
        tenantId: context.tenantId,
        consentDocumentId: context.documentId,
        action: "REFUSAL_SIGNED",
        summary: `Treatment refusal form signed for consent ${doc.consentReference}`,
        signerRole,
        metadata: {
          signerName,
          signatureMethod: $Enums.ConsentMethod.OTP,
          tokenHash: context.publicSession.tokenHash,
          challengeId: context.publicSession.challengeId,
          documentHash,
          refusalFormHash: refusalForm.formHash,
          educationCompleted: education.completed,
          patientAcknowledged: education.patientAcknowledged,
          signatureHash,
        },
        request: args.request,
        tx,
      });

      await recordEvidenceEvent({
        tenantId: context.tenantId,
        consentDocumentId: context.documentId,
        eventType: "REFUSAL_SIGNED",
        eventTimestamp: new Date(capturedAt),
        signatureTimestamp: new Date(capturedAt),
        signerIdentity: signerName,
        consentTemplate: doc.template.titleEn,
        consentVersion: doc.templateVersion.versionLabel,
        consentLanguage: "bilingual",
        ipAddress: requestIpAddress || undefined,
        browser: requestUserAgent || undefined,
        otpVerificationTime: new Date(context.publicSession.verifiedAt),
        otpVerificationStatus: "VERIFIED",
        educationViewed: Boolean(education.viewedAt),
        metadata: {
          otpHash: latestRequestedChallenge.otpHash,
          tokenHash: context.publicSession.tokenHash,
          challengeId: context.publicSession.challengeId,
          documentHash,
          refusalFormHash: refusalForm.formHash,
          educationCompleted: education.completed,
          patientAcknowledged: education.patientAcknowledged,
          educationDisplayedAt: education.viewedAt,
          educationAcknowledgedAt: education.acknowledgedAt,
          educationDurationSeconds: education.durationSeconds,
          educationScrollCompletion: education.scrollCompletion,
          educationVersion: education.versionLabel,
          educationHash: education.contentHash,
          signatureHash,
          decisionStatus: decision.status,
        },
      }, tx);
    });

    return {
      documentId: context.documentId,
      status: ConsentDocumentStatus.SIGNED,
      signatureId,
      signerRole,
      signerName,
      signatureMethod: $Enums.ConsentMethod.OTP,
      signedAt: capturedAt,
      evidence: {
        documentHash,
        otpHash: latestRequestedChallenge.otpHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
        decisionStatus: decision.status,
      },
      finalPdf: buildFinalPdfState(args.token, {
        signerCompletesWorkflow: true,
        hasPhysicianSignature,
      }),
    };
  }

  const signerCompletesWorkflow = signerRole === ConsentSignatureRole.PATIENT || signerRole === ConsentSignatureRole.GUARDIAN;

  const { signature, nextStatus, hasPhysician } = await prisma().$transaction(async (tx) => {
    const signature = await tx.consentDocumentSignature.create({
      data: {
        tenantId: context.tenantId,
        consentDocumentId: context.documentId,
        role: signerRole,
        signerName,
        signatureMethod: $Enums.ConsentMethod.OTP,
        ipAddress: requestIpAddress,
        userAgent: requestUserAgent,
        signatureHash,
        metadata: {
          capturedBy: "public_signer",
          tokenHash: context.publicSession.tokenHash,
          challengeId: context.publicSession.challengeId,
          otpVerifiedAt: context.publicSession.verifiedAt,
          signatureProvided: Boolean(args.signatureDataUrl),
          signatureHash,
        },
      },
    });

    const signatures = [...doc.signatures, signature];
    const hasPatient = signatures.some((item) => item.role === ConsentSignatureRole.PATIENT || item.role === ConsentSignatureRole.GUARDIAN);
    const hasPhysician = signatures.some((item) => item.role === ConsentSignatureRole.PHYSICIAN);
    const nextStatus = signerCompletesWorkflow
      ? ConsentDocumentStatus.SIGNED
      : (hasPatient && hasPhysician
      ? ConsentDocumentStatus.SIGNED
      : ConsentDocumentStatus.READY_FOR_SIGNATURE);

    await tx.consentDocument.update({
      where: { id: context.documentId },
      data: {
        status: nextStatus,
      },
    });

    const pdfHash = doc.auditChecksum || doc.immutablePdfHash || documentHash;
    await persistPublicSigningEvidencePackages({
      tenantId: context.tenantId,
      documentId: context.documentId,
      caseId: doc.caseId,
      patientName: doc.patientName,
      patientEmail,
      consentReference: doc.consentReference,
      generatedAt: signature.signedAt,
      generatedBy: "public_signer",
      pdfHash,
      documentHash,
      otpHash: latestRequestedChallenge.otpHash,
      otpVerifiedAt: context.publicSession.verifiedAt,
      ipAddress: requestIpAddress,
      userAgent: requestUserAgent,
      education,
      decision,
      signerName,
      signatureHash,
      signatureId: signature.id,
      consentVersion: doc.templateVersion.versionLabel,
      sendPatientCopyNotification: false,
    }, tx);

    await writePublicConsentAudit({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      action: "PATIENT_SIGNATURE_CAPTURED",
      summary: `Signature captured (${signerRole}) for consent ${doc.consentReference}`,
      signerRole,
      metadata: {
        signerName,
        signatureMethod: $Enums.ConsentMethod.OTP,
        tokenHash: context.publicSession.tokenHash,
        challengeId: context.publicSession.challengeId,
        nextStatus,
        documentHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
        signatureHash,
      },
      request: args.request,
      tx,
    });

    await writePublicConsentAudit({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      action: "consent_signed",
      summary: `Consent signed by ${signerRole.toLowerCase()} for consent ${doc.consentReference}`,
      signerRole,
      metadata: {
        signerName,
        signatureMethod: $Enums.ConsentMethod.OTP,
        tokenHash: context.publicSession.tokenHash,
        challengeId: context.publicSession.challengeId,
        nextStatus,
        documentHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
        signatureHash,
      },
      request: args.request,
      tx,
    });

    await recordEvidenceEvent({
      tenantId: context.tenantId,
      consentDocumentId: context.documentId,
      eventType: "PATIENT_SIGNATURE_CAPTURED",
      eventTimestamp: signature.signedAt,
      signatureTimestamp: signature.signedAt,
      signerIdentity: signerName,
      consentTemplate: doc.template.titleEn,
      consentVersion: doc.templateVersion.versionLabel,
      consentLanguage: "bilingual",
      ipAddress: signature.ipAddress || undefined,
      browser: signature.userAgent || undefined,
      otpVerificationTime: new Date(context.publicSession.verifiedAt),
      otpVerificationStatus: "VERIFIED",
      educationViewed: Boolean(education.viewedAt),
      metadata: {
        otpHash: latestRequestedChallenge.otpHash,
        tokenHash: context.publicSession.tokenHash,
        challengeId: context.publicSession.challengeId,
        documentHash,
        pdfHash,
        educationCompleted: education.completed,
        patientAcknowledged: education.patientAcknowledged,
        educationDisplayedAt: education.viewedAt,
        educationAcknowledgedAt: education.acknowledgedAt,
        educationDurationSeconds: education.durationSeconds,
        educationScrollCompletion: education.scrollCompletion,
        educationVersion: education.versionLabel,
        educationHash: education.contentHash,
        signatureHash,
        signatureProvided: Boolean(args.signatureDataUrl),
      },
    }, tx);

    return { signature, nextStatus, hasPhysician };
  }, {
    timeout: 20000,
  });

  if (patientEmail) {
    try {
      await sendPatientCopyNotificationEmail({
        tenantId: context.tenantId,
        caseId: doc.caseId,
        patientName: doc.patientName,
        documentId: context.documentId,
        consentReference: doc.consentReference,
        copyType: ConsentEvidenceCopyType.PATIENT_COPY,
        recipientEmail: patientEmail,
      });
    } catch (error) {
      console.error("[public-signing] patient copy notification email failed", error);
    }
  }

  return {
    documentId: context.documentId,
    status: nextStatus,
    signatureId: signature.id,
    signerRole,
    signerName,
    signatureMethod: signature.signatureMethod,
    signedAt: signature.signedAt.toISOString(),
    finalPdf: buildFinalPdfState(args.token, {
      signerCompletesWorkflow,
      hasPhysicianSignature: hasPhysician,
    }),
    evidence: {
      documentHash,
      otpHash: latestRequestedChallenge.otpHash,
      educationCompleted: education.completed,
      patientAcknowledged: education.patientAcknowledged,
      decisionStatus: decision.status,
    },
  };
}