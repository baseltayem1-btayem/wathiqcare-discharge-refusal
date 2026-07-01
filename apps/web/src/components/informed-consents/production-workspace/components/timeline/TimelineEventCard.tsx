"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Badge, Card } from "@/components/design-system";
import type { TimelineEvent, PatientLanguage } from "../../types/workspace";
import { t } from "../../lib/i18n-helpers";

interface TimelineEventCardProps {
  event: TimelineEvent;
  lang: PatientLanguage;
  isLast: boolean;
}

export function TimelineEventCard({ event, lang, isLast }: TimelineEventCardProps) {
  const statusBadge =
    event.status === "completed" ? (
      <Badge variant="success">
        <CheckCircle2 className="w-3.5 h-3.5" />
      </Badge>
    ) : event.status === "blocked" ? (
      <Badge variant="destructive">
        <AlertCircle className="w-3.5 h-3.5" />
      </Badge>
    ) : (
      <Badge variant="outline">
        <Circle className="w-3.5 h-3.5" />
      </Badge>
    );

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-[var(--wc-surface-2)] border border-[var(--wc-border)] flex items-center justify-center">
          {statusBadge}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-[var(--wc-border)] my-1" />}
      </div>
      <div className="flex-1 pb-6">
        <Card className="p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-[var(--wc-text)]">
                {lang === "ar" ? event.summaryAr : event.summaryEn}
              </div>
              <div className="text-xs text-[var(--wc-text-muted)] mt-0.5">
                {event.actorName} • {new Date(event.timestamp).toLocaleString(lang)}
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-[var(--wc-surface-2)] border border-[var(--wc-border)] text-[var(--wc-text-muted)]">
              {event.actor}
            </span>
          </div>
          {event.evidenceHash && (
            <div className="mt-2 text-[10px] font-mono text-[var(--wc-text-light)] break-all">
              {t(lang, "Evidence hash", "هاش الدليل")}: {event.evidenceHash}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
