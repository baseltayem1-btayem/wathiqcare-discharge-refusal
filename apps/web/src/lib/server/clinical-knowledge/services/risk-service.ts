/**
 * Risk Disclosure Service
 *
 * Tenant-isolated retrieval of governed risk disclosures.
 */

import { getPrisma } from "@/lib/server/prisma";
import type { ClinicalKnowledgeRiskDisclosure } from "@/lib/clinical-knowledge/types";

export interface SearchRisksInput {
  tenantId: string;
  specialtyId?: string;
  riskLevel?: ClinicalKnowledgeRiskDisclosure["riskLevel"];
  status?: ClinicalKnowledgeRiskDisclosure["status"];
  limit?: number;
  offset?: number;
}

export interface SearchRisksResult {
  items: ClinicalKnowledgeRiskDisclosure[];
  total: number;
}

export async function searchRisks(input: SearchRisksInput): Promise<SearchRisksResult> {
  const { tenantId, specialtyId, riskLevel, status = "PUBLISHED", limit = 100, offset = 0 } = input;
  const prisma = getPrisma();

  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;
  if (riskLevel) where.riskLevel = riskLevel;
  if (specialtyId) where.specialtyIds = { has: specialtyId };

  const [items, total] = await Promise.all([
    prisma.riskDisclosure.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { titleEn: "asc" },
    }),
    prisma.riskDisclosure.count({ where }),
  ]);

  return {
    items: items.map(mapRiskDisclosure),
    total,
  };
}

export async function getRiskDisclosureById(
  tenantId: string,
  id: string,
): Promise<ClinicalKnowledgeRiskDisclosure | null> {
  const prisma = getPrisma();
  const item = await prisma.riskDisclosure.findFirst({
    where: { tenantId, id },
  });
  return item ? mapRiskDisclosure(item) : null;
}

export async function getRiskDisclosuresByIds(
  tenantId: string,
  ids: string[],
): Promise<ClinicalKnowledgeRiskDisclosure[]> {
  if (!ids.length) return [];
  const prisma = getPrisma();
  const items = await prisma.riskDisclosure.findMany({
    where: { tenantId, id: { in: ids } },
    orderBy: { titleEn: "asc" },
  });
  return items.map(mapRiskDisclosure);
}

function mapRiskDisclosure(item: {
  id: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  riskLevel: string;
  incidenceRate: string | null;
  specialtyIds: string[];
  status: string;
  version: string;
  effectiveDate: Date;
  expiryDate: Date | null;
  governanceSnapshot: unknown;
  createdByUserId: string;
  publishedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClinicalKnowledgeRiskDisclosure {
  return {
    id: item.id,
    tenantId: item.tenantId,
    code: item.code,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    riskLevel: item.riskLevel as ClinicalKnowledgeRiskDisclosure["riskLevel"],
    incidenceRate: item.incidenceRate,
    specialtyIds: item.specialtyIds,
    status: item.status as ClinicalKnowledgeRiskDisclosure["status"],
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
