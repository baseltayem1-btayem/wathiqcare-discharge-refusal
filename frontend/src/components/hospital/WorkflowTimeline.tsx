"use client";

import { Clock3 } from "lucide-react";

type TimelineEvent = {
    id: string;
    title: string;
    subtitle?: string;
    at?: string | null;
};

type WorkflowTimelineProps = {
    events: TimelineEvent[];
    locale?: string;
};

function formatDate(value: string | null | undefined, locale: string) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(locale);
}

export default function WorkflowTimeline({ events, locale = "en-US" }: WorkflowTimelineProps) {
    if (events.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No timeline events yet.
            </div>
        );
    }

    return (
        <ol className="space-y-3">
            {events.map((event) => (
                <li key={event.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                            {event.subtitle ? <p className="mt-1 text-xs text-slate-600">{event.subtitle}</p> : null}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDate(event.at, locale)}
                        </span>
                    </div>
                </li>
            ))}
        </ol>
    );
}
