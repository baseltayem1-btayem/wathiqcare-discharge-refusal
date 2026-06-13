import { NextRequest, NextResponse } from "next/server";

import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { buildEducationVisualAid, type EducationVisualLanguage } from "@/lib/server/education-visual-aid";
import { ApiError, handleApiError } from "@/lib/server/http";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isLanguage(value: unknown): value is EducationVisualLanguage {
  return value === "ar" || value === "en" || value === "bilingual";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mergeEducationVisualMetadata(
  metadata: unknown,
  visualAid: ReturnType<typeof buildEducationVisualAid>,
  timing: { viewedAt: string | null; displayedAt: string | null },
) {
  const root = asRecord(metadata);
  const executionContext = asRecord(root.executionContext);
  const education = asRecord(executionContext.education);
  const viewedAt = timing.viewedAt || (typeof education.viewedAt === "string" ? education.viewedAt : visualAid.generatedAt);
  const displayedAt = timing.displayedAt || (typeof education.displayedAt === "string" ? education.displayedAt : viewedAt);

  return {
    ...root,
    educationVisualAid: visualAid,
    educationDisplayed: true,
    viewedAt,
    displayedAt,
    visualAidDisplayed: true,
    visualAidClinicalTopic: visualAid.clinicalTopic,
    visualAidGeneratedAt: visualAid.generatedAt,
    visualAidViewedAt: viewedAt,
    visualAidAssetId: visualAid.visualAssetId,
    executionContext: {
      ...executionContext,
      education: {
        ...education,
        educationDisplayed: true,
        displayedAt,
        viewedAt,
        updatedAt: visualAid.generatedAt,
        educationVisualAid: {
          ...visualAid,
          displayed: true,
        },
      },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:create");

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) {
      throw new ApiError(400, "Request body is required.");
    }

    const language = isLanguage(payload.language) ? payload.language : "bilingual";
    const viewedAt = asNullableString(payload.viewedAt);
    const displayedAt = asNullableString(payload.displayedAt) || viewedAt;
    const sourceEn = asNullableString(payload.visualAidSourceEn) || "AI-assisted / approved visual aid";
    const sourceAr = asNullableString(payload.visualAidSourceAr) || "وسيلة بصرية تعليمية معتمدة ومدعومة بالذكاء الاصطناعي";
    const clinicalTopicOverride = asNullableString(payload.clinicalTopic);
    const visualAidBase = buildEducationVisualAid({
      diagnosis: typeof payload.diagnosis === "string" ? payload.diagnosis : null,
      procedure: typeof payload.procedure === "string" ? payload.procedure : null,
      specialty: typeof payload.specialty === "string" ? payload.specialty : null,
      language,
      formCode: typeof payload.formCode === "string" ? payload.formCode : null,
      templateId: typeof payload.templateId === "string" ? payload.templateId : null,
    }, {
      generatedAt: asNullableString(payload.generatedAt) || undefined,
    });
    const visualAid = clinicalTopicOverride
      ? {
          ...visualAidBase,
          clinicalTopic: clinicalTopicOverride,
        }
      : visualAidBase;

    const consentDocumentId = typeof payload.consentDocumentId === "string" && payload.consentDocumentId.trim()
      ? payload.consentDocumentId.trim()
      : typeof payload.documentId === "string" && payload.documentId.trim()
        ? payload.documentId.trim()
        : null;

    if (consentDocumentId) {
      const prisma = getPrisma();
      const doc = await prisma.consentDocument.findFirst({
        where: {
          id: consentDocumentId,
          tenantId: auth.tenant_id || undefined,
        },
        select: {
          id: true,
          tenantId: true,
          metadata: true,
          templateId: true,
          templateVersionId: true,
          template: { select: { templateCode: true } },
        },
      });

      if (!doc) {
        throw new ApiError(404, "Consent document not found.");
      }

      await prisma.consentDocument.update({
        where: { id: doc.id },
        data: {
          metadata: mergeEducationVisualMetadata(doc.metadata, visualAid, {
            viewedAt,
            displayedAt,
          }),
        },
      });

      await prisma.consentAuditEvent.create({
        data: {
          tenantId: doc.tenantId,
          consentDocumentId: doc.id,
          action: "EDUCATION_VISUAL_GENERATED",
          source: "education-visual",
          actorUserId: auth.sub,
          actorRole: auth.role ?? null,
          summary: `Education visual generated (${doc.template.templateCode || "INFORMED_CONSENT"}, ${language}).`,
          metadata: {
            templateCode: doc.template.templateCode || "INFORMED_CONSENT",
            language,
            educationStepNumber: 5,
            educationStepNameEn: "Patient Education & Visual Understanding",
            educationStepNameAr: "التثقيف وفهم الإجراء بصرياً",
            educationDisplayed: true,
            visualAidDisplayed: true,
            visualAidTypeEn: visualAid.visualType,
            visualAidTypeAr: "رسم سريري تثقيفي مدعوم بالذكاء الاصطناعي",
            visualAidClinicalTopic: visualAid.clinicalTopic,
            visualAidGeneratedAt: visualAid.generatedAt,
            visualAidViewedAt: viewedAt || displayedAt || visualAid.generatedAt,
            visualAidAssetId: visualAid.visualAssetId,
            visualAidSourceEn: sourceEn,
            visualAidSourceAr: sourceAr,
            visualAidDisclaimerEn: visualAid.disclaimerEn,
            visualAidDisclaimerAr: visualAid.disclaimerAr,
            visualAidUrl: visualAid.imageUrl,
            visualAidThumbnailUrl: visualAid.thumbnailUrl,
            visualAidApproved: visualAid.approvedForEducation,
            displayedAt: displayedAt || visualAid.generatedAt,
            viewedAt: viewedAt || displayedAt || visualAid.generatedAt,
            educationLanguage: visualAid.language,
            educationVisualAid: visualAid,
          },
        },
      });
    }

    return NextResponse.json({ ok: true, visual: visualAid }, { headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (error) {
    return handleApiError(error);
  }
}