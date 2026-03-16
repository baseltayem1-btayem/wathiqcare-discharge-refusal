"use client";

import { cn } from "@/components/design-system/utils";

type StatusBadgeProps = {
    value?: string | null;
    className?: string;
};

const STATUS_STYLES: Record<string, string> = {
    OPEN: "bg-blue-100 text-blue-800 border-blue-200",
    IN_PROGRESS: "bg-cyan-100 text-cyan-800 border-cyan-200",
    ESCALATED: "bg-rose-100 text-rose-800 border-rose-200",
    CLOSED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    OVERDUE: "bg-red-100 text-red-800 border-red-200",
    COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function normalize(value: string | null | undefined) {
    return (value || "UNKNOWN").toUpperCase();
}

export default function StatusBadge({ value, className }: StatusBadgeProps) {
    const normalized = normalize(value);
    const style = STATUS_STYLES[normalized] || "bg-slate-100 text-slate-700 border-slate-200";

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                style,
                className,
            )}
        >
            {normalized.replace(/_/g, " ")}
        </span>
    );
}
