import crypto from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";

type JsonObject = Record<string, unknown>;

type EducationVersion = {
  id: string;
  tenantId: string;
  educationPackageId: string;
  versionLabel: string;
  versionNumber: number;
  status: string;
  contentHash: string | null;
  linkedTemplateIds: unknown;
  linkedTemplateVersionIds: unknown;
  manifestJson: unknown;
  metadata: unknown;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  assets: EducationAsset[];
};

type EducationAsset = {
  id: string;
  tenantId: string;
  educationPackageId: string;
  versionId: string | null;
  assetKey: string;
  assetType: string;
  title: string;
  locale: string;
  sourceUri: string | null;
  thumbnailUri: string | null;
  contentHash: string;
  sortOrder: number;
  metadata: unknown;
};

type EducationPackage = {
  id: string;
  tenantId: string;
  packageKey: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string | null;
  summaryEn: string | null;
  clinicalDomain: string | null;
  procedureCode: string | null;
  status: string;
  currentVersionId: string | null;
  currentVersion: EducationVersion | null;
  versions: EducationVersion[];
  assets: EducationAsset[];
  createdByUserId: string | null;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  metadata: unknown;
};

type EducationEvidencePackage = {
  id: string;
  tenantId: string;
  educationPackageId: string;
  versionId: string;
  consentTemplateId: string | null;
  consentTemplateVersionId: string | null;
  evidenceHash: string;
  packageSummary: string | null;
  metadata: unknown;
};

type EducationModelDelegate<T> = {
  findFirst(args?: unknown): Promise<T | null>;
  findUniqueOrThrow(args: unknown): Promise<T>;
  create(args: { data: unknown }): Promise<T>;
  update(args: { where: unknown; data: unknown }): Promise<T>;
};

type EducationAssetDelegate = {
  createMany(args: { data: unknown[] }): Promise<{ count: number }>;
  findMany(args?: unknown): Promise<EducationAsset[]>;
};

type EducationAuditEventDelegate = {
  create(args: { data: unknown }): Promise<unknown>;
};

type EducationPrismaClient = PrismaClient & {
  educationAuditEvent: EducationAuditEventDelegate;
  educationPackage: EducationModelDelegate<EducationPackage>;
  educationVersion: EducationModelDelegate<EducationVersion>;
  educationAsset: EducationAssetDelegate;
  educationEvidencePackage: EducationModelDelegate<EducationEvidencePackage>;
};

const prisma = (): EducationPrismaClient => getPrisma() as unknown as EducationPrismaClient;

export type EducationAssetInput = {
  assetKey: string;
  assetType: string;
  title: string;
  locale?: string;
  sourceUri?: string | null;
  thumbnailUri?: string | null;
  sortOrder?: number;
  metadata?: JsonObject;
};

export type CreateEducationPackageInput = {
  tenantId: string;
  actorUserId?: string | null;
  packageKey: string;
  titleAr: string;
  titleEn: string;
  summaryAr?: string | null;
  summaryEn?: string | null;
  clinicalDomain?: string | null;
  procedureCode?: string | null;
  versionLabel?: string;
  manifestJson?: JsonObject;
  metadata?: JsonObject;
  placeholderAssets?: EducationAssetInput[];
};

export type ApproveEducationPackageInput = {
  tenantId: string;
  packageId: string;
  actorUserId?: string | null;
  versionId?: string | null;
};

export type CreateEducationPackageVersionInput = {
  tenantId: string;
  packageId: string;
  actorUserId?: string | null;
  versionLabel: string;
  manifestJson?: JsonObject;
  metadata?: JsonObject;
  placeholderAssets?: EducationAssetInput[];
};

export type LinkEducationPackageToConsentTemplateInput = {
  tenantId: string;
  packageId: string;
  actorUserId?: string | null;
  consentTemplateId: string;
  consentTemplateVersionId: string;
  versionId?: string | null;
};

export type RecordEducationAuditEventInput = {
  tenantId: string;
  educationPackageId: string;
  versionId?: string | null;
  action: string;
  actorUserId?: string | null;
  consentTemplateId?: string | null;
  consentTemplateVersionId?: string | null;
  metadata?: JsonObject;
};

export type GenerateEducationEvidencePackageInput = {
  tenantId: string;
  packageId: string;
  actorUserId?: string | null;
  versionId?: string | null;
  consentTemplateId?: string | null;
  consentTemplateVersionId?: string | null;
  metadata?: JsonObject;
};

