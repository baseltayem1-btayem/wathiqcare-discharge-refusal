/**
 * Consent Form Service
 *
 * Tenant-isolated retrieval of consent forms and their sections.
 */

import { getPrisma } from "@/lib/server/prisma";
import type { ClinicalKnowledgeConsentForm, ClinicalKnowledgeConsentFormSection } from "@/lib/clinical-knowledge/types";

export async function getConsentFormById(
  tenantId: string,
  id: string,
): Promise<ClinicalKnowledgeConsentForm | null> {
  const prisma = getPrisma();
  const form = await prisma.consentForm.findFirst({
    where: { tenantId, id },
    include: { sections: { orderBy: { orderIndex: "asc" } } },
  });
  return form ? mapForm(form) : null;
}

export async function getConsentFormsByIds(
  tenantId: string,
  ids: string[],
): Promise<ClinicalKnowledgeConsentForm[]> {
  if (!ids.length) return [];
  const prisma = getPrisma();
  const forms = await prisma.consentForm.findMany({
    where: { tenantId, id: { in: ids } },
    include: { sections: { orderBy: { orderIndex: "asc" } } },
    orderBy: { titleEn: "asc" },
  });
  return forms.map(mapForm);
}

function mapForm(item: {
  id: string;
  tenantId: string;
  code: string;
  titleEn: string;
  titleAr: string;
  formType: string;
  riskLevel: string;
  status: string;
  version: string;
  effectiveDate: Date;
  expiryDate: Date | null;
  governanceSnapshot: unknown;
  pdfTemplateUrl: string | null;
  requiresWitness: boolean;
  requiresInterpreter: boolean;
  createdByUserId: string;
  publishedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  sections: Array<{
    id: string;
    tenantId: string;
    formId: string;
    type: string;
    orderIndex: number;
    titleEn: string | null;
    titleAr: string | null;
    contentEn: string | null;
    contentAr: string | null;
    isRequired: boolean;
    isEditableByPhysician: boolean;
  }>;
}): ClinicalKnowledgeConsentForm {
  return {
    id: item.id,
    tenantId: item.tenantId,
    code: item.code,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    formType: item.formType as ClinicalKnowledgeConsentForm["formType"],
    riskLevel: item.riskLevel as ClinicalKnowledgeConsentForm["riskLevel"],
    status: item.status as ClinicalKnowledgeConsentForm["status"],
    version: item.version,
    effectiveDate: item.effectiveDate.toISOString(),
    expiryDate: item.expiryDate?.toISOString() ?? null,
    governanceSnapshot: item.governanceSnapshot as Record<string, unknown> | null,
    pdfTemplateUrl: item.pdfTemplateUrl,
    requiresWitness: item.requiresWitness,
    requiresInterpreter: item.requiresInterpreter,
    createdByUserId: item.createdByUserId,
    publishedByUserId: item.publishedByUserId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    sections: item.sections.map(mapSection),
  };
}

function mapSection(item: {
  id: string;
  tenantId: string;
  formId: string;
  type: string;
  orderIndex: number;
  titleEn: string | null;
  titleAr: string | null;
  contentEn: string | null;
  contentAr: string | null;
  isRequired: boolean;
  isEditableByPhysician: boolean;
}): ClinicalKnowledgeConsentFormSection {
  return {
    id: item.id,
    tenantId: item.tenantId,
    formId: item.formId,
    type: item.type,
    orderIndex: item.orderIndex,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    contentEn: item.contentEn,
    contentAr: item.contentAr,
    isRequired: item.isRequired,
    isEditableByPhysician: item.isEditableByPhysician,
  };
}
