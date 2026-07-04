/**
 * Stress Test
 *
 * Simulates 10,000 knowledge package assemblies in-memory and reports
 * average, P95, and P99 latency plus approximate memory/CPU snapshots.
 */

import { buildImcSeedPlan } from "../migration/seed-from-imc";
import { defaultDecisionRules } from "../rules/default-rules";
import { evaluateRulesWithContext } from "../services/rule-service";
import type { ClinicalKnowledgeAssemblyRequest, ClinicalKnowledgeDecisionRule } from "@/lib/clinical-knowledge/types";

export interface StressTestResult {
  iterations: number;
  averageMs: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  totalMs: number;
  memoryBeforeMb: number;
  memoryAfterMb: number;
  memoryDeltaMb: number;
  cpuUsagePercent: number | null;
  success: boolean;
}

export function runStressTest(
  tenantId: string,
  iterations = 10_000,
): StressTestResult {
  const plan = buildImcSeedPlan({ tenantId });
  const effectiveDate = new Date("2026-06-01").toISOString();
  const nowIso = new Date().toISOString();
  const rules: ClinicalKnowledgeDecisionRule[] = defaultDecisionRules.map((rule) => ({
    id: `${tenantId}:${rule.code}`,
    tenantId,
    code: rule.code,
    nameEn: rule.nameEn,
    nameAr: rule.nameAr,
    description: rule.description,
    priority: rule.priority,
    condition: rule.condition,
    action: rule.action,
    status: "ACTIVE",
    effectiveDate,
    expiryDate: null,
    createdByUserId: "system-stress",
    createdAt: nowIso,
    updatedAt: nowIso,
  }));

  if (plan.packages.length === 0) {
    throw new Error("No packages to stress test");
  }

  const packageIndex = plan.packages[0];
  const procedure = plan.procedures.find((p) => p.code === packageIndex.sourceId);
  if (!procedure) {
    throw new Error("Procedure for first package not found");
  }

  const request: ClinicalKnowledgeAssemblyRequest = {
    tenantId,
    procedureCode: procedure.code,
    patientContext: { capacityStatus: "competent", languagePreference: "bilingual" },
  };

  const memoryBefore = process.memoryUsage().heapUsed;
  const cpuBefore = process.cpuUsage ? process.cpuUsage() : null;

  const latencies: number[] = [];
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    const iterStart = performance.now();

    // Simulate package lookup
    const pkg = plan.packages.find((p) => p.sourceId === request.procedureCode);
    const formItem = pkg?.items.find((item) => item.itemType === "CONSENT_FORM");
    const educationItems =
      pkg?.items.filter((item) => item.itemType === "EDUCATION_MATERIAL") ?? [];
    const riskItems = pkg?.items.filter((item) => item.itemType === "RISK_DISCLOSURE") ?? [];

    // Simulate decision rule evaluation
    evaluateRulesWithContext(rules, {
      anesthesiaRequired: procedure.anesthesiaRequired,
      patientCapacityStatus: request.patientContext?.capacityStatus,
      patientLanguagePreference: request.patientContext?.languagePreference,
    });

    const iterEnd = performance.now();
    latencies.push(iterEnd - iterStart);
  }

  const totalMs = performance.now() - start;
  const memoryAfter = process.memoryUsage().heapUsed;

  latencies.sort((a, b) => a - b);
  const averageMs = totalMs / iterations;
  const p95Ms = latencies[Math.floor(iterations * 0.95)] ?? latencies[latencies.length - 1];
  const p99Ms = latencies[Math.floor(iterations * 0.99)] ?? latencies[latencies.length - 1];

  let cpuUsagePercent: number | null = null;
  if (cpuBefore && process.cpuUsage) {
    const cpuAfter = process.cpuUsage(cpuBefore);
    const cpuMicroseconds = cpuAfter.user + cpuAfter.system;
    // Approximate CPU percent over total elapsed time (single core)
    cpuUsagePercent = Math.round((cpuMicroseconds / (totalMs * 1000)) * 100 * 100) / 100;
  }

  return {
    iterations,
    averageMs: Math.round(averageMs * 1000) / 1000,
    p95Ms: Math.round(p95Ms * 1000) / 1000,
    p99Ms: Math.round(p99Ms * 1000) / 1000,
    minMs: Math.round(latencies[0] * 1000) / 1000,
    maxMs: Math.round(latencies[latencies.length - 1] * 1000) / 1000,
    totalMs: Math.round(totalMs * 1000) / 1000,
    memoryBeforeMb: Math.round((memoryBefore / 1024 / 1024) * 100) / 100,
    memoryAfterMb: Math.round((memoryAfter / 1024 / 1024) * 100) / 100,
    memoryDeltaMb: Math.round(((memoryAfter - memoryBefore) / 1024 / 1024) * 100) / 100,
    cpuUsagePercent,
    success: averageMs < 5 && p95Ms < 10,
  };
}
