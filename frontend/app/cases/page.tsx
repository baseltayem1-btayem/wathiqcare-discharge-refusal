"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Filter, PlusCircle, RefreshCw } from "lucide-react";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/hospital/StatusBadge";
import { useCasesQuery } from "@/lib/hooks/use-cases";
import { useTasksOverdueQuery } from "@/lib/hooks/use-reports";

type CaseStatusFilter = "" | "OPEN" | "IN_PROGRESS" | "ESCALATED" | "CLOSED";

export default function CasesPage() {
    const [status, setStatus] = useState<CaseStatusFilter>("");
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [page, setPage] = useState(1);

    const casesQuery = useCasesQuery({
        page,
        pageSize: 20,
        status: status || undefined,
        overdue: overdueOnly,
    });

    const overdueTasksQuery = useTasksOverdueQuery(true);

    const overdueCaseIds = useMemo(() => {
        const set = new Set<string>();
        for (const item of overdueTasksQuery.data || []) {
            const caseId = (item as { refusalCaseId?: string | null }).refusalCaseId;
            if (caseId) {
                set.add(caseId);
            }
        }
        return set;
    }, [overdueTasksQuery.data]);

    const totalPages = Math.max(
        1,
        Math.ceil((casesQuery.data?.total || 0) / Math.max(casesQuery.data?.pageSize || 20, 1)),
    );

    return (
        <AuthGuard>
            <AppShell
                title="Case List | قائمة القضايا"
                subtitle="Live refusal-case list from backend-nest with operational filters"
                actions={
                    <>
                        <Link
                            href="/cases/new"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                            <PlusCircle className="h-4 w-4" />
                            New Case
                        </Link>

                        <button
                            type="button"
                            onClick={() => void casesQuery.refetch()}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </>
                }
            >
                <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                            <select
                                value={status}
                                onChange={(event) => {
                                    setStatus(event.target.value as CaseStatusFilter);
                                    setPage(1);
                                }}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                                <option value="">All</option>
                                <option value="OPEN">OPEN</option>
                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                <option value="ESCALATED">ESCALATED</option>
                                <option value="CLOSED">CLOSED</option>
                            </select>
                        </div>

                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={overdueOnly}
                                onChange={(event) => {
                                    setOverdueOnly(event.target.checked);
                                    setPage(1);
                                }}
                            />
                            Overdue cases only
                        </label>

                        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <Filter className="h-3.5 w-3.5" />
                            Total: {casesQuery.data?.total || 0}
                        </div>
                    </div>
                </section>

                {casesQuery.isLoading ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Loading case list...
                    </div>
                ) : null}

                {casesQuery.error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {casesQuery.error.message}
                    </div>
                ) : null}

                {!casesQuery.isLoading && !casesQuery.error ? (
                    <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="bg-slate-100 text-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Case Number</th>
                                    <th className="px-4 py-3 text-left">Type</th>
                                    <th className="px-4 py-3 text-left">Stage</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Priority</th>
                                    <th className="px-4 py-3 text-left">Overdue</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(casesQuery.data?.items || []).map((item) => {
                                    const isOverdue = overdueCaseIds.has(item.id);
                                    return (
                                        <tr key={item.id} className="border-t">
                                            <td className="px-4 py-3 font-medium text-slate-900">{item.caseNumber}</td>
                                            <td className="px-4 py-3 text-slate-700">{item.caseType}</td>
                                            <td className="px-4 py-3 text-slate-700">{item.currentStageCode || "-"}</td>
                                            <td className="px-4 py-3">
                                                <StatusBadge value={item.status} />
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{item.priority || "-"}</td>
                                            <td className="px-4 py-3">
                                                {isOverdue ? (
                                                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                                        OVERDUE
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">On track</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/cases/${item.id}`}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-white"
                                                >
                                                    Open
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {(casesQuery.data?.items || []).length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                            No cases match current filters.
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        Page {page} of {totalPages}
                    </p>
                    <div className="inline-flex gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </AppShell>
        </AuthGuard>
    );
}
