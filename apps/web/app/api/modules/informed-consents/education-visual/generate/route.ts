import { NextRequest, NextResponse } from "next/server";

import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import type { EducationVisualLanguage } from "@/lib/server/education-visual-aid";
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

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function isCriticalCareLookup(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("imc mr 1363")
    || normalized.includes("imc-mr-1363")
    || normalized.includes("critical care")
    || normalized.includes("intensive care")
    || normalized.includes("icu");
}

function buildClinicalTopic(payload: Record<string, unknown>): string {
  const explicitTopic = asNullableString(payload.clinicalTopic);
  if (explicitTopic) return explicitTopic;

  const values = [
    asNullableString(payload.procedure),
    asNullableString(payload.diagnosis),
    asNullableString(payload.formCode),
    asNullableString(payload.specialty),
  ].filter((value): value is string => Boolean(value));

  const criticalCareValue = values.find((value) => isCriticalCareLookup(value));
  if (criticalCareValue) return "ICU / Critical Care";

  return values[0] || "Patient Education";
}

type LinkedEducationAsset = {
  id: string;
  assetKey: string;
  assetType: string;
  title: string;
  locale: string;
  sourceUri: string | null;
  thumbnailUri: string | null;
  sortOrder: number;
};

type LinkedEducationPackagePayload = {
  packageId: string;
  packageKey: string;
  titleAr: string;
  titleEn: string;
  versionId: string;
  versionLabel: string;
  contentHash: string | null;
  summary: { ar: string; en: string } | null;
  assets: LinkedEducationAsset[];
};

type LegacyEducationPackageRow = {
  id: string;
  package_key: string;
  title_ar: string;
  title_en: string;
  summary_ar: string | null;
  summary_en: string | null;
  version_id: string;
  version_label: string;
  content_hash: string | null;
  linked_template_ids: unknown;
  linked_template_version_ids: unknown;
  manifest_json: unknown;
};

type LegacyEducationAssetRow = {
  id: string;
  asset_key: string;
  asset_type: string;
  title: string;
  locale: string;
  source_uri: string | null;
  thumbnail_uri: string | null;
  sort_order: number;
};

type ResolvedEducationVisualAid = {
  displayed: boolean;
  displayedTitle: string;
  visualType: string;
  visualAssetId: string;
  clinicalTopic: string;
  language: EducationVisualLanguage;
  imageUrl: string;
  thumbnailUrl: string;
  promptSummary: string;
  generatedAt: string;
  approvedForEducation: boolean;
  source: "approved-library";
  disclaimerEn: string;
  disclaimerAr: string;
  patientAcknowledged: boolean;
};

const VISUAL_DISCLAIMER_EN = "This educational image supports physician counseling and does not replace direct medical explanation.";
const VISUAL_DISCLAIMER_AR = "هذه الصورة التعليمية تدعم شرح الطبيب ولا تغني عن التوضيح الطبي المباشر.";

function getLocalizedLine(value: unknown): { ar: string; en: string } | null {
  const record = asRecord(value);
  const ar = getString(record.ar);
  const en = getString(record.en);
  if (!ar && !en) return null;
  return { ar, en };
}

function selectPreferredAsset(assets: LinkedEducationAsset[], language: EducationVisualLanguage): LinkedEducationAsset | null {
  const imageAssets = assets.filter((asset) => asset.assetType === "IMAGE" && getString(asset.sourceUri));
  if (imageAssets.length === 0) return null;

  const localeRank = (locale: string) => {
    const normalized = locale.trim().toLowerCase();
    if (normalized === language) return 0;
    if (normalized === "bilingual") return 1;
    if (language === "bilingual" && (normalized === "en" || normalized === "ar")) return 2;
    if (normalized === "en") return 3;
    if (normalized === "ar") return 4;
    return 5;
  };

  return [...imageAssets].sort((left, right) => {
    const localeDelta = localeRank(left.locale) - localeRank(right.locale);
    if (localeDelta !== 0) return localeDelta;
    return left.sortOrder - right.sortOrder;
  })[0] || null;
}