function asRecord(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(value: unknown): string | null {
  const normalized = getString(value);
  return normalized || null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())));
}

function getOptionalBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    return Object.keys(input)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortJson(input[key]);
        return accumulator;
      }, {});
  }
  return value;
}

function normalizeAssets(assets: EducationAssetInput[]): Array<{
  assetKey: string;
  assetType: string;
  title: string;
  locale: string;
  sourceUri: string | null;
  thumbnailUri: string | null;
  sortOrder: number;
  metadata: JsonObject;
}> {
  return assets.map((asset, index) => {
    const assetKey = getString(asset.assetKey);
    const assetType = getString(asset.assetType).toUpperCase();
    const title = getString(asset.title);

    if (!assetKey || !assetType || !title) {
      throw new ApiError(400, "Each placeholder asset requires assetKey, assetType, and title");
    }

    return {
      assetKey,
      assetType,
      title,
      locale: getString(asset.locale) || "bilingual",
      sourceUri: getOptionalString(asset.sourceUri),
      thumbnailUri: getOptionalString(asset.thumbnailUri),
      sortOrder: Number.isFinite(asset.sortOrder) ? Number(asset.sortOrder) : (index + 1) * 100,
      metadata: asRecord(asset.metadata),
    };
  });
}

export function calculateEducationContentHash(input: {
  packageKey: string;
  titleAr: string;
  titleEn: string;
  summaryAr?: string | null;
  summaryEn?: string | null;
  clinicalDomain?: string | null;
  procedureCode?: string | null;
  versionLabel: string;
  manifestJson?: JsonObject;
  placeholderAssets?: EducationAssetInput[];
}): string {
  const normalizedAssets = normalizeAssets(input.placeholderAssets || []).map((asset) => ({
    assetKey: asset.assetKey,
    assetType: asset.assetType,
    title: asset.title,
    locale: asset.locale,
    sourceUri: asset.sourceUri,
    thumbnailUri: asset.thumbnailUri,
    sortOrder: asset.sortOrder,
    metadata: asset.metadata,
  }));

  const stablePayload = sortJson({
    packageKey: getString(input.packageKey),
    titleAr: getString(input.titleAr),
    titleEn: getString(input.titleEn),
    summaryAr: getOptionalString(input.summaryAr),
    summaryEn: getOptionalString(input.summaryEn),
    clinicalDomain: getOptionalString(input.clinicalDomain),
    procedureCode: getOptionalString(input.procedureCode),
    versionLabel: getString(input.versionLabel),
    manifestJson: asRecord(input.manifestJson),
    placeholderAssets: normalizedAssets,
  });

  return crypto.createHash("sha256").update(JSON.stringify(stablePayload)).digest("hex");
}

export async function recordEducationAuditEvent(input: RecordEducationAuditEventInput) {
  const action = getString(input.action).toUpperCase();
  if (!input.tenantId || !input.educationPackageId || !action) {
    throw new ApiError(400, "tenantId, educationPackageId, and action are required");
  }

  return prisma().educationAuditEvent.create({
    data: {
      tenantId: input.tenantId,
      educationPackageId: input.educationPackageId,
      versionId: getOptionalString(input.versionId),
      action,
      actorUserId: getOptionalString(input.actorUserId),
      consentTemplateId: getOptionalString(input.consentTemplateId),
      consentTemplateVersionId: getOptionalString(input.consentTemplateVersionId),
      metadata: asRecord(input.metadata) as Prisma.InputJsonValue,
    },
  });
}

