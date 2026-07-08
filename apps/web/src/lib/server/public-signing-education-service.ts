import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import {
  mergeEducationSessionContext,
  type EducationSessionEventType,
} from "@/lib/server/education-session-service";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import {
  asRecord,
  getBoolean,
  getEducationStatus,
  getLinkedEducationPackage,
  getNullableString,
  getString,
  getStringArray,
  loadPublicDocumentRecord,
  validatePublicSigningSession,
  writePublicConsentAudit,
} from "@/lib/server/public-signing-decision-service";
import { getSigningTokenContext } from "@/lib/server/signing-token-context-service";

const prisma = () => getPrisma();

type PublicEducationEventType = EducationSessionEventType;

function buildPublicEducationEventSummary(
  eventType: PublicEducationEventType,
  packageKey: string,
  language: string | null,
): string {
  const normalizedLanguage = language || "bilingual";
  switch (eventType) {
    case "EDUCATION_PRESENTED":
      return `Public education presented (${packageKey}, ${normalizedLanguage}).`;
    case "EDUCATION_STARTED":
      return `Public education started (${packageKey}, ${normalizedLanguage}).`;
    case "EDUCATION_COMPLETED":
      return `Public education completed (${packageKey}, ${normalizedLanguage}).`;
    case "EDUCATION_ACKNOWLEDGED":
      return `Public education acknowledged (${packageKey}, ${normalizedLanguage}).`;
    default:
      return `Public education event ${eventType} (${packageKey}, ${normalizedLanguage}).`;
  }
}

function mergeEducationExecutionContext(
  rawMetadata: unknown,
  linkedPackage: Awaited<ReturnType<typeof getLinkedEducationPackage>> extends infer T ? Exclude<T, null> : never,
  eventType: PublicEducationEventType,
  sessionId: string,
  documentId: string,
  payload: {
    language: string | null;
    durationSeconds?: number | null;
    scrollCompletion?: number | null;
    assetViews?: string[];
    acknowledgement?: boolean;
  },
): Record<string, unknown> {
  const metadata = asRecord(rawMetadata) || {};
  const executionContext = asRecord(metadata.executionContext) || {};
  const education = asRecord(executionContext.education) || {};
  const occurredAt = new Date().toISOString();

  const nextEducation = {
    ...education,
    packageId: linkedPackage.packageId,
    packageKey: linkedPackage.packageKey,
    versionId: linkedPackage.versionId,
    versionLabel: linkedPackage.versionLabel,
    contentHash: linkedPackage.contentHash,
    language: payload.language || education.language || null,
    viewedAt:
      eventType === "EDUCATION_PRESENTED"
        ? occurredAt
        : education.viewedAt || null,
    completedAt:
      eventType === "EDUCATION_COMPLETED"
        ? occurredAt
        : education.completedAt || null,
    acknowledgedAt:
      eventType === "EDUCATION_ACKNOWLEDGED"
        ? occurredAt
        : education.acknowledgedAt || null,
    durationSeconds: payload.durationSeconds ?? education.durationSeconds ?? null,
    scrollCompletion: payload.scrollCompletion ?? education.scrollCompletion ?? null,
    assetViews: payload.assetViews ?? getStringArray(education.assetViews),
    acknowledgement: payload.acknowledgement ?? getBoolean(education.acknowledgement),
    lastEventType: eventType,
    updatedAt: occurredAt,
  };

  return mergeEducationSessionContext({
    rawMetadata: {
      ...metadata,
      executionContext: {
        ...executionContext,
        education: nextEducation,
      },
    },
    eventType,
    sessionId,
    documentId,
    packageId: linkedPackage.packageId,
    versionId: linkedPackage.versionId,
    occurredAt,
  });
}

export async function recordPublicEducationEvent(args: {
  token: string;
  request?: NextRequest;
  eventType: PublicEducationEventType;
  language?: string;
  durationSeconds?: number;
  scrollCompletion?: number;
  assetViews?: string[];
  acknowledgement?: boolean;
}) {
  if (args.request) {
    await validatePublicSigningSession({ token: args.token, request: args.request });
  }
  const context = await getSigningTokenContext(args.token);
  const doc = await loadPublicDocumentRecord(context.tenantId, context.documentId);
  const linkedEducationPackage = await getLinkedEducationPackage(
    context.tenantId,
    doc.templateId,
    doc.templateVersionId,
  );

  if (!linkedEducationPackage) {
    throw new ApiError(409, "No approved education package is linked to this consent document");
  }

  const assetViews = Array.from(new Set((args.assetViews || []).map((item) => getString(item)).filter(Boolean)));
  const imagesPresented = linkedEducationPackage.assets.filter((asset) => asset.assetType === "IMAGE").length;
  const videosPresented = linkedEducationPackage.assets.filter((asset) => asset.assetType === "VIDEO").length;
  const pdfsPresented = linkedEducationPackage.assets.filter((asset) => asset.assetType === "PDF").length;
  const metadata = {
    packageId: linkedEducationPackage.packageId,
    packageKey: linkedEducationPackage.packageKey,
    educationVersion: linkedEducationPackage.versionLabel,
    educationVersionId: linkedEducationPackage.versionId,
    contentHash: linkedEducationPackage.contentHash,
    language: getNullableString(args.language),
    durationSeconds: args.durationSeconds ?? null,
    scrollCompletion: args.scrollCompletion ?? null,
    assetViews,
    acknowledgement: Boolean(args.acknowledgement),
    assetsPresented: linkedEducationPackage.assets.length,
    imagesPresented,
    videosPresented,
    pdfsPresented,
  };

  await prisma().$transaction(async (tx) => {
    await tx.consentDocument.update({
      where: { id: doc.id },
      data: {
        metadata: mergeEducationExecutionContext(
          doc.metadata,
          linkedEducationPackage,
          args.eventType,
          context.sessionId,
          doc.id,
          {
            language: getNullableString(args.language),
            durationSeconds: args.durationSeconds ?? null,
            scrollCompletion: args.scrollCompletion ?? null,
            assetViews,
            acknowledgement: args.acknowledgement,
          },
        ) as Prisma.InputJsonValue,
      },
    });

    await writePublicConsentAudit({
      tenantId: context.tenantId,
      consentDocumentId: doc.id,
      action: args.eventType,
      summary: buildPublicEducationEventSummary(
        args.eventType,
        linkedEducationPackage.packageKey,
        getNullableString(args.language),
      ),
      signerRole: context.signerRole,
      metadata,
      request: args.request,
      tx,
    });
  });

  return getEducationStatus(context.tenantId, doc.id, linkedEducationPackage, context.sessionId);
}