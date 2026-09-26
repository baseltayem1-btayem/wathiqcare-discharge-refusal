/**
 * Patient Education Engine
 *
 * Provides structured patient education material retrieval and comprehension
 * check evaluation. All results are additive to the production consent flow.
 */

import {
  type EducationMaterial,
  type EducationResult,
} from "@/lib/clinical-content/types";
import { clinicalContentRegistry } from "./registry";

export function findEducationMaterialForProcedure(
  procedureName: string,
): EducationMaterial | undefined {
  const materials = clinicalContentRegistry.listEducationMaterials();
  const normalized = procedureName.trim().toLowerCase();

  return (
    materials.find((m) =>
      m.procedureIds.some((pid) => pid.toLowerCase() === normalized),
    ) ||
    materials.find((m) =>
      m.titleEn.toLowerCase().includes(normalized),
    ) ||
    materials.find((m) =>
      m.procedureIds.some(() => m.titleEn.toLowerCase().includes(normalized)),
    )
  );
}

export interface EvaluateComprehensionInput {
  materialId: string;
  answers: Record<string, string>;
  durationSeconds?: number;
  attempts: number;
}

export function evaluateComprehension(
  input: EvaluateComprehensionInput,
): EducationResult {
  const material = clinicalContentRegistry.getEducationMaterial(input.materialId);
  if (!material) {
    return {
      materialId: input.materialId,
      scorePct: 0,
      passed: false,
      answers: input.answers,
      correctIds: [],
      durationSeconds: input.durationSeconds,
      attempts: input.attempts,
    };
  }

  let correct = 0;
  const correctIds: string[] = [];

  for (const check of material.comprehensionChecks) {
    const given = input.answers[check.id];
    if (given && given === check.correctOptionId) {
      correct += 1;
      correctIds.push(check.id);
    }
  }

  const total = material.comprehensionChecks.length || 1;
  const scorePct = Math.round((correct / total) * 100);
  const passingScore = 80;

  return {
    materialId: input.materialId,
    scorePct,
    passed: scorePct >= passingScore,
    answers: input.answers,
    correctIds,
    durationSeconds: input.durationSeconds,
    attempts: input.attempts,
  };
}

export function getEducationMaterial(id: string): EducationMaterial | undefined {
  return clinicalContentRegistry.getEducationMaterial(id);
}

export function listEducationMaterials(): EducationMaterial[] {
  return clinicalContentRegistry.listEducationMaterials();
}
