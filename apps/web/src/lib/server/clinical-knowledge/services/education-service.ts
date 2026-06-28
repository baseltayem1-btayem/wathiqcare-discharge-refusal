/**
 * Education Material Service
 *
 * Tenant-isolated retrieval of patient education materials.
 */

import { getPrisma } from "@/lib/server/prisma";
import type { ClinicalKnowledgeEducationMaterial } from "@/lib/clinical-knowledge/types";

export async function getEducationMaterialById(
  tenantId: string,
  id: string,
): Promise<ClinicalKnowledgeEducationMaterial | null> {
  const prisma = getPrisma();
  const item = await prisma.educationMaterial.findFirst({
    where: { tenantId, id },
  });
  return item ? mapEducationMaterial(item) : null;
}

export async function getEducationMaterialsByIds(
  tenantId: string,
  ids: string[],
): Promise<ClinicalKnowledgeEducationMaterial[]> {
  if (!ids.length) return [];
  const prisma = getPrisma();
  const items = await prisma.educationMaterial.findMany({
    where: { tenantId, id: { in: ids } },
    orderBy: { titleEn: "asc" },
  });
  return items.map(mapEducationMaterial);
}

function mapEducationMaterial(item: {
  id: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  assetType: string;
  assetUrl: string;
  durationMinutes: number | null;
  status: string;
  version: string;
  effectiveDate: Date;
  expiryDate: Date | null;
  governanceSnapshot: unknown;
  createdByUserId: string;
  publishedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClinicalKnowledgeEducationMaterial {
  return {
    id: item.id,
    tenantId: item.tenantId,
    code: item.code,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    assetType: item.assetType as ClinicalKnowledgeEducationMaterial["assetType"],
    assetUrl: item.assetUrl,
    durationMinutes: item.durationMinutes,
    status: item.status as ClinicalKnowledgeEducationMaterial["status"],
    version: item.version,
    effectiveDate: item.effectiveDate.toISOString(),
    expiryDate: item.expiryDate?.toISOString() ?? null,
    governanceSnapshot: item.governanceSnapshot as Record<string, unknown> | null,
    createdByUserId: item.createdByUserId,
    publishedByUserId: item.publishedByUserId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
