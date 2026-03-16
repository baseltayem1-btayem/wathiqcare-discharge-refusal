"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ClipboardList,
    FileText,
    GitBranch,
    LayoutDashboard,
    RefreshCw,
    Scale,
    ScrollText,
} from "lucide-react";
import { useState } from "react";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import AuditEventList from "@/components/hospital/AuditEventList";
import DocumentList from "@/components/hospital/DocumentList";
import StatusBadge from "@/components/hospital/StatusBadge";
import TaskList from "@/components/hospital/TaskList";
import WorkflowTimeline from "@/components/hospital/WorkflowTimeline";
import { useAuthSession } from "@/lib/hooks/use-auth";
import { useCaseQuery, useCaseTimelineQuery } from "@/lib/hooks/use-cases";
import { useCaseDocumentsQuery } from "@/lib/hooks/use-documents";
import {
    useDischargeDecisionQuery,
    useDischargePlanQuery,
} from "@/lib/hooks/use-discharge";
import { useCaseAuditQuery, useLegalNotesQuery } from "@/lib/hooks/use-legal";
import { useTasksQuery, useCompleteTaskMutation } from "@/lib/hooks/use-tasks";
import {
    useAvailableTransitionsQuery,
    useExecuteTransitionMutation,
} from "@/lib/hooks/use-workflow";

// ─── Tab definition ──────────────────────────────────────────────────────────

const TABS = [
    {
        id: "overview",
        label: "Overview",
        icon: LayoutDashboard,
        requiredAnyPermission: ["cases.read"],
    },
    {
        id: "discharge",
        label: "Discharge",
        icon: CheckCircle2,
        requiredAnyPermission: ["discharge.decision.read", "discharge.plan.update", "discharge.plan.create"],
    },
    {
        id: "tasks",
        label: "Tasks",
        icon: ClipboardList,
        requiredAnyPermission: ["tasks.read"],
    },
    {
        id: "documents",
        label: "Documents",
        icon: FileText,
        requiredAnyPermission: ["documents.read"],
    },
    {
        id: "legal",
        label: "Legal",
        icon: Scale,
        requiredAnyPermission: ["legal.notes.read", "audit.read"],
    },
    {
        id: "timeline",
        label: "Timeline",
        icon: ScrollText,
        requiredAnyPermission: ["cases.read", "audit.read"],
    },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Small info-row helper ────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <span className="min-w-[10rem] text-xs font-medium text-slate-500">{label}</span>
            <span className="text-sm text-slate-900">{value ?? "-"}</span>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CaseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { hasAnyPermission } = useAuthSession();
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [transitionComment, setTransitionComment] = useState("");

    const availableTabs = TABS.filter((tab) =>
        hasAnyPermission(tab.requiredAnyPermission as unknown as string[]),
    );
    const resolvedActiveTab: TabId = availableTabs.some((tab) => tab.id === activeTab)
        ? activeTab
        : (availableTabs[0]?.id ?? "overview");

    // Core data
    const caseQuery = useCaseQuery(id);
    const timelineQuery = useCaseTimelineQuery(id);

    // Tab-scoped data (lazy: only runs when active === tab or always-on)
    const decisionQuery = useDischargeDecisionQuery(id, resolvedActiveTab === "discharge");
    const planQuery = useDischargePlanQuery(id, resolvedActiveTab === "discharge");
    const tasksQuery = useTasksQuery({ refusalCaseId: id, pageSize: 50 }, resolvedActiveTab === "tasks");
    const documentsQuery = useCaseDocumentsQuery(id, resolvedActiveTab === "documents");
    const legalNotesQuery = useLegalNotesQuery(id, resolvedActiveTab === "legal");
    const caseAuditQuery = useCaseAuditQuery(id, resolvedActiveTab === "legal" || resolvedActiveTab === "timeline");
    const transitionsQuery = useAvailableTransitionsQuery(id, resolvedActiveTab === "overview");

    // Mutations
    const executeTransition = useExecuteTransitionMutation(id);
    const completeTask = useCompleteTaskMutation();

    const caseData = caseQuery.data;
    const isLoading = caseQuery.isLoading;
    const isError = caseQuery.isError;

    // ─── Loading / error states ────────────────────────────────────────────

    if (isLoading) {
        return (
            <AuthGuard>
                <AppShell title="Loading case…">
                    <div className="flex items-center justify-center py-24">
                        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                </AppShell>
            </AuthGuard>
        );
    }

    if (isError || !caseData) {
        return (
            <AuthGuard>
                <AppShell title="Case not found">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
                        <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
                        <p className="mt-2 text-sm font-semibold text-rose-700">
                            Case not found or you do not have access.
                        </p>
                        <Link
                            href="/cases"
                            className="mt-4 inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to cases
                        </Link>
                    </div>
                </AppShell>
            </AuthGuard>
        );
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    function handleTransition(transitionCode: string) {
        executeTransition.mutate(
            { transitionCode, comment: transitionComment || undefined },
            {
                onSuccess: () => {
                    setTransitionComment("");
                },
            },
        );
    }

    // Build timeline feed from case timeline
    const timelineEvents = (() => {
        if (!timelineQuery.data) return [];
        const tl = timelineQuery.data;
        const events: Array<{ id: string; title: string; subtitle?: string; at?: string | null }> = [];

        for (const item of tl.stageHistory ?? []) {
            const r = item as Record<string, unknown>;
            events.push({
                id: String(r.id ?? `stage-${String(r.stageCode ?? r.stageName ?? "unknown")}-${String(r.enteredAt ?? r.createdAt ?? "")}`),
                title: `Stage: ${String(r.stageCode ?? r.stageName ?? "—")}`,
                subtitle: String(r.enteredBy ?? ""),
                at: String(r.enteredAt ?? r.createdAt ?? ""),
            });
        }

        for (const item of tl.refusalEvents ?? []) {
            const r = item as Record<string, unknown>;
            events.push({
                id: String(r.id ?? `refusal-${String(r.createdAt ?? "")}-${String(r.refusingPersonName ?? "")}`),
                title: `Refusal recorded`,
                subtitle: String(r.refusingPersonName ?? ""),
                at: String(r.createdAt ?? ""),
            });
        }

        for (const item of tl.escalationEvents ?? []) {
            const r = item as Record<string, unknown>;
            events.push({
                id: String(r.id ?? `escalation-${String(r.createdAt ?? "")}-${String(r.escalationType ?? "")}`),
                title: `Escalation: ${String(r.escalationType ?? "—")}`,
                subtitle: String(r.escalatedBy ?? ""),
                at: String(r.createdAt ?? ""),
            });
        }

        return events.sort((a, b) => {
            const da = a.at ? new Date(a.at).getTime() : 0;
            const db = b.at ? new Date(b.at).getTime() : 0;
            return db - da;
        });
    })();

    // ─── Render ────────────────────────────────────────────────────────────

    return (
        <AuthGuard>
            <AppShell
                title={`Case #${caseData.caseNumber}`}
                subtitle={caseData.summary ?? undefined}
                actions={
                    <Link
                        href="/cases"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to cases
                    </Link>
                }
            >
                {/* Case header -------------------------------------------------- */}
                <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xl font-bold text-slate-900">
                                #{caseData.caseNumber}
                            </span>
                            <StatusBadge value={caseData.status} />
                            {caseData.priority ? (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                    {caseData.priority}
                                </span>
                            ) : null}
                            {caseData.escalatedToLegal ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                    <AlertTriangle className="h-3 w-3" />
                                    Legal Escalation
                                </span>
                            ) : null}
                        </div>
                        {caseData.currentStageCode ? (
                            <p className="text-xs text-slate-500">
                                Stage: <span className="font-medium">{caseData.currentStageCode}</span>
                            </p>
                        ) : null}
                    </div>

                    <div className="text-right text-xs text-slate-400">
                        <p>Created: {new Date(caseData.createdAt).toLocaleDateString()}</p>
                        <p>Updated: {new Date(caseData.updatedAt).toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Tab nav ------------------------------------------------------ */}
                <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
                    {availableTabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${resolvedActiveTab === tab.id
                                    ? "bg-white text-sky-700 shadow-sm"
                                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                                    }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {availableTabs.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        You do not have permission to view case details tabs for this case.
                    </div>
                ) : null}

                {/* ── TAB: Overview ─────────────────────────────────────────── */}
                {availableTabs.length > 0 && resolvedActiveTab === "overview" && (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {/* Case info */}
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 text-sm font-semibold text-slate-800">Case Information</h2>
                            <div className="space-y-2">
                                <InfoRow label="Case Number" value={caseData.caseNumber} />
                                <InfoRow label="Type" value={caseData.caseType} />
                                <InfoRow label="Status" value={<StatusBadge value={caseData.status} />} />
                                <InfoRow label="Priority" value={caseData.priority} />
                                <InfoRow label="Current Stage" value={caseData.currentStageCode} />
                                <InfoRow
                                    label="Closed At"
                                    value={
                                        caseData.closedAt
                                            ? new Date(caseData.closedAt).toLocaleString()
                                            : "—"
                                    }
                                />
                            </div>
                        </section>

                        {/* Workflow transitions */}
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-800">Workflow Transitions</h2>
                                <button
                                    type="button"
                                    onClick={() => transitionsQuery.refetch()}
                                    className="rounded p-1 text-slate-400 hover:text-slate-600"
                                    title="Refresh transitions"
                                >
                                    <RefreshCw
                                        className={`h-3.5 w-3.5 ${transitionsQuery.isFetching ? "animate-spin" : ""}`}
                                    />
                                </button>
                            </div>

                            {transitionsQuery.isLoading ? (
                                <p className="text-xs text-slate-400">Loading transitions…</p>
                            ) : (transitionsQuery.data ?? []).length === 0 ? (
                                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                    No transitions available at current stage.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <textarea
                                        rows={2}
                                        value={transitionComment}
                                        onChange={(e) => setTransitionComment(e.target.value)}
                                        placeholder="Optional comment for transition…"
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {(transitionsQuery.data ?? []).map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                disabled={executeTransition.isPending}
                                                onClick={() => handleTransition(t.code)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                                            >
                                                <GitBranch className="h-3.5 w-3.5" />
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                    {executeTransition.isError ? (
                                        <p className="text-xs text-rose-600">
                                            Transition failed. Please try again.
                                        </p>
                                    ) : null}
                                </div>
                            )}
                        </section>

                        {/* Summary */}
                        {caseData.summary ? (
                            <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-2">
                                <h2 className="mb-2 text-sm font-semibold text-slate-800">Summary</h2>
                                <p className="text-sm text-slate-700">{caseData.summary}</p>
                            </section>
                        ) : null}
                    </div>
                )}

                {/* ── TAB: Discharge ────────────────────────────────────────── */}
                {availableTabs.length > 0 && resolvedActiveTab === "discharge" && (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {/* Decision */}
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 text-sm font-semibold text-slate-800">Discharge Decision</h2>
                            {decisionQuery.isLoading ? (
                                <p className="text-xs text-slate-400">Loading…</p>
                            ) : !decisionQuery.data ? (
                                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                    No discharge decision recorded yet.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    <InfoRow
                                        label="Status"
                                        value={<StatusBadge value={decisionQuery.data.decisionStatus} />}
                                    />
                                    <InfoRow
                                        label="Medically Appropriate"
                                        value={
                                            decisionQuery.data.dischargeMedicallyAppropriate
                                                ? "Yes"
                                                : "No"
                                        }
                                    />
                                    <InfoRow
                                        label="Decision Date"
                                        value={`${decisionQuery.data.decisionDate} ${decisionQuery.data.decisionTime}`}
                                    />
                                    <InfoRow
                                        label="Clinical Remarks"
                                        value={decisionQuery.data.clinicalRemarks}
                                    />
                                </div>
                            )}
                        </section>

                        {/* Plan */}
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 text-sm font-semibold text-slate-800">Discharge Plan</h2>
                            {planQuery.isLoading ? (
                                <p className="text-xs text-slate-400">Loading…</p>
                            ) : !planQuery.data?.plan ? (
                                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                    No discharge plan created yet.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <InfoRow
                                            label="Destination"
                                            value={planQuery.data.plan.destination}
                                        />
                                        <InfoRow
                                            label="Instructions Provided"
                                            value={
                                                planQuery.data.plan.instructionsProvided ? "Yes" : "No"
                                            }
                                        />
                                        <InfoRow label="Notes" value={planQuery.data.plan.notes} />
                                    </div>

                                    {(planQuery.data.items ?? []).length > 0 ? (
                                        <div>
                                            <p className="mb-1.5 text-xs font-semibold text-slate-600">
                                                Plan Items
                                            </p>
                                            <ul className="space-y-1.5">
                                                {planQuery.data.items.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                                                    >
                                                        <div>
                                                            <span className="text-xs font-medium text-slate-800">
                                                                {item.itemType}
                                                            </span>
                                                            {item.notes ? (
                                                                <p className="text-xs text-slate-500">
                                                                    {item.notes}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <StatusBadge value={item.status} />
                                                            {item.required ? (
                                                                <span className="text-xs text-rose-600">
                                                                    Required
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {/* ── TAB: Tasks ────────────────────────────────────────────── */}
                {availableTabs.length > 0 && resolvedActiveTab === "tasks" && (
                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-800">
                                Tasks
                                {tasksQuery.data ? (
                                    <span className="ml-1.5 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                                        {tasksQuery.data.total}
                                    </span>
                                ) : null}
                            </h2>
                            <button
                                type="button"
                                onClick={() => tasksQuery.refetch()}
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                                title="Refresh tasks"
                            >
                                <RefreshCw
                                    className={`h-3.5 w-3.5 ${tasksQuery.isFetching ? "animate-spin" : ""}`}
                                />
                            </button>
                        </div>

                        {tasksQuery.isLoading ? (
                            <p className="text-xs text-slate-400">Loading tasks…</p>
                        ) : (
                            <TaskList
                                items={tasksQuery.data?.items ?? []}
                                onComplete={(task) => {
                                    completeTask.mutate({ taskId: task.id, comment: undefined });
                                }}
                            />
                        )}
                    </section>
                )}

                {/* ── TAB: Documents ────────────────────────────────────────── */}
                {availableTabs.length > 0 && resolvedActiveTab === "documents" && (
                    <section>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-800">Documents</h2>
                            <button
                                type="button"
                                onClick={() => documentsQuery.refetch()}
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                                title="Refresh documents"
                            >
                                <RefreshCw
                                    className={`h-3.5 w-3.5 ${documentsQuery.isFetching ? "animate-spin" : ""}`}
                                />
                            </button>
                        </div>

                        {documentsQuery.isLoading ? (
                            <p className="text-xs text-slate-400">Loading documents…</p>
                        ) : (
                            <>
                                {/* Generated documents */}
                                {(
                                    (documentsQuery.data as { generatedDocuments?: unknown[] } | null)
                                        ?.generatedDocuments ?? []
                                ).length > 0 ? (
                                    <div className="mb-4">
                                        <p className="mb-2 text-xs font-semibold text-slate-600">
                                            Generated Documents
                                        </p>
                                        <DocumentList
                                            items={(
                                                (documentsQuery.data as { generatedDocuments?: Array<Record<string, unknown>> } | null)
                                                    ?.generatedDocuments ?? []
                                            ).map((d) => ({
                                                id: String(d.id),
                                                title: String(d.title ?? d.documentType ?? "Document"),
                                                type: String(d.documentType ?? "—"),
                                                fileName: String(d.fileName ?? d.filePath ?? ""),
                                                createdAt:
                                                    typeof d.createdAt === "string" ? d.createdAt : null,
                                            }))}
                                        />
                                    </div>
                                ) : null}

                                {/* Attachments */}
                                <div>
                                    <p className="mb-2 text-xs font-semibold text-slate-600">
                                        Attachments
                                    </p>
                                    <DocumentList
                                        items={(
                                            (documentsQuery.data as { attachments?: Array<Record<string, unknown>> } | null)
                                                ?.attachments ?? []
                                        ).map((d) => ({
                                            id: String(d.id),
                                            title: String(d.title ?? d.originalName ?? "Attachment"),
                                            type: String(d.mimeType ?? d.type ?? "—"),
                                            fileName: String(d.originalName ?? d.fileName ?? ""),
                                            createdAt:
                                                typeof d.createdAt === "string" ? d.createdAt : null,
                                        }))}
                                    />
                                </div>
                            </>
                        )}
                    </section>
                )}

                {/* ── TAB: Legal ────────────────────────────────────────────── */}
                {availableTabs.length > 0 && resolvedActiveTab === "legal" && (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {/* Legal notes */}
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 text-sm font-semibold text-slate-800">Legal Notes</h2>
                            {legalNotesQuery.isLoading ? (
                                <p className="text-xs text-slate-400">Loading…</p>
                            ) : (legalNotesQuery.data ?? []).length === 0 ? (
                                <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                    No legal notes on record.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {(legalNotesQuery.data ?? []).map((note) => (
                                        <li
                                            key={note.id}
                                            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                                        >
                                            {note.title ? (
                                                <p className="text-xs font-semibold text-slate-900">
                                                    {note.title}
                                                </p>
                                            ) : null}
                                            <p className="mt-1 text-xs text-slate-700">{note.content}</p>
                                            <div className="mt-1.5 flex items-center justify-between">
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                                    {note.visibilityScope.replace(/_/g, " ")}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {new Date(note.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* Case audit */}
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 text-sm font-semibold text-slate-800">Case Audit (Legal View)</h2>
                            {caseAuditQuery.isLoading ? (
                                <p className="text-xs text-slate-400">Loading…</p>
                            ) : (
                                <AuditEventList items={caseAuditQuery.data ?? []} />
                            )}
                        </section>
                    </div>
                )}

                {/* ── TAB: Timeline ─────────────────────────────────────────── */}
                {availableTabs.length > 0 && resolvedActiveTab === "timeline" && (
                    <div className="grid gap-5 lg:grid-cols-2">
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-slate-800">Case Timeline</h2>
                                <button
                                    type="button"
                                    onClick={() => timelineQuery.refetch()}
                                    className="rounded p-1 text-slate-400 hover:text-slate-600"
                                    title="Refresh timeline"
                                >
                                    <RefreshCw
                                        className={`h-3.5 w-3.5 ${timelineQuery.isFetching ? "animate-spin" : ""}`}
                                    />
                                </button>
                            </div>
                            {timelineQuery.isLoading ? (
                                <p className="text-xs text-slate-400">Loading timeline…</p>
                            ) : (
                                <WorkflowTimeline events={timelineEvents} />
                            )}
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                            <h2 className="mb-3 text-sm font-semibold text-slate-800">Detailed Audit Log</h2>
                            {caseAuditQuery.isLoading ? (
                                <p className="text-xs text-slate-400">Loading…</p>
                            ) : (
                                <AuditEventList items={caseAuditQuery.data ?? []} />
                            )}
                        </section>
                    </div>
                )}
            </AppShell>
        </AuthGuard>
    );
}
