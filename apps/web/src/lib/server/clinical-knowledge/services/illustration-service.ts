/**
 * Clinical Knowledge Illustration Service
 *
 * Tenant-isolated retrieval of anatomical / procedural educational
 * illustrations for the Clinical Knowledge Package.
 *
 * IMPORTANT: Patient-facing callers MUST use getApprovedIllustrationsForProcedure
 * which filters by imageReviewStatus = "approved", patientFacing = true,
 * and effective/expiry dates.
 */

import { getPrisma } from "@/lib/server/prisma";
import type {
  ClinicalKnowledgeIllustration,
  ClinicalKnowledgeIllustrationStatus,
} from "@/lib/clinical-knowledge/types";

export async function getApprovedIllustrationsForProcedure(
  tenantId: string,
  procedureId: string,
  asOf: Date = new Date(),
): Promise<ClinicalKnowledgeIllustration[]> {
  const prisma = getPrisma();
  const rows = await prisma.clinicalKnowledgeIllustration.findMany({
    where: {
      tenantId,
      procedureId,
      imageReviewStatus: "approved",
      patientFacing: true,
      effectiveDate: { lte: asOf },
      OR: [{ expiryDate: null }, { expiryDate: { gte: asOf } }],
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapIllustration);
}

export async function getApprovedIllustrationsForProcedureByNames(
  tenantId: string,
  names: string[],
  asOf: Date = new Date(),
): Promise<ClinicalKnowledgeIllustration[]> {
  const prisma = getPrisma();
  const normalizedNames = names.map((n) => n.trim()).filter(Boolean);
  if (normalizedNames.length === 0) return [];

  const rows = await prisma.clinicalKnowledgeIllustration.findMany({
    where: {
      tenantId,
      imageReviewStatus: "approved",
      patientFacing: true,
      AND: [
        {
          effectiveDate: { lte: asOf },
          OR: [{ expiryDate: null }, { expiryDate: { gte: asOf } }],
        },
        {
          OR: [
            { procedureNameEn: { in: normalizedNames, mode: "insensitive" } },
            { procedureNameAr: { in: normalizedNames, mode: "insensitive" } },
            { synonyms: { hasSome: normalizedNames } },
          ],
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapIllustration);
}

export async function getIllustrationsByProcedureId(
  tenantId: string,
  procedureId: string,
): Promise<ClinicalKnowledgeIllustration[]> {
  const prisma = getPrisma();
  const rows = await prisma.clinicalKnowledgeIllustration.findMany({
    where: { tenantId, procedureId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapIllustration);
}

/**
 * Internal review retrieval of illustrations for a procedure.
 *
 * Returns ALL illustrations linked to the procedure (approved, draft, rejected,
 * patient-facing or not). This MUST only be called from authenticated internal
 * review endpoints — never from patient-facing flows.
 */
export async function getInternalReviewIllustrationsForProcedure(
  tenantId: string,
  procedureId: string,
): Promise<ClinicalKnowledgeIllustration[]> {
  const prisma = getPrisma();
  const rows = await prisma.clinicalKnowledgeIllustration.findMany({
    where: { tenantId, procedureId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapIllustration);
}

/**
 * Internal review retrieval of illustrations by procedure name / aliases.
 *
 * Returns ALL name-matched illustrations regardless of approval or patientFacing
 * status. This MUST only be called from authenticated internal review endpoints.
 */
export async function getInternalReviewIllustrationsForProcedureByNames(
  tenantId: string,
  names: string[],
): Promise<ClinicalKnowledgeIllustration[]> {
  const prisma = getPrisma();
  const normalizedNames = names.map((n) => n.trim()).filter(Boolean);
  if (normalizedNames.length === 0) return [];

  const rows = await prisma.clinicalKnowledgeIllustration.findMany({
    where: {
      tenantId,
      OR: [
        { procedureNameEn: { in: normalizedNames, mode: "insensitive" } },
        { procedureNameAr: { in: normalizedNames, mode: "insensitive" } },
        { synonyms: { hasSome: normalizedNames } },
      ],
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapIllustration);
}

export async function getApprovedIllustrationsForDocument(
  tenantId: string,
  plannedProcedure: string | null | undefined,
  asOf: Date = new Date(),
): Promise<ClinicalKnowledgeIllustration[]> {
  const prisma = getPrisma();
  const normalized = (plannedProcedure || "").trim();
  if (!normalized) return [];

  // Try to resolve a ClinicalProcedure by code or name (EN/AR). If found,
  // return approved illustrations linked to that procedure. This keeps the
  // lookup deterministic without requiring a foreign key on ConsentDocument.
  const procedures = await prisma.clinicalProcedure.findMany({
    where: {
      tenantId,
      OR: [
        { code: { equals: normalized, mode: "insensitive" } },
        { nameEn: { equals: normalized, mode: "insensitive" } },
        { nameAr: { equals: normalized, mode: "insensitive" } },
        { shortNameEn: { equals: normalized, mode: "insensitive" } },
        { shortNameAr: { equals: normalized, mode: "insensitive" } },
      ],
    },
    take: 1,
    select: { id: true },
  });

  const procedureId = procedures[0]?.id;
  if (!procedureId) return [];

  return getApprovedIllustrationsForProcedure(tenantId, procedureId, asOf);
}

function mapIllustration(
  row: Record<string, unknown> & {
    id: string;
    tenantId: string;
    procedureId: string;
    procedureNameEn: string;
    procedureNameAr: string;
    specialty: string | null;
    anatomyRegion: string | null;
    synonyms: string[];
    anatomyImageUrl: string | null;
    procedureImageUrl: string | null;
    anatomyPromptEn: string | null;
    anatomyPromptAr: string | null;
    procedurePromptEn: string | null;
    procedurePromptAr: string | null;
    patientDisplayDisclaimerEn: string | null;
    patientDisplayDisclaimerAr: string | null;
    source: string | null;
    version: string | null;
    patientFacing: boolean;
    imageReviewStatus: string;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    effectiveDate: Date;
    expiryDate: Date | null;
    createdByUserId: string;
    createdAt: Date;
    updatedAt: Date;
  },
): ClinicalKnowledgeIllustration {
  return {
    id: row.id,
    tenantId: row.tenantId,
    procedureId: row.procedureId,
    procedureNameEn: row.procedureNameEn,
    procedureNameAr: row.procedureNameAr,
    specialty: row.specialty,
    anatomyRegion: row.anatomyRegion,
    synonyms: row.synonyms,
    anatomyImageUrl: row.anatomyImageUrl,
    procedureImageUrl: row.procedureImageUrl,
    anatomyPromptEn: row.anatomyPromptEn,
    anatomyPromptAr: row.anatomyPromptAr,
    procedurePromptEn: row.procedurePromptEn,
    procedurePromptAr: row.procedurePromptAr,
    patientDisplayDisclaimerEn: row.patientDisplayDisclaimerEn,
    patientDisplayDisclaimerAr: row.patientDisplayDisclaimerAr,
    source: row.source,
    version: row.version,
    patientFacing: row.patientFacing,
    imageReviewStatus: row.imageReviewStatus as ClinicalKnowledgeIllustrationStatus,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    effectiveDate: row.effectiveDate.toISOString(),
    expiryDate: row.expiryDate?.toISOString() ?? null,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