export async function createEducationPackage(input: CreateEducationPackageInput) {
  const tenantId = getString(input.tenantId);
  const packageKey = getString(input.packageKey);
  const titleAr = getString(input.titleAr);
  const titleEn = getString(input.titleEn);
  const versionLabel = getString(input.versionLabel) || "v1.0";
  const normalizedAssets = normalizeAssets(input.placeholderAssets || []);

  if (!tenantId || !packageKey || !titleAr || !titleEn) {
    throw new ApiError(400, "tenantId, packageKey, titleAr, and titleEn are required");
  }

  const existing = await prisma().educationPackage.findFirst({
    where: { tenantId, packageKey },
    select: { id: true },
  });

  if (existing) {
    throw new ApiError(409, "Education package already exists for this tenant and packageKey");
  }

  const contentHash = calculateEducationContentHash({
    packageKey,
    titleAr,
    titleEn,
    summaryAr: input.summaryAr,
    summaryEn: input.summaryEn,
    clinicalDomain: input.clinicalDomain,
    procedureCode: input.procedureCode,
    versionLabel,
    manifestJson: input.manifestJson,
    placeholderAssets: normalizedAssets,
  });

  return prisma().$transaction(async (rawTx) => {
    const tx = rawTx as unknown as EducationPrismaClient;
    const educationPackage = await tx.educationPackage.create({
      data: {
        tenantId,
        packageKey,
        titleAr,
        titleEn,
        summaryAr: getOptionalString(input.summaryAr),
        summaryEn: getOptionalString(input.summaryEn),
        clinicalDomain: getOptionalString(input.clinicalDomain),
        procedureCode: getOptionalString(input.procedureCode),
        status: "DRAFT",
        createdByUserId: getOptionalString(input.actorUserId),
        metadata: asRecord(input.metadata) as Prisma.InputJsonValue,
      },
    });

    const educationVersion = await tx.educationVersion.create({
      data: {
        tenantId,
        educationPackageId: educationPackage.id,
        versionLabel,
        versionNumber: 1,
        status: "DRAFT",
        contentHash,
        linkedTemplateIds: [] as Prisma.InputJsonValue,
        linkedTemplateVersionIds: [] as Prisma.InputJsonValue,
        manifestJson: asRecord(input.manifestJson) as Prisma.InputJsonValue,
        metadata: {
          placeholderAssetCount: normalizedAssets.length,
        } as Prisma.InputJsonValue,
      },
    });

    if (normalizedAssets.length > 0) {
      await tx.educationAsset.createMany({
        data: normalizedAssets.map((asset) => ({
          tenantId,
          educationPackageId: educationPackage.id,
          versionId: educationVersion.id,
          assetKey: asset.assetKey,
          assetType: asset.assetType,
          title: asset.title,
          locale: asset.locale,
          sourceUri: asset.sourceUri,
          thumbnailUri: asset.thumbnailUri,
          contentHash: crypto.createHash("sha256").update(JSON.stringify(sortJson(asset))).digest("hex"),
          sortOrder: asset.sortOrder,
          metadata: asset.metadata as Prisma.InputJsonValue,
        })),
      });
    }

    await tx.educationPackage.update({
      where: { id: educationPackage.id },
      data: {
        currentVersionId: educationVersion.id,
      },
    });

    await tx.educationAuditEvent.create({
      data: {
        tenantId,
        educationPackageId: educationPackage.id,
        versionId: educationVersion.id,
        action: "CREATED",
        actorUserId: getOptionalString(input.actorUserId),
        metadata: {
          packageKey,
          versionLabel,
          contentHash,
          placeholderAssetCount: normalizedAssets.length,
        } as Prisma.InputJsonValue,
      },
    });

    return tx.educationPackage.findUniqueOrThrow({
      where: { id: educationPackage.id },
      include: {
        currentVersion: true,
        assets: { orderBy: { sortOrder: "asc" } },
      },
    });
  });
}

