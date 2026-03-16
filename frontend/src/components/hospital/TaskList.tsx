"use client";

import { CheckCircle2, Repeat2 } from "lucide-react";

import type { Task } from "@/lib/api/types";
import StatusBadge from "@/components/hospital/StatusBadge";

type TaskListProps = {
    items: Task[];
    locale?: string;
    onComplete?: (task: Task) => void;
    onReassign?: (task: Task) => void;
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

export default function TaskList({ items, locale = "en-US", onComplete, onReassign }: TaskListProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No tasks found.
            </div>
        );
    }

    return (
        <ul className="space-y-2">
            {items.map((task) => (
                <li key={task.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-600">{task.description || "-"}</p>
                            <p className="mt-1 text-xs text-slate-500">Due: {formatDate(task.dueAt, locale)}</p>
                        </div>
                        <div className="inline-flex items-center gap-2">
                            <StatusBadge value={task.status} />
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                {task.priority}
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                        {onComplete && task.status !== "COMPLETED" ? (
                            <button
                                type="button"
                                onClick={() => onComplete(task)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Complete
                            </button>
                        ) : null}

                        {onReassign ? (
                            <button
                                type="button"
                                onClick={() => onReassign(task)}
                                className="inline-flex items-center gap-1 rounded-lg border border-sky-300 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
                            >
                                <Repeat2 className="h-3.5 w-3.5" />
                                Reassign
                            </button>
                        ) : null}
                    </div>
                </li>
            ))}
        </ul>
    );
}
