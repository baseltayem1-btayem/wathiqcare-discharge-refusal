"use client";

import type { AuditLog } from "@/lib/api/types";

type AuditEventListProps = {
    items: AuditLog[];
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

export default function AuditEventList({ items, locale = "en-US" }: AuditEventListProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No audit records found for this context.
            </div>
        );
    }

    return (
        <ul className="space-y-2">
            {items.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.action}</p>
                        <p className="text-xs text-slate-500">{formatDate(item.occurredAt, locale)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                        {item.actorEmail || "system"} {item.actorRoleSnapshot ? `(${item.actorRoleSnapshot})` : ""}
                    </p>
                </li>
            ))}
        </ul>
    );
}
