/**
 * IMC Form Verification
 *
 * Validates that every approved IMC form in the generated library is represented
 * exactly once in the seed plan, and reports failures, misses, and duplicates.
 */

import {
  imcApprovedConsentLibraryGenerated,
  type ImcApprovedConsentLibraryItem,
} from "@/components/informed-consents/enterprise-workflow/imcApprovedConsentLibrary.generated";
import { buildImcSeedPlan } from "../migration/seed-from-imc";

export interface ImcFormVerificationResult {
  totalImcForms: number;
  imported: Array<{ imcId: string; formId: string; titleEn: string }>;
  failed: Array<{ imcId: string; reason: string }>;
  missing: Array<{ imcId: string; titleEn: string }>;
  duplicates: Array<{ imcId: string; formIds: string[] }>;
  warnings: string[];
  success: boolean;
}

export function verifyImcForms(tenantId: string): ImcFormVerificationResult {
  const plan = buildImcSeedPlan({ tenantId });

  const imported: Array<{ imcId: string; formId: string; titleEn: string }> = [];
  const failed: Array<{ imcId: string; reason: string }> = [];
  const missing: Array<{ imcId: string; titleEn: string }> = [];
  const duplicates: Array<{ imcId: string; formIds: string[] }> = [];

  // Map IMC id -> form ids in seed plan
  const formIdsByImcId = new Map<string, string[]>();
  for (const entry of plan.consentForms) {
    const imcId = entry.sourceId;
    const ids = formIdsByImcId.get(imcId) ?? [];
    ids.push(entry.form.id as string);
    formIdsByImcId.set(imcId, ids);
  }

  for (const imcItem of imcApprovedConsentLibraryGenerated) {
    const ids = formIdsByImcId.get(imcItem.id);
    if (!ids || ids.length === 0) {
      missing.push({ imcId: imcItem.id, titleEn: imcItem.titleEn });
      continue;
    }
    if (ids.length > 1) {
      duplicates.push({ imcId: imcItem.id, formIds: ids });
    }

    // Verify form has required minimum sections
    const entry = plan.consentForms.find((e) => e.sourceId === imcItem.id);
    if (!entry) {
      failed.push({ imcId: imcItem.id, reason: "Form entry not found after mapping" });
      continue;
    }

    const hasHeader = entry.sections.some((s) => s.type === "header");
    const hasAcknowledgment = entry.sections.some((s) => s.type === "acknowledgment");

    if (!hasHeader || !hasAcknowledgment) {
      failed.push({
        imcId: imcItem.id,
        reason: `Missing required sections (header=${hasHeader}, acknowledgment=${hasAcknowledgment})`,
      });
      continue;
    }

    imported.push({
      imcId: imcItem.id,
      formId: entry.form.id as string,
      titleEn: imcItem.titleEn,
    });
  }

  const warnings: string[] = [];
  for (const entry of plan.consentForms) {
    if (!entry.form.titleAr && entry.sourceId) {
      warnings.push(`Form ${entry.sourceId} has no Arabic title`);
    }
  }

  return {
    totalImcForms: imcApprovedConsentLibraryGenerated.length,
    imported,
    failed,
    missing,
    duplicates,
    warnings,
    success: failed.length === 0 && missing.length === 0 && duplicates.length === 0,
  };
}
