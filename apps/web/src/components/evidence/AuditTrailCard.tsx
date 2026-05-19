"use client";

import EnterpriseCard from "@/components/enterprise/EnterpriseCard";
import type { EvidenceAuditEvent } from "./types";

export type AuditTrailCardProps = {
  events: EvidenceAuditEvent[];
  title?: string;
};

const severityColor: Record<NonNullable<EvidenceAuditEvent["severity"]>, string> = {
  info: "var(--wc-ent-state-info-fg)",
  warn: "var(--wc-ent-state-warn-fg)",
  error: "var(--wc-ent-state-err-fg)",
};

export default function AuditTrailCard({
  events,
  title = "Audit Trail",
}: AuditTrailCardProps) {
  return (
    <EnterpriseCard
      testId="audit-trail-card"
      header={{
        title,
        subtitle: `${events.length} events`,
      }}
    >
      {events.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--wc-ent-fg-muted)" }}>
          No audit events recorded.
        </p>
      ) : (
        <ul className="space-y-0">
          {events.map((event) => (
            <li
              key={event.id}
              className="wc-ent-row-dense grid grid-cols-[140px_120px_1fr] items-baseline gap-3 border-t px-1 py-1.5 text-xs"
              style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
              data-testid="audit-trail-row"
            >
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {event.timestamp}
              </span>
              <span className="font-medium">{event.actor}</span>
              <span>
                <span
                  style={{
                    color: event.severity ? severityColor[event.severity] : undefined,
                  }}
                >
                  {event.action}
                </span>
                {event.detail ? (
                  <span
                    className="block text-[11px]"
                    style={{ color: "var(--wc-ent-fg-muted)" }}
                  >
                    {event.detail}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </EnterpriseCard>
  );
}
