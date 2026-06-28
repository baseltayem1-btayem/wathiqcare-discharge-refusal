/**
 * Clinical Knowledge Package Service
 *
 * Manages versioned knowledge packages and their polymorphic items.
 */

import { getPrisma } from "@/lib/server/prisma";
import type {
  ClinicalKnowledgePackage,
  ClinicalKnowledgePackageItem,
  ClinicalKnowledgeStatus,
} from "@/lib/clinical-knowledge/types";

export interface EffectivePackageInput {
  tenantId: string;
  procedureCode: string;
  asOf?: Date;
}

export interface EffectivePackageResult {
  found: boolean;
  package?: ClinicalKnowledgePackage & { items: ClinicalKnowledgePackageItem[] };
  fallbackReason?: string;
}

export async function getEffectivePackageForProcedure(
  input: EffectivePackageInput,
): Promise<EffectivePackageResult> {
  const { tenantId, procedureCode, asOf = new Date() } = input;
  const prisma = getPrisma();

  const procedure = await prisma.clinicalProcedure.findFirst({
    where: { tenantId, code: procedureCode },
  });

  if (!procedure) {
    return { found: false, fallbackReason: "PROCEDURE_NOT_FOUND" };
  }

  const pkg = await prisma.clinicalKnowledgePackage.findFirst({
    where: {
      tenantId,
      procedureId: procedure.id,
      status: "PUBLISHED",
      effectiveDate: { lte: asOf },
      OR: [{ expiryDate: null }, { expiryDate: { gte: asOf } }],
    },
    orderBy: { effectiveDate: "desc" },
    include: { items: true },
  });

  if (!pkg) {
    return { found: false, fallbackReason: "NO_PUBLISHED_PACKAGE" };
  }

  return {
    found: true,
    package: mapPackageWithItems(pkg),
  };
}

export async function getPackageById(
  tenantId: string,
  id: string,
): Promise<(ClinicalKnowledgePackage & { items: ClinicalKnowledgePackageItem[] }) | null> {
  const prisma = getPrisma();
  const pkg = await prisma.clinicalKnowledgePackage.findFirst({
    where: { tenantId, id },
    include: { items: true },
  });
  return pkg ? mapPackageWithItems(pkg) : null;
}

export async function publishPackage(
  tenantId: string,
  packageId: string,
  actorUserId: string,
  actorRole = "clinical-governance",
): Promise<ClinicalKnowledgePackage> {
  const prisma = getPrisma();

  const updated = await prisma.clinicalKnowledgePackage.update({
    where: { id: packageId },
    data: {
      status: "PUBLISHED" as ClinicalKnowledgeStatus,
      publishedByUserId: actorUserId,
    },
  });

  await prisma.governanceEvent.create({
    data: {
      tenantId,
      entityType: "PACKAGE",
      entityId: packageId,
      eventType: "PUBLISHED",
      actorUserId,
      actorRole,
      comment: "Package published via API.",
      eventHash: `${tenantId}:PACKAGE:${packageId}:PUBLISHED:${Date.now()}:${actorUserId}`,
    },
  });

  return mapPackage(updated);
}

function mapPackageWithItems(item: {
  id: string;
  tenantId: string;
  procedureId: string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  effectiveDate: Date;
  expiryDate: Date | null;
  status: string;
  governanceSnapshot: unknown;
  requiredParticipantsSnapshot: unknown;
  packageSnapshot: unknown;
  supersededByPackageId: string | null;
  createdByUserId: string;
  publishedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    tenantId: string;
    packageId: string;
    itemType: string;
    itemId: string;
    orderIndex: number;
    isRequired: boolean;
    packageOverrides: unknown;
  }>;
}): ClinicalKnowledgePackage & { items: ClinicalKnowledgePackageItem[] } {
  return {
    ...mapPackage(item),
    items: item.items.map((i) => ({
      id: i.id,
      tenantId: i.tenantId,
      packageId: i.packageId,
      itemType: i.itemType as ClinicalKnowledgePackageItem["itemType"],
      itemId: i.itemId,
      orderIndex: i.orderIndex,
      isRequired: i.isRequired,
      packageOverrides: i.packageOverrides as Record<string, unknown> | null,
    })),
  };
}

function mapPackage(item: {
  id: string;
  tenantId: string;
  procedureId: string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  effectiveDate: Date;
  expiryDate: Date | null;
  status: string;
  governanceSnapshot: unknown;
  requiredParticipantsSnapshot: unknown;
  packageSnapshot: unknown;
  supersededByPackageId: string | null;
  createdByUserId: string;
  publishedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClinicalKnowledgePackage {
  return {
    id: item.id,
    tenantId: item.tenantId,
    procedureId: item.procedureId,
    version: item.version,
    versionMajor: item.versionMajor,
    versionMinor: item.versionMinor,
    versionPatch: item.versionPatch,
    effectiveDate: item.effectiveDate.toISOString(),
    expiryDate: item.expiryDate?.toISOString() ?? null,
    status: item.status as ClinicalKnowledgeStatus,
    governanceSnapshot: item.governanceSnapshot as Record<string, unknown> | null,
    requiredParticipantsSnapshot: item.requiredParticipantsSnapshot as Record<string, unknown> | null,
    packageSnapshot: item.packageSnapshot as Record<string, unknown> | null,
    supersededByPackageId: item.supersededByPackageId,
    createdByUserId: item.createdByUserId,
    publishedByUserId: item.publishedByUserId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