async function fetchAssetDataUrl(assetUrl: string | null, origin: string): Promise<string | null> {
  const normalized = getString(assetUrl);
  if (!normalized) return null;
  if (normalized.startsWith("data:")) return normalized;

  const targetUrl = normalized.startsWith("/") ? new URL(normalized, origin).toString() : normalized;
  const response = await fetch(targetUrl, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
}

async function resolveApprovedEducationPackage(args: {
  tenantId: string;
  templateId: string | null;
  templateVersionId: string | null;
  formCode: string | null;
  procedure: string | null;
  specialty: string | null;
}): Promise<LinkedEducationPackagePayload | null> {
  const prisma = getPrisma();
  const criticalCareRequested = [args.formCode, args.procedure, args.specialty]
    .filter((value): value is string => Boolean(value))
    .some((value) => isCriticalCareLookup(value));

  try {
    const packages = await prisma.procedureEducation.findMany({
      where: {
        tenantId: args.tenantId,
        status: "APPROVED",
        currentVersionId: { not: null },
      },
      include: {
        currentVersion: true,
        assets: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    let criticalCareCandidate: LinkedEducationPackagePayload | null = null;

    for (const item of packages) {
      const version = item.currentVersion;
      if (!version || version.status !== "APPROVED") continue;

      const packageMetadata = asRecord(item.metadata);
      const versionMetadata = asRecord(version.metadata);
      const linkedTemplateIds = getStringArray(versionMetadata.linkedTemplateIds ?? packageMetadata.linkedTemplateIds);
      const linkedTemplateVersionIds = getStringArray(
        versionMetadata.linkedTemplateVersionIds ?? packageMetadata.linkedTemplateVersionIds,
      );
      const manifest =
        asRecord(versionMetadata.manifestJson)
        || asRecord(versionMetadata.manifest)
        || asRecord(packageMetadata.manifestJson)
        || asRecord(packageMetadata.manifest);
      const packagePayload: LinkedEducationPackagePayload = {
        packageId: item.id,
        packageKey: item.procedureCode,
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        versionId: version.id,
        versionLabel: version.versionLabel,
        contentHash: asNullableString(versionMetadata.contentHash) || asNullableString(packageMetadata.contentHash),
        summary: getLocalizedLine(manifest.educationalSummary) || getLocalizedLine({ ar: item.summaryAr, en: item.summaryEn }),
        assets: item.assets
          .filter((asset) => asset.versionId === version.id)
          .map((asset) => ({
            id: asset.id,
            assetKey: getString(asRecord(asset.metadata).assetKey) || asset.id,
            assetType: asset.assetType,
            title: asset.title,
            locale: asset.language,
            sourceUri: asset.sourceUrl,
            thumbnailUri: asset.thumbnailUrl,
            sortOrder: asset.sortOrder,
          })),
      };

      const exactTemplateMatch =
        (args.templateVersionId && linkedTemplateVersionIds.includes(args.templateVersionId))
        || (args.templateId && linkedTemplateIds.includes(args.templateId));
      if (exactTemplateMatch) {
        return packagePayload;
      }

      if (
        criticalCareRequested
        && !criticalCareCandidate
        && (isCriticalCareLookup(item.procedureCode) || isCriticalCareLookup(item.titleEn) || isCriticalCareLookup(item.titleAr))
      ) {
        criticalCareCandidate = packagePayload;
      }
    }

    if (criticalCareCandidate) {
      return criticalCareCandidate;
    }
  } catch {
    // Continue with legacy-table fallback when procedure_education tables are unavailable.
  }

  const legacyPackages = await prisma.$queryRaw<LegacyEducationPackageRow[]>`
    SELECT
      p.id,
      p.package_key,
      p.title_ar,
      p.title_en,
      p.summary_ar,
      p.summary_en,
      v.id AS version_id,
      v.version_label,
      v.content_hash,
      v.linked_template_ids,
      v.linked_template_version_ids,
      v.manifest_json
    FROM education_packages p
    INNER JOIN education_versions v ON v.id = p.current_version_id
    WHERE p.tenant_id::text = ${args.tenantId}
      AND p.status = 'APPROVED'
      AND v.status = 'APPROVED'
  `;

  let criticalCareCandidate: LinkedEducationPackagePayload | null = null;
  for (const item of legacyPackages) {
    const linkedTemplateIds = getStringArray(item.linked_template_ids);
    const linkedTemplateVersionIds = getStringArray(item.linked_template_version_ids);
    const assets = await prisma.$queryRaw<LegacyEducationAssetRow[]>`
      SELECT
        id,
        asset_key,
        asset_type,
        title,
        locale,
        source_uri,
        thumbnail_uri,
        sort_order
      FROM education_assets
      WHERE tenant_id::text = ${args.tenantId}
        AND education_package_id::text = ${item.id}
        AND version_id::text = ${item.version_id}
      ORDER BY sort_order ASC
    `;

    const manifest = asRecord(item.manifest_json);
    const packagePayload: LinkedEducationPackagePayload = {
      packageId: item.id,
      packageKey: item.package_key,
      titleAr: item.title_ar,
      titleEn: item.title_en,
      versionId: item.version_id,
      versionLabel: item.version_label,
      contentHash: asNullableString(item.content_hash),
      summary: getLocalizedLine(manifest.educationalSummary) || getLocalizedLine({ ar: item.summary_ar, en: item.summary_en }),
      assets: assets.map((asset) => ({
        id: asset.id,
        assetKey: asset.asset_key,
        assetType: asset.asset_type,
        title: asset.title,
        locale: asset.locale,
        sourceUri: asset.source_uri,
        thumbnailUri: asset.thumbnail_uri,
        sortOrder: asset.sort_order,
      })),
    };

    const exactTemplateMatch =
      (args.templateVersionId && linkedTemplateVersionIds.includes(args.templateVersionId))
      || (args.templateId && linkedTemplateIds.includes(args.templateId));
    if (exactTemplateMatch) {
      return packagePayload;
    }

    if (
      criticalCareRequested
      && !criticalCareCandidate
      && (isCriticalCareLookup(item.package_key) || isCriticalCareLookup(item.title_en) || isCriticalCareLookup(item.title_ar))
    ) {
      criticalCareCandidate = packagePayload;
    }
  }

  return criticalCareCandidate;
}

async function resolveApprovedEducationVisualAid(args: {
  tenantId: string;
  origin: string;
  language: EducationVisualLanguage;
  generatedAt: string;
  clinicalTopic: string;
  templateId: string | null;
  templateVersionId: string | null;
  formCode: string | null;
  procedure: string | null;
  specialty: string | null;
}): Promise<ResolvedEducationVisualAid | null> {
  const linkedPackage = await resolveApprovedEducationPackage({
    tenantId: args.tenantId,
    templateId: args.templateId,
    templateVersionId: args.templateVersionId,
    formCode: args.formCode,
    procedure: args.procedure,
    specialty: args.specialty,
  });
  if (!linkedPackage) {
    return null;
  }

  const asset = selectPreferredAsset(linkedPackage.assets, args.language);
  if (!asset) {
    return null;
  }

  const imageUrl = await fetchAssetDataUrl(asset.sourceUri, args.origin);
  if (!imageUrl) {
    return null;
  }

  const thumbnailUrl = (await fetchAssetDataUrl(asset.thumbnailUri, args.origin)) || imageUrl;
  const summaryText = linkedPackage.summary?.en || linkedPackage.summary?.ar || linkedPackage.titleEn || linkedPackage.titleAr;

  return {
    displayed: true,
    displayedTitle: asset.title || linkedPackage.titleEn || linkedPackage.titleAr || "Educational Visual Aid",
    visualType: "Approved Clinical Educational Image",
    visualAssetId: asset.assetKey || asset.id,
    clinicalTopic: args.clinicalTopic,
    language: args.language,
    imageUrl,
    thumbnailUrl,
    promptSummary: summaryText,
    generatedAt: args.generatedAt,
    approvedForEducation: true,
    source: "approved-library",
    disclaimerEn: VISUAL_DISCLAIMER_EN,
    disclaimerAr: VISUAL_DISCLAIMER_AR,
    patientAcknowledged: false,
  };
}

function mergeEducationVisualMetadata(
  metadata: unknown,
  visualAid: ResolvedEducationVisualAid | null,
  context: { clinicalTopic: string; language: EducationVisualLanguage; unavailableReason: string | null },
  timing: { viewedAt: string | null; displayedAt: string | null },
) {
  const root = asRecord(metadata);
  const executionContext = asRecord(root.executionContext);
  const education = asRecord(executionContext.education);
  const fallbackTimestamp = visualAid?.generatedAt || timing.displayedAt || timing.viewedAt || new Date().toISOString();
  const viewedAt = timing.viewedAt || (typeof education.viewedAt === "string" ? education.viewedAt : fallbackTimestamp);
  const displayedAt = timing.displayedAt || (typeof education.displayedAt === "string" ? education.displayedAt : viewedAt);

  return {
    ...root,
    educationVisualAid: visualAid,
    educationDisplayed: true,
    viewedAt,
    displayedAt,
    visualAidDisplayed: Boolean(visualAid),
    visualAidClinicalTopic: visualAid?.clinicalTopic || context.clinicalTopic,
    visualAidGeneratedAt: visualAid?.generatedAt || null,
    visualAidViewedAt: viewedAt,
    visualAidAssetId: visualAid?.visualAssetId || null,
    visualAidTypeEn: visualAid?.visualType || null,
    visualAidTypeAr: visualAid ? "صورة تعليمية سريرية معتمدة" : null,
    visualAidPurposeEn: VISUAL_DISCLAIMER_EN,
    visualAidPurposeAr: VISUAL_DISCLAIMER_AR,
    visualAidDisclaimerEn: VISUAL_DISCLAIMER_EN,
    visualAidDisclaimerAr: VISUAL_DISCLAIMER_AR,
    visualAidApproved: Boolean(visualAid),
    visualAidUrl: visualAid?.imageUrl || null,
    visualAidThumbnailUrl: visualAid?.thumbnailUrl || null,
    educationLanguage: context.language,
    visualAidUnavailableReason: context.unavailableReason,
    executionContext: {
      ...executionContext,
      education: {
        ...education,
        educationDisplayed: true,
        displayedAt,
        viewedAt,
        updatedAt: fallbackTimestamp,
        visualAidDisplayed: Boolean(visualAid),
        visualAidClinicalTopic: visualAid?.clinicalTopic || context.clinicalTopic,
        visualAidUnavailableReason: context.unavailableReason,
        educationVisualAid: {
          ...(visualAid || {}),
          displayed: Boolean(visualAid),
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
    const generatedAt = asNullableString(payload.generatedAt) || new Date().toISOString();
    const clinicalTopic = buildClinicalTopic(payload);

    const consentDocumentId = typeof payload.consentDocumentId === "string" && payload.consentDocumentId.trim()
      ? payload.consentDocumentId.trim()
      : typeof payload.documentId === "string" && payload.documentId.trim()
        ? payload.documentId.trim()
        : null;

    const templateIdFromPayload = typeof payload.templateId === "string" ? payload.templateId : null;
    const templateVersionIdFromPayload = typeof payload.templateVersionId === "string" ? payload.templateVersionId : null;
    const formCodeFromPayload = typeof payload.formCode === "string" ? payload.formCode : null;
    const procedureFromPayload = typeof payload.procedure === "string" ? payload.procedure : null;
    const specialtyFromPayload = typeof payload.specialty === "string" ? payload.specialty : null;
    const visualAid = await resolveApprovedEducationVisualAid({
      tenantId: auth.tenant_id,
      origin: request.nextUrl.origin,
      language,
      generatedAt,
      clinicalTopic,
      templateId: templateIdFromPayload,
      templateVersionId: templateVersionIdFromPayload,
      formCode: formCodeFromPayload,
      procedure: procedureFromPayload,
      specialty: specialtyFromPayload,
    });
    const unavailableReason = visualAid
      ? null
      : "Educational visual is not available for this approved education package.";

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
            clinicalTopic,
            language,
            unavailableReason,
          }, {
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
          summary: visualAid
            ? `Approved education visual resolved (${doc.template.templateCode || "INFORMED_CONSENT"}, ${language}).`
            : `Approved education visual unavailable (${doc.template.templateCode || "INFORMED_CONSENT"}, ${language}).`,
          metadata: {
            templateCode: doc.template.templateCode || "INFORMED_CONSENT",
            language,
            educationStepNumber: 5,
            educationStepNameEn: "Patient Education & Visual Understanding",
            educationStepNameAr: "التثقيف وفهم الإجراء بصرياً",
            educationDisplayed: true,
            visualAidDisplayed: Boolean(visualAid),
            visualAidTypeEn: visualAid?.visualType || null,
            visualAidTypeAr: visualAid ? "صورة تعليمية سريرية معتمدة" : null,
            visualAidClinicalTopic: visualAid?.clinicalTopic || clinicalTopic,
            visualAidGeneratedAt: visualAid?.generatedAt || null,
            visualAidViewedAt: viewedAt || displayedAt || generatedAt,
            visualAidAssetId: visualAid?.visualAssetId || null,
            visualAidSourceEn: visualAid ? "Approved education library" : null,
            visualAidSourceAr: visualAid ? "مكتبة التثقيف المعتمدة" : null,
            visualAidDisclaimerEn: visualAid?.disclaimerEn || VISUAL_DISCLAIMER_EN,
            visualAidDisclaimerAr: visualAid?.disclaimerAr || VISUAL_DISCLAIMER_AR,
            visualAidUrl: visualAid?.imageUrl || null,
            visualAidThumbnailUrl: visualAid?.thumbnailUrl || null,
            visualAidApproved: visualAid?.approvedForEducation || false,
            visualAidUnavailableReason: unavailableReason,
            displayedAt: displayedAt || generatedAt,
            viewedAt: viewedAt || displayedAt || generatedAt,
            educationLanguage: language,
            educationVisualAid: visualAid,
          },
        },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        visual: visualAid,
        unavailableReason,
      },
      { headers: { "Content-Type": "application/json; charset=utf-8" } },
    );
  } catch (error) {
    return handleApiError(error);
  }
}