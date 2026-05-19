import type { AuditTimelineEntry } from "@/lib/pdf-engine/audit/audit-timeline";

export interface AuditViewItem {
  emphasis: string;
  summary: string;
  timestamp: string;
}

export function buildAuditViewModel(timeline: AuditTimelineEntry[]): AuditViewItem[] {
  return timeline.map((entry) => ({
    emphasis: entry.title,
    summary: `${entry.details}${entry.reference ? ` Reference: ${entry.reference}.` : ""}`,
    timestamp: entry.timestamp,
  }));
}