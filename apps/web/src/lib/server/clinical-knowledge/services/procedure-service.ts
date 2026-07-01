/**
 * Clinical Procedure & Specialty Catalog Service
 *
 * Tenant-isolated CRUD and search for specialties and procedures.
 */

import { getPrisma } from "@/lib/server/prisma";
import type {
  ClinicalKnowledgeSpecialty,
  ClinicalKnowledgeProcedure,
} from "@/lib/clinical-knowledge/types";

export interface SearchProceduresInput {
  tenantId: string;
  q?: string;
  specialtyId?: string;
  status?: "active" | "inactive" | "draft";
  limit?: number;
  offset?: number;
}

export interface SearchProceduresResult {
  items: ClinicalKnowledgeProcedure[];
  total: number;
}

export interface SearchSpecialtiesInput {
  tenantId: string;
  status?: "active" | "inactive";
  limit?: number;
}

export async function searchProcedures(input: SearchProceduresInput): Promise<SearchProceduresResult> {
  const { tenantId, q, specialtyId, status = "active", limit = 50, offset = 0 } = input;
  const prisma = getPrisma();

  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;
  if (specialtyId) where.specialtyId = specialtyId;
  if (q) {
    where.OR = [
      { nameEn: { contains: q, mode: "insensitive" } },
      { nameAr: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { keywords: { has: q.toLowerCase() } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.clinicalProcedure.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { nameEn: "asc" },
      include: { specialty: { select: { code: true, nameEn: true, nameAr: true } } },
    }),
    prisma.clinicalProcedure.count({ where }),
  ]);

  return {
    items: items.map(mapProcedure),
    total,
  };
}

export async function getProcedureByCode(
  tenantId: string,
  code: string,
): Promise<ClinicalKnowledgeProcedure | null> {
  const prisma = getPrisma();
  const procedure = await prisma.clinicalProcedure.findFirst({
    where: { tenantId, code },
    include: { specialty: { select: { code: true, nameEn: true, nameAr: true } } },
  });
  return procedure ? mapProcedure(procedure) : null;
}

export async function getProcedureById(
  tenantId: string,
  id: string,
): Promise<ClinicalKnowledgeProcedure | null> {
  const prisma = getPrisma();
  const procedure = await prisma.clinicalProcedure.findFirst({
    where: { tenantId, id },
    include: { specialty: { select: { code: true, nameEn: true, nameAr: true } } },
  });
  return procedure ? mapProcedure(procedure) : null;
}

export async function searchSpecialties(input: SearchSpecialtiesInput): Promise<ClinicalKnowledgeSpecialty[]> {
  const { tenantId, status = "active", limit = 100 } = input;
  const prisma = getPrisma();
  const items = await prisma.clinicalSpecialty.findMany({
    where: { tenantId, status },
    take: limit,
    orderBy: { nameEn: "asc" },
  });
  return items.map(mapSpecialty);
}

export async function getSpecialtyByCode(
  tenantId: string,
  code: string,
): Promise<ClinicalKnowledgeSpecialty | null> {
  const prisma = getPrisma();
  const item = await prisma.clinicalSpecialty.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  return item ? mapSpecialty(item) : null;
}

function mapSpecialty(item: {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ClinicalKnowledgeSpecialty {
  return {
    id: item.id,
    tenantId: item.tenantId,
    code: item.code,
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    status: item.status as "active" | "inactive",
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function mapProcedure(item: {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  shortNameEn: string | null;
  shortNameAr: string | null;
  specialtyId: string;
  departmentName: string;
  categoryCode: string;
  typicalDurationMinutes: number | null;
  anesthesiaRequired: boolean;
  keywords: string[];
  externalMappings: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): ClinicalKnowledgeProcedure {
  return {
    id: item.id,
    tenantId: item.tenantId,
    code: item.code,
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    shortNameEn: item.shortNameEn,
    shortNameAr: item.shortNameAr,
    specialtyId: item.specialtyId,
    departmentName: item.departmentName,
    categoryCode: item.categoryCode,
    typicalDurationMinutes: item.typicalDurationMinutes,
    anesthesiaRequired: item.anesthesiaRequired,
    keywords: item.keywords,
    externalMappings: item.externalMappings as Record<string, unknown> | null,
    status: item.status as "draft" | "active" | "inactive",
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
