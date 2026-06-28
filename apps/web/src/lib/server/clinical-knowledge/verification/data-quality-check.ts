/**
 * Data Quality Check
 *
 * Detects common content-quality issues in a seeded CKE plan:
 *   duplicate procedures, missing education, missing consent, orphan packages,
 *   unused rules, broken references, version conflicts.
 */

import { buildImcSeedPlan } from "../migration/seed-from-imc";

export interface DataQualityIssue {
  type: string;
  severity: "warning" | "critical";
  message: string;
  entityId?: string;
}

export interface DataQualityResult {
  issues: DataQualityIssue[];
  summary: {
    duplicateProcedures: number;
    missingEducation: number;
    missingConsent: number;
    orphanPackages: number;
    unusedRules: number;
    brokenReferences: number;
    versionConflicts: number;
  };
  success: boolean;
}

export function runDataQualityCheck(tenantId: string): DataQualityResult {
  const plan = buildImcSeedPlan({ tenantId });
  const issues: DataQualityIssue[] = [];

  let duplicateProcedures = 0;
  let missingEducation = 0;
  let missingConsent = 0;
  let orphanPackages = 0;
  let unusedRules = 0;
  let brokenReferences = 0;
  let versionConflicts = 0;

  // Duplicate procedures
  const procedureCodes = new Set<string>();
  for (const procedure of plan.procedures) {
    if (procedureCodes.has(procedure.code)) {
      duplicateProcedures++;
      issues.push({
        type: "DUPLICATE_PROCEDURE",
        severity: "critical",
        message: `Duplicate procedure code ${procedure.code}`,
        entityId: procedure.id,
      });
    }
    procedureCodes.add(procedure.code);
  }

  // Missing consent / education / orphan packages / broken references
  for (const pkg of plan.packages) {
    const procedure = plan.procedures.find((p) => p.code === pkg.sourceId);
    if (!procedure) {
      orphanPackages++;
      issues.push({
        type: "ORPHAN_PACKAGE",
        severity: "critical",
        message: `Package ${pkg.package.id as string} has no matching procedure`,
        entityId: pkg.package.id as string,
      });
      continue;
    }

    const formItems = pkg.items.filter((i) => i.itemType === "CONSENT_FORM");
    if (formItems.length === 0) {
      missingConsent++;
      issues.push({
        type: "MISSING_CONSENT",
        severity: "critical",
        message: `Package ${pkg.package.id as string} has no consent form`,
        entityId: pkg.package.id as string,
      });
    }

    const educationItems = pkg.items.filter((i) => i.itemType === "EDUCATION_MATERIAL");
    if (educationItems.length === 0) {
      missingEducation++;
      issues.push({
        type: "MISSING_EDUCATION",
        severity: "warning",
        message: `Package ${pkg.package.id as string} has no education material`,
        entityId: pkg.package.id as string,
      });
    }

    for (const item of pkg.items) {
      let exists = false;
      if (item.itemType === "CONSENT_FORM") {
        exists = plan.consentForms.some((f) => (f.form.id as string) === item.itemId);
      } else if (item.itemType === "EDUCATION_MATERIAL") {
        exists = plan.educationMaterials.some((e) => e.id === item.itemId);
      } else if (item.itemType === "RISK_DISCLOSURE") {
        exists = plan.riskDisclosures.some((r) => r.id === item.itemId);
      }
      if (!exists) {
        brokenReferences++;
        issues.push({
          type: "BROKEN_REFERENCE",
          severity: "critical",
          message: `Package item ${item.id} references missing ${item.itemType} ${item.itemId}`,
          entityId: item.id,
        });
      }
    }
  }

  // Version conflicts: multiple published packages for same procedure
  const packagesByProcedure = new Map<string, typeof plan.packages>();
  for (const pkg of plan.packages) {
    const list = packagesByProcedure.get(pkg.sourceId) ?? [];
    list.push(pkg);
    packagesByProcedure.set(pkg.sourceId, list);
  }
  for (const [procedureCode, packages] of packagesByProcedure) {
    const publishedVersions = packages.filter((p) => p.package.version === "1.0.0");
    if (publishedVersions.length > 1) {
      versionConflicts++;
      issues.push({
        type: "VERSION_CONFLICT",
        severity: "warning",
        message: `Procedure ${procedureCode} has ${publishedVersions.length} packages with version 1.0.0`,
      });
    }
  }

  // Unused rules: all default rules are tenant-global, so they are considered used
  // if at least one package exists. We flag only when zero packages exist.
  if (plan.packages.length === 0) {
    unusedRules++;
    issues.push({
      type: "UNUSED_RULES",
      severity: "warning",
      message: "Decision rules exist but no packages are seeded",
    });
  }

  const success = !issues.some((i) => i.severity === "critical");

  return {
    issues,
    summary: {
      duplicateProcedures,
      missingEducation,
      missingConsent,
      orphanPackages,
      unusedRules,
      brokenReferences,
      versionConflicts,
    },
    success,
  };
}
