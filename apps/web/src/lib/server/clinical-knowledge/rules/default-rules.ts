/**
 * Default Clinical Decision Rules for the CKE MVP.
 *
 * These rules are additive and can be customized per tenant. They are evaluated
 * at assembly time to produce suggestions and blockers.
 */

import type { Prisma } from "@prisma/client";

type InputJsonValue = Prisma.InputJsonValue;

export interface DefaultRuleSeed {
  code: string;
  nameEn: string;
  nameAr: string;
  description: string;
  priority: number;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
}

export const defaultDecisionRules: DefaultRuleSeed[] = [
  {
    code: "RULE_GUARDIAN_REQUIRED_BLOCK",
    nameEn: "Guardian-required status must be resolved",
    nameAr: "يجب حل حالة مطلوب ولي أمر",
    description: "The patient record explicitly indicates a guardian is required.",
    priority: 210,
    condition: { patientCapacityStatus: "guardian-required" },
    action: { requireGuardian: true, requireWitness: true },
  },
  {
    code: "RULE_MINOR_GUARDIAN",
    nameEn: "Minor or incapacitated patient requires guardian",
    nameAr: "المريض القاصر أو غير المؤهل يتطلب ولي أمر",
    description: "Patients who are minors or incapacitated require a guardian.",
    priority: 200,
    condition: { patientCapacityStatus: "minor" },
    action: { requireGuardian: true, requireWitness: true },
  },
  {
    code: "RULE_INCAPACITATED_GUARDIAN",
    nameEn: "Incapacitated patient requires guardian",
    nameAr: "المريض غير المؤهل يتطلب ولي أمر",
    description: "Patients deemed incapacitated require a guardian.",
    priority: 190,
    condition: { patientCapacityStatus: "incapacitated" },
    action: { requireGuardian: true, requireWitness: true },
  },
  {
    code: "RULE_ANESTHESIA_WITNESS",
    nameEn: "Anesthesia requires witness",
    nameAr: "التخدير يتطلب شاهدًا",
    description: "Procedures requiring anesthesia must have a witness present.",
    priority: 100,
    condition: { anesthesiaRequired: true },
    action: { requireWitness: true, educationRecommended: true },
  },
  {
    code: "RULE_CRITICAL_RISK_WITNESS",
    nameEn: "Critical-risk procedure requires witness",
    nameAr: "الإجراء الحرج يتطلب شاهدًا",
    description: "Critical-risk procedures must have a witness.",
    priority: 95,
    condition: { riskLevel: "CRITICAL" },
    action: { requireWitness: true, educationRecommended: true },
  },
  {
    code: "RULE_HIGH_RISK_WITNESS",
    nameEn: "High-risk procedure requires witness",
    nameAr: "الإجراء عالي الخطورة يتطلب شاهدًا",
    description: "High-risk or critical procedures should have a witness.",
    priority: 90,
    condition: { riskLevel: "HIGH" },
    action: { requireWitness: true, educationRecommended: true },
  },
  {
    code: "RULE_NON_ARABIC_INTERPRETER",
    nameEn: "Non-Arabic speaker may require interpreter",
    nameAr: "المتحدث غير العربي قد يحتاج مترجمًا",
    description: "Patients who do not prefer Arabic may need an interpreter.",
    priority: 50,
    condition: { patientLanguagePreference: "en" },
    action: { requireInterpreter: true },
  },
];

export function buildDefaultRuleCreateInputs(
  tenantId: string,
  createdByUserId: string,
  effectiveDate: Date = new Date("2026-06-01"),
): Prisma.DecisionRuleCreateManyInput[] {
  return defaultDecisionRules.map((rule) => ({
    id: `${tenantId}:${rule.code}`,
    tenantId,
    code: rule.code,
    nameEn: rule.nameEn,
    nameAr: rule.nameAr,
    description: rule.description,
    priority: rule.priority,
    condition: rule.condition as InputJsonValue,
    action: rule.action as InputJsonValue,
    status: "ACTIVE",
    effectiveDate,
    createdByUserId,
  }));
}
