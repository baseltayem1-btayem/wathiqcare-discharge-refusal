"use client";

import { Clock, MousePointerClick, BrainCircuit, ShieldAlert, TrendingDown, Users } from "lucide-react";
import { Card, Stack, Badge, Button } from "@/components/design-system";
import type { TaskMetrics, BaselineScenario } from "../types/workspace";

interface TaskMetricsPanelProps {
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
  sent: boolean;
  patientMetrics: TaskMetrics;
  mode: "physician" | "timeline" | "patientPreview";
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
}

export function TaskMetricsPanel({
  current,
  baseline,
  deltas,
  percentReductions,
  sent,
  patientMetrics,
  mode,
}: TaskMetricsPanelProps) {
  const showComparison = mode !== "patientPreview";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--wc-text)] flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-[var(--wc-blue)]" /> Task efficiency metrics
        </h3>
        {sent && (
          <Badge variant="success" size="sm">
            Sent
          </Badge>
        )}
      </div>

      <Stack className="gap-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricItem
            icon={MousePointerClick}
            label="Clicks"
            current={current.clicks}
            baseline={baseline.clicks}
            saved={deltas.clicksSaved}
            pct={percentReductions.clicks}
            showComparison={showComparison}
          />
          <MetricItem
            icon={BrainCircuit}
            label="Decisions"
            current={current.decisions}
            baseline={baseline.decisions}
            saved={deltas.decisionsSaved}
            pct={percentReductions.decisions}
            showComparison={showComparison}
          />
          <MetricItem
            icon={Clock}
            label="Time"
            current={formatDuration(current.durationMs)}
            baseline={formatDuration(baseline.estimatedTimeMs)}
            saved={formatDuration(deltas.timeSavedMs)}
            pct={percentReductions.time}
            showComparison={showComparison}
          />
          <MetricItem
            icon={ShieldAlert}
            label="Blockers"
            current={current.blockersHit}
            baseline={baseline.blockersHit}
            saved={deltas.blockersAvoided}
            pct={percentReductions.blockers}
            showComparison={showComparison}
          />
        </div>

        {mode === "timeline" && (
          <div className="pt-3 border-t border-[var(--wc-border)]">
            <h4 className="text-xs font-semibold text-[var(--wc-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Patient journey
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniMetric label="Screens" value={patientMetrics.patientScreensViewed} />
              <MiniMetric label="Interactions" value={patientMetrics.patientInteractions} />
              <MiniMetric label="Questions" value={patientMetrics.questionsAsked} />
            </div>
          </div>
        )}

        {showComparison && (
          <Button variant="ghost" size="sm" uppercase={false} className="justify-start" disabled>
            Baseline: {baseline.name}
          </Button>
        )}
      </Stack>
    </Card>
  );
}

interface MetricItemProps {
  icon: React.ElementType;
  label: string;
  current: string | number;
  baseline: string | number;
  saved: string | number;
  pct: number;
  showComparison: boolean;
}

function MetricItem({ icon: Icon, label, current, saved, pct, showComparison }: MetricItemProps) {
  return (
    <div className="px-3 py-2 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]">
      <div className="flex items-center gap-1.5 text-xs text-[var(--wc-text-muted)] mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-lg font-bold text-[var(--wc-text)]">{current}</div>
      {showComparison && pct > 0 && (
        <div className="text-[10px] font-semibold text-[var(--wc-success)]">↓ {pct}% ({saved} saved)</div>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 py-1.5 rounded border border-[var(--wc-border)] bg-white">
      <div className="text-base font-bold text-[var(--wc-text)]">{value}</div>
      <div className="text-[10px] text-[var(--wc-text-muted)]">{label}</div>
    </div>
  );
}
