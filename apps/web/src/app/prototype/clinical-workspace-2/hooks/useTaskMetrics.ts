"use client";

import { useMemo } from "react";
import type { TaskMetrics, BaselineScenario } from "../types/workspace";

export const CURRENT_WORKFLOW_BASELINE: BaselineScenario = {
  name: "Current 8-step enterprise workflow",
  clicks: 24,
  decisions: 14,
  estimatedTimeMs: 145_000,
  blockersHit: 3,
};

export function useComparisonMetrics(metrics: TaskMetrics): {
  current: TaskMetrics;
  baseline: BaselineScenario;
  deltas: {
    clicksSaved: number;
    decisionsSaved: number;
    timeSavedMs: number;
    blockersAvoided: number;
  };
  percentReductions: {
    clicks: number;
    decisions: number;
    time: number;
    blockers: number;
  };
} {
  const current: TaskMetrics = useMemo(() => metrics, [metrics]);

  const deltas = useMemo(() => {
    return {
      clicksSaved: Math.max(0, CURRENT_WORKFLOW_BASELINE.clicks - current.clicks),
      decisionsSaved: Math.max(0, CURRENT_WORKFLOW_BASELINE.decisions - current.decisions),
      timeSavedMs: Math.max(0, CURRENT_WORKFLOW_BASELINE.estimatedTimeMs - current.durationMs),
      blockersAvoided: current.blockersCaughtBeforeSend,
    };
  }, [current]);

  const percentReductions = useMemo(() => {
    const pct = (saved: number, base: number) => (base > 0 ? Math.min(100, Math.round((saved / base) * 100)) : 0);
    return {
      clicks: pct(deltas.clicksSaved, CURRENT_WORKFLOW_BASELINE.clicks),
      decisions: pct(deltas.decisionsSaved, CURRENT_WORKFLOW_BASELINE.decisions),
      time: pct(deltas.timeSavedMs, CURRENT_WORKFLOW_BASELINE.estimatedTimeMs),
      blockers: pct(deltas.blockersAvoided, CURRENT_WORKFLOW_BASELINE.blockersHit),
    };
  }, [deltas]);

  return { current, baseline: CURRENT_WORKFLOW_BASELINE, deltas, percentReductions };
}