export async function approveEducationPackage(input: ApproveEducationPackageInput) {
  const tenantId = getString(input.tenantId);
  const packageId = getString(input.packageId);
  const versionId = getOptionalString(input.versionId);

  if (!tenantId || !packageId) {
    throw new ApiError(400, "tenantId and packageId are required");
  }

  return prisma().$transaction(async (rawTx) => {
    const tx = rawTx as unknown as EducationPrismaClient;
    const educationPackage = await tx.educationPackage.findFirst({
      where: { id: packageId, tenantId },
      include: {
        currentVersion: true,
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        assets: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!educationPackage) {
      throw new ApiError(404, "Education package not found");
    }

    const targetVersion = versionId
      ? await tx.educationVersion.findFirst({ where: { id: versionId, educationPackageId: packageId, tenantId } })
      : educationPackage.currentVersion || educationPackage.versions[0] || null;

    if (!targetVersion) {
      throw new ApiError(404, "Education version not found for approval");
    }

    const contentHash = targetVersion.contentHash || calculateEducationContentHash({
      packageKey: educationPackage.packageKey,
      titleAr: educationPackage.titleAr,
      titleEn: educationPackage.titleEn,
      summaryAr: educationPackage.summaryAr,
      summaryEn: educationPackage.summaryEn,
      clinicalDomain: educationPackage.clinicalDomain,
      procedureCode: educationPackage.procedureCode,
      versionLabel: targetVersion.versionLabel,
      manifestJson: asRecord(targetVersion.manifestJson),
      placeholderAssets: educationPackage.assets.map((asset) => ({
        assetKey: asset.assetKey,
        assetType: asset.assetType,
        title: asset.title,
        locale: asset.locale,
        sourceUri: asset.sourceUri,
        thumbnailUri: asset.thumbnailUri,
        sortOrder: asset.sortOrder,
        metadata: asRecord(asset.metadata),
      })),
    });

    const approvedAt = new Date();

    await tx.educationVersion.update({
      where: { id: targetVersion.id },
      data: {
        status: "APPROVED",
        approvedByUserId: getOptionalString(input.actorUserId),
        approvedAt,
        contentHash,
      },
    });

    await tx.educationPackage.update({
      where: { id: educationPackage.id },
      data: {
        status: "APPROVED",
        currentVersionId: targetVersion.id,
        approvedByUserId: getOptionalString(input.actorUserId),
        approvedAt,
      },
    });

    await tx.educationAuditEvent.create({
      data: {
        tenantId,
        educationPackageId: educationPackage.id,
        versionId: targetVersion.id,
        action: "APPROVED",
        actorUserId: getOptionalString(input.actorUserId),
        metadata: {
          versionLabel: targetVersion.versionLabel,
          contentHash,
        } as Prisma.InputJsonValue,
      },
    });

    return tx.educationPackage.findUniqueOrThrow({
      where: { id: educationPackage.id },
      include: {
        currentVersion: true,
      },
    });
  });
}

export async function createEducationPackageVersion(input: CreateEducationPackageVersionInput) {
  const tenantId = getString(input.tenantId);
  const packageId = getString(input.packageId);
  const versionLabel = getString(input.versionLabel);
  const normalizedAssets = normalizeAssets(input.placeholderAssets || []);

  if (!tenantId || !packageId || !versionLabel) {
    throw new ApiError(400, "tenantId, packageId, and versionLabel are required");
  }

  return prisma().$transaction(async (rawTx) => {
    const tx = rawTx as unknown as EducationPrismaClient;
    const educationPackage = await tx.educationPackage.findFirst({
      where: { id: packageId, tenantId },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!educationPackage) {
      throw new ApiError(404, "Education package not found");
    }

    const duplicate = await tx.educationVersion.findFirst({
      where: {
        tenantId,
        educationPackageId: packageId,
        versionLabel,
      },
      include: {
        assets: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (duplicate) {
      return duplicate;
    }

    const nextVersionNumber = (educationPackage.versions[0]?.versionNumber || 0) + 1;
    const contentHash = calculateEducationContentHash({
      packageKey: educationPackage.packageKey,
      titleAr: educationPackage.titleAr,
      titleEn: educationPackage.titleEn,
      summaryAr: educationPackage.summaryAr,
      summaryEn: educationPackage.summaryEn,
      clinicalDomain: educationPackage.clinicalDomain,
      procedureCode: educationPackage.procedureCode,
      versionLabel,
      manifestJson: input.manifestJson,
      placeholderAssets: normalizedAssets,
    });

    const version = await tx.educationVersion.create({
      data: {
        tenantId,
        educationPackageId: packageId,
        versionLabel,
        versionNumber: nextVersionNumber,
        status: "DRAFT",
        contentHash,
        linkedTemplateIds: [] as Prisma.InputJsonValue,
        linkedTemplateVersionIds: [] as Prisma.InputJsonValue,
        manifestJson: asRecord(input.manifestJson) as Prisma.InputJsonValue,
        metadata: {
          placeholderAssetCount: normalizedAssets.length,
          ...asRecord(input.metadata),
        } as Prisma.InputJsonValue,
      },
    });

    if (normalizedAssets.length > 0) {
      await tx.educationAsset.createMany({
        data: normalizedAssets.map((asset) => ({
          tenantId,
          educationPackageId: packageId,
          versionId: version.id,
          assetKey: asset.assetKey,
          assetType: asset.assetType,
          title: asset.title,
          locale: asset.locale,
          sourceUri: asset.sourceUri,
          thumbnailUri: asset.thumbnailUri,
          contentHash: crypto.createHash("sha256").update(JSON.stringify(sortJson(asset))).digest("hex"),
          sortOrder: asset.sortOrder,
          metadata: asset.metadata as Prisma.InputJsonValue,
        })),
      });
    }

    await tx.educationAuditEvent.create({
      data: {
        tenantId,
        educationPackageId: packageId,
        versionId: version.id,
        action: "VERSION_CREATED",
        actorUserId: getOptionalString(input.actorUserId),
        metadata: {
          versionLabel,
          versionNumber: nextVersionNumber,
          contentHash,
          placeholderAssetCount: normalizedAssets.length,
        } as Prisma.InputJsonValue,
      },
    });

    return tx.educationVersion.findUniqueOrThrow({
      where: { id: version.id },
      include: {
        assets: { orderBy: { sortOrder: "asc" } },
      },
    });
  });
}

export async function linkEducationPackageToConsentTemplate(input: LinkEducationPackageToConsentTemplateInput) {
  const tenantId = getString(input.tenantId);
  const packageId = getString(input.packageId);
  const consentTemplateId = getString(input.consentTemplateId);
  const consentTemplateVersionId = getString(input.consentTemplateVersionId);

  if (!tenantId || !packageId || !consentTemplateId || !consentTemplateVersionId) {
    throw new ApiError(400, "tenantId, packageId, consentTemplateId, and consentTemplateVersionId are required");
  }

  return prisma().$transaction(async (rawTx) => {
    const tx = rawTx as unknown as EducationPrismaClient;
    const templateVersion = await tx.consentTemplateVersion.findFirst({
      where: {
        id: consentTemplateVersionId,
        templateId: consentTemplateId,
        tenantId,
      },
      select: {
        id: true,
        templateId: true,
        versionLabel: true,
      },
    });

    if (!templateVersion) {
      throw new ApiError(404, "Consent template version not found");
    }

    const educationPackage = await tx.educationPackage.findFirst({
      where: { id: packageId, tenantId },
      include: {
        currentVersion: true,
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });

    if (!educationPackage) {
      throw new ApiError(404, "Education package not found");
    }

    const targetVersion = input.versionId
      ? await tx.educationVersion.findFirst({ where: { id: input.versionId, tenantId, educationPackageId: packageId } })
      : educationPackage.currentVersion || educationPackage.versions[0] || null;

    if (!targetVersion) {
      throw new ApiError(404, "Education version not found for template linkage");
    }

    const linkedTemplateIds = getStringArray(targetVersion.linkedTemplateIds);
    const linkedTemplateVersionIds = getStringArray(targetVersion.linkedTemplateVersionIds);
    const nextTemplateIds = Array.from(new Set([...linkedTemplateIds, consentTemplateId]));
    const nextTemplateVersionIds = Array.from(new Set([...linkedTemplateVersionIds, consentTemplateVersionId]));

    const updatedVersion = await tx.educationVersion.update({
      where: { id: targetVersion.id },
      data: {
        linkedTemplateIds: nextTemplateIds as Prisma.InputJsonValue,
        linkedTemplateVersionIds: nextTemplateVersionIds as Prisma.InputJsonValue,
      },
    });

    await tx.educationAuditEvent.create({
      data: {
        tenantId,
        educationPackageId: educationPackage.id,
        versionId: targetVersion.id,
        action: "LINKED_TO_CONSENT_TEMPLATE",
        actorUserId: getOptionalString(input.actorUserId),
        consentTemplateId,
        consentTemplateVersionId,
        metadata: {
          consentTemplateVersionLabel: templateVersion.versionLabel,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      packageId: educationPackage.id,
      versionId: updatedVersion.id,
      linkedTemplateIds: nextTemplateIds,
      linkedTemplateVersionIds: nextTemplateVersionIds,
    };
  });
}

export async function generateEducationEvidencePackage(input: GenerateEducationEvidencePackageInput) {
  const tenantId = getString(input.tenantId);
  const packageId = getString(input.packageId);
  const consentTemplateId = getOptionalString(input.consentTemplateId);
  const consentTemplateVersionId = getOptionalString(input.consentTemplateVersionId);
  const versionId = getOptionalString(input.versionId);

  if (!tenantId || !packageId) {
    throw new ApiError(400, "tenantId and packageId are required");
  }

  return prisma().$transaction(async (rawTx) => {
    const tx = rawTx as unknown as EducationPrismaClient;
    const educationPackage = await tx.educationPackage.findFirst({
      where: { id: packageId, tenantId },
      include: {
        currentVersion: true,
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });

    if (!educationPackage) {
      throw new ApiError(404, "Education package not found");
    }

    const targetVersion = versionId
      ? await tx.educationVersion.findFirst({ where: { id: versionId, tenantId, educationPackageId: packageId } })
      : educationPackage.currentVersion || educationPackage.versions[0] || null;

    if (!targetVersion) {
      throw new ApiError(404, "Education version not found for evidence generation");
    }

    const assets = await tx.educationAsset.findMany({
      where: {
        tenantId,
        educationPackageId: packageId,
        versionId: targetVersion.id,
      },
      orderBy: { sortOrder: "asc" },
    });

    const assetEvidence = assets.map((asset) => {
      const metadata = asRecord(asset.metadata);
      const attributionText = getOptionalString(metadata.attributionText) || getOptionalString(metadata.attribution);
      return {
        assetId: asset.id,
        assetKey: asset.assetKey,
        assetType: asset.assetType,
        title: asset.title,
        locale: asset.locale,
        sortOrder: asset.sortOrder,
        contentHash: asset.contentHash,
        sourceUri: asset.sourceUri,
        thumbnailUri: asset.thumbnailUri,
        assetCategory: getOptionalString(metadata.assetCategory),
        sourceName: getOptionalString(metadata.sourceName),
        sourceUrl: getOptionalString(metadata.sourceUrl),
        licenseType: getOptionalString(metadata.licenseType),
        attribution: attributionText,
        attributionText,
        assetHash: getOptionalString(metadata.assetHash),
        copyrightStatus: getOptionalString(metadata.copyrightStatus),
        reviewedAt: getOptionalString(metadata.reviewedAt),
        isApproved: getOptionalBoolean(metadata.isApproved),
      };
    });

    const evidencePayload = sortJson({
      packageId: educationPackage.id,
      packageKey: educationPackage.packageKey,
      versionId: targetVersion.id,
      versionLabel: targetVersion.versionLabel,
      contentHash: targetVersion.contentHash,
      consentTemplateId,
      consentTemplateVersionId,
      summaryAr: educationPackage.summaryAr,
      summaryEn: educationPackage.summaryEn,
      manifestJson: asRecord(targetVersion.manifestJson),
      assets: assetEvidence,
      metadata: asRecord(input.metadata),
    });

    const evidenceHash = crypto.createHash("sha256").update(JSON.stringify(evidencePayload)).digest("hex");

    const existing = await tx.educationEvidencePackage.findFirst({
      where: {
        tenantId,
        educationPackageId: packageId,
        versionId: targetVersion.id,
        consentTemplateVersionId: consentTemplateVersionId || undefined,
      },
    });

    const evidencePackage = existing
      ? await tx.educationEvidencePackage.update({
          where: { id: existing.id },
          data: {
            consentTemplateId,
            consentTemplateVersionId,
            evidenceHash,
            packageSummary: educationPackage.summaryEn || educationPackage.summaryAr,
            metadata: {
              regenerated: true,
              assetCount: assets.length,
              assets: assetEvidence,
              ...asRecord(input.metadata),
            } as Prisma.InputJsonValue,
          },
        })
      : await tx.educationEvidencePackage.create({
          data: {
            tenantId,
            educationPackageId: packageId,
            versionId: targetVersion.id,
            consentTemplateId,
            consentTemplateVersionId,
            evidenceHash,
            packageSummary: educationPackage.summaryEn || educationPackage.summaryAr,
            metadata: {
              assetCount: assets.length,
              assets: assetEvidence,
              ...asRecord(input.metadata),
            } as Prisma.InputJsonValue,
          },
        });

    await tx.educationAuditEvent.create({
      data: {
        tenantId,
        educationPackageId: packageId,
        versionId: targetVersion.id,
        action: "EVIDENCE_PACKAGE_GENERATED",
        actorUserId: getOptionalString(input.actorUserId),
        consentTemplateId,
        consentTemplateVersionId,
        metadata: {
          evidencePackageId: evidencePackage.id,
          evidenceHash,
          assetCount: assets.length,
          assetIds: assetEvidence.map((asset) => asset.assetId),
          assetHashes: assetEvidence.map((asset) => asset.contentHash),
        } as Prisma.InputJsonValue,
      },
    });

    return evidencePackage;
  });
}