"use client";

import { Clock } from "lucide-react";
import { Card, Badge } from "@/components/design-system";
import type { TimelineEvent, PatientLanguage } from "../../types/workspace";
import { t } from "../../lib/i18n-helpers";
import { TimelineEventCard } from "./TimelineEventCard";

interface ClinicalTimelinePanelProps {
  events: TimelineEvent[];
  lang?: PatientLanguage;
}

export function ClinicalTimelinePanel({ events, lang = "en" }: ClinicalTimelinePanelProps) {
  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <Card className="overflow-hidden">
      <div className="workspace-card-header px-5 py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[var(--wc-blue)]" />
          <h3 className="text-base font-bold text-[var(--wc-text)]">
            {t(lang, "Clinical Timeline", "الخط الزمني السريري")}
          </h3>
        </div>
        <Badge variant="info">{sorted.length}</Badge>
      </div>
      <div className="p-5">
        {sorted.length === 0 ? (
          <div className="text-sm text-[var(--wc-text-muted)] text-center py-8">
            {t(lang, "No events yet. Dispatch a consent to start the timeline.",
              "لا توجد أحداث بعد. أرسل الموافقة لبدء الخط الزمني.")}
          </div>
        ) : (
          <div className="space-y-0">
            {sorted.map((event, index) => (
              <TimelineEventCard key={event.id} event={event} lang={lang} isLast={index === sorted.length - 1} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
