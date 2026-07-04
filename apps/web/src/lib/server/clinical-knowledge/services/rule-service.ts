/**
 * Decision Rule Service
 *
 * Tenant-isolated retrieval and evaluation of clinical decision rules.
 */

import { getPrisma } from "@/lib/server/prisma";
import type { ClinicalKnowledgeDecisionRule, ClinicalSuggestion, ConsentBlocker } from "@/lib/clinical-knowledge/types";

export interface RuleEvaluationContext {
  anesthesiaRequired?: boolean;
  riskLevel?: string;
  specialty?: string;
  patientCapacityStatus?: "competent" | "minor" | "incapacitated" | "guardian-required";
  patientLanguagePreference?: string;
}

export interface RuleEvaluationResult {
  suggestions: ClinicalSuggestion[];
  blockers: ConsentBlocker[];
  requiredParticipants: ("witness" | "interpreter" | "guardian")[];
}

export async function getActiveRules(tenantId: string): Promise<ClinicalKnowledgeDecisionRule[]> {
  const prisma = getPrisma();
  const now = new Date();
  const items = await prisma.decisionRule.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      effectiveDate: { lte: now },
      OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
    },
    orderBy: { priority: "desc" },
  });
  return items.map(mapDecisionRule);
}

export async function getDecisionRuleById(
  tenantId: string,
  id: string,
): Promise<ClinicalKnowledgeDecisionRule | null> {
  const prisma = getPrisma();
  const item = await prisma.decisionRule.findFirst({
    where: { tenantId, id },
  });
  return item ? mapDecisionRule(item) : null;
}

export function evaluateRulesWithContext(
  rules: ClinicalKnowledgeDecisionRule[],
  context: RuleEvaluationContext,
): RuleEvaluationResult {
  const suggestions: ClinicalSuggestion[] = [];
  const blockers: ConsentBlocker[] = [];
  const requiredParticipants = new Set<"witness" | "interpreter" | "guardian">();

  for (const rule of rules) {
    if (!ruleMatches(rule, context)) continue;

    const action = rule.action as {
      requireWitness?: boolean;
      requireInterpreter?: boolean;
      requireGuardian?: boolean;
      educationRecommended?: boolean;
      suggestRiskIds?: string[];
      suggestAlternativeIds?: string[];
    };

    if (action.requireWitness) {
      requiredParticipants.add("witness");
      suggestions.push({
        id: `${rule.id}-witness`,
        type: "witness-required",
        severity: "warning",
        messageEn: "A witness is required for this procedure.",
        messageAr: "مطلوب شاهد لهذا الإجراء.",
        source: "clinical-content-engine",
        suggestedContentIds: [],
      });
    }

    if (action.requireInterpreter) {
      requiredParticipants.add("interpreter");
      suggestions.push({
        id: `${rule.id}-interpreter`,
        type: "interpreter-required",
        severity: "warning",
        messageEn: "An interpreter may be required based on patient language preference.",
        messageAr: "قد يكون المترجم مطلوبًا بناءً على تفضيل لغة المريض.",
        source: "clinical-content-engine",
        suggestedContentIds: [],
      });
    }

    if (action.requireGuardian) {
      requiredParticipants.add("guardian");
      blockers.push({
        key: `${rule.id}-guardian`,
        messageEn: "A guardian is required for this patient.",
        messageAr: "مطلوب ولي أمر لهذا المريض.",
        severity: "blocking",
      });
    }

    if (action.educationRecommended) {
      suggestions.push({
        id: `${rule.id}-education`,
        type: "education-recommended",
        severity: "info",
        messageEn: "Patient education is recommended for this procedure.",
        messageAr: "يُوصى بتثقيف المريض لهذا الإجراء.",
        source: "clinical-content-engine",
        suggestedContentIds: action.suggestRiskIds ?? [],
      });
    }
  }

  return {
    suggestions,
    blockers,
    requiredParticipants: Array.from(requiredParticipants),
  };
}

export async function evaluateRules(
  tenantId: string,
  context: RuleEvaluationContext,
): Promise<RuleEvaluationResult> {
  const rules = await getActiveRules(tenantId);
  return evaluateRulesWithContext(rules, context);
}

function ruleMatches(rule: ClinicalKnowledgeDecisionRule, context: RuleEvaluationContext): boolean {
  const condition = rule.condition as {
    anesthesiaRequired?: boolean;
    riskLevel?: string;
    specialty?: string;
    patientCapacityStatus?: string;
    patientLanguagePreference?: string;
  };

  if (condition.anesthesiaRequired !== undefined && condition.anesthesiaRequired !== context.anesthesiaRequired) {
    return false;
  }
  if (condition.riskLevel && condition.riskLevel !== context.riskLevel) {
    return false;
  }
  if (condition.specialty && condition.specialty !== context.specialty) {
    return false;
  }
  if (condition.patientCapacityStatus && condition.patientCapacityStatus !== context.patientCapacityStatus) {
    return false;
  }
  if (
    condition.patientLanguagePreference &&
    condition.patientLanguagePreference !== context.patientLanguagePreference
  ) {
    return false;
  }
  return true;
}

function mapDecisionRule(item: {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  description: string | null;
  priority: number;
  condition: unknown;
  action: unknown;
  status: string;
  effectiveDate: Date;
  expiryDate: Date | null;
  createdByUserId: string;
  approvedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClinicalKnowledgeDecisionRule {
  return {
    id: item.id,
    tenantId: item.tenantId,
    code: item.code,
    nameEn: item.nameEn,
    nameAr: item.nameAr,
    description: item.description,
    priority: item.priority,
    condition: item.condition as Record<string, unknown>,
    action: item.action as Record<string, unknown>,
    status: item.status as ClinicalKnowledgeDecisionRule["status"],
    effectiveDate: item.effectiveDate.toISOString(),
    expiryDate: item.expiryDate?.toISOString() ?? null,
    createdByUserId: item.createdByUserId,
    approvedByUserId: item.approvedByUserId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}
