"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRightLeft, ChevronDown, Filter, RefreshCw, Siren, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import {
    hasOperationsAssignmentPermission,
    hasOperationsEscalationPermission,
    hasOperationsStepPermission,
} from "@/lib/operations/permissions";
import { apiFetch } from "@/utils/api";

const DEPARTMENTS = [
    "PHARMACY",
    "NURSING",
    "LEGAL",
    "LABORATORY",
    "RADIOLOGY",
    "CASE_MANAGEMENT",
    "PATIENT_RELATIONS",
    "BILLING_INSURANCE",
    "ADMIN_MEDICAL_DIRECTOR",
] as const;

type InboxItem = {
    caseId: string;
    caseNumber?: string | null;
    title?: string | null;
    patientName?: string | null;
    currentStage: string;
    currentStep: string;
    assignedDepartment: string;
    assignedDepartmentLabel?: string;
    status: string;
    priority: string;
    slaState: string;
    escalationLevel: string;
    waitingTimeMinutes: number;
    assignedTo?: { id: string; fullName: string; role: string } | null;
    timeToSlaMinutes: number | null;
};

type InboxPayload = {
    department: string;
    label: string;
    analytics: {
        agingBuckets: Array<{ bucket: string; count: number }>;
        breachTrend: Array<{ day: string; breaches: number; escalations: number }>;
    };
    summary: {
        total: number;
        overdue: number;
        atRisk: number;
        unassigned: number;
    };
    items: InboxItem[];
};

type AuthMeResponse = {
    platformRole?: string | null;
    claims?: {
        role?: string;
        platform_role?: string | null;
    };
    user?: {
        role?: string | null;
    } | null;
};

export default function OperationsInboxesPage() {
    const [department, setDepartment] = useState<(typeof DEPARTMENTS)[number]>("CASE_MANAGEMENT");
    const [statusFilter, setStatusFilter] = useState("all");
    const [assignedFilter, setAssignedFilter] = useState("all");
    const [refreshKey, setRefreshKey] = useState(0);
    const [payload, setPayload] = useState<InboxPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [platformRole, setPlatformRole] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
    const [activeMode, setActiveMode] = useState<"assign" | "step" | null>(null);
    const [actionBusyCaseId, setActionBusyCaseId] = useState<string | null>(null);
    const [assignDepartment, setAssignDepartment] = useState<(typeof DEPARTMENTS)[number]>("CASE_MANAGEMENT");
    const [assignPriority, setAssignPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "CRITICAL">("NORMAL");
    const [actionReason, setActionReason] = useState("");
    const [stepAction, setStepAction] = useState<"step_completed" | "step_returned" | "delay_detected" | "sla_breached" | "escalation_triggered" | "case_closed">("step_completed");
    const [stageCode, setStageCode] = useState("CASE_CREATED");
    const [stepCode, setStepCode] = useState("case_created");
    const [nextDepartment, setNextDepartment] = useState<(typeof DEPARTMENTS)[number]>("CASE_MANAGEMENT");
    const [assignToUserId, setAssignToUserId] = useState<string | null>(null);
    const [deptUsers, setDeptUsers] = useState<Array<{ id: string; fullName: string; role: string }>>([]);
    const [deptUsersLoading, setDeptUsersLoading] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        const { signal } = controller;

        const qs = new URLSearchParams();
        if (statusFilter !== "all") qs.set("status", statusFilter);
        if (assignedFilter !== "all") qs.set("assigned", assignedFilter);

        Promise.all([
            apiFetch<InboxPayload>(`/api/operations/inbox/${department}?${qs.toString()}`, { signal }),
            apiFetch<AuthMeResponse>("/api/auth/me", { signal, cache: "no-store" }),
        ])
            .then(([data, me]) => {
                setPayload(data);
                setUserRole(me.user?.role ?? me.claims?.role ?? null);
                setPlatformRole(me.platformRole ?? me.claims?.platform_role ?? null);
            })
            .catch(() => {
                setPayload(null);
            })
            .finally(() => {
                if (!signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [department, statusFilter, assignedFilter, refreshKey]);

    // Fetch assignable users whenever the assign panel is open or the target dept changes
    useEffect(() => {
        if (activeMode !== "assign" || !activeCaseId) return;
        let cancelled = false;
        setDeptUsersLoading(true);
        setDeptUsers([]);
        apiFetch<Array<{ id: string; fullName: string; role: string }>>(
            `/api/operations/members?department=${assignDepartment}`,
        )
            .then((users) => { if (!cancelled) setDeptUsers(users); })
            .catch(() => { if (!cancelled) setDeptUsers([]); })
            .finally(() => { if (!cancelled) setDeptUsersLoading(false); });
        return () => { cancelled = true; };
    }, [activeMode, activeCaseId, assignDepartment]);

    const sortedItems = useMemo(() => {
        const items = payload?.items ?? [];
        return [...items].sort((a, b) => {
            if (a.slaState !== b.slaState) {
                return a.slaState === "BREACHED" ? -1 : b.slaState === "BREACHED" ? 1 : a.slaState === "AT_RISK" ? -1 : 1;
            }
            return b.waitingTimeMinutes - a.waitingTimeMinutes;
        });
    }, [payload]);

    const canAssign = useMemo(
        () => hasOperationsAssignmentPermission(userRole, platformRole),
        [platformRole, userRole],
    );

    const canRunSteps = useMemo(
        () => hasOperationsStepPermission(userRole, platformRole),
        [platformRole, userRole],
    );

    const canEscalate = useMemo(
        () => hasOperationsEscalationPermission(userRole, platformRole),
        [platformRole, userRole],
    );

    const maxAgingCount = useMemo(
        () => Math.max(1, ...(payload?.analytics.agingBuckets.map((item) => item.count) ?? [1])),
        [payload],
    );

    const maxTrendCount = useMemo(
        () => Math.max(
            1,
            ...(payload?.analytics.breachTrend.flatMap((item) => [item.breaches, item.escalations]) ?? [1]),
        ),
        [payload],
    );

    function openActionPanel(item: InboxItem, mode: "assign" | "step") {
        setActiveCaseId(item.caseId);
        setActiveMode(mode);
        setAssignDepartment((item.assignedDepartment as (typeof DEPARTMENTS)[number]) || department);
        setAssignPriority((item.priority as "LOW" | "NORMAL" | "HIGH" | "CRITICAL") || "NORMAL");
        setActionReason("");
        setStageCode(item.currentStage || "CASE_CREATED");
        setStepCode(item.currentStep || "case_created");
        setStepAction("step_completed");
        setNextDepartment((item.assignedDepartment as (typeof DEPARTMENTS)[number]) || department);
        setAssignToUserId(null);
        setDeptUsers([]);
    }

    async function handleAssign(caseId: string) {
        setActionBusyCaseId(caseId);
        setInfoMessage("");
        setErrorMessage("");

        try {
            await apiFetch(`/api/operations/cases/${caseId}/assign`, {
                method: "POST",
                body: JSON.stringify({
                    toDepartment: assignDepartment,
                    toUserId: assignToUserId || undefined,
                    priority: assignPriority,
                    reason: actionReason.trim() || undefined,
                }),
            });
            // Optimistic local update — row refreshes without full table reload
            setPayload((prev) => {
                if (!prev) return prev;
                const pickedUser = assignToUserId
                    ? deptUsers.find((u) => u.id === assignToUserId) ?? null
                    : null;
                return {
                    ...prev,
                    items: prev.items.map((it) => {
                        if (it.caseId !== caseId) return it;
                        return {
                            ...it,
                            assignedDepartment: assignDepartment,
                            assignedDepartmentLabel: assignDepartment.replaceAll("_", " "),
                            priority: assignPriority,
                            ...(pickedUser && {
                                assignedTo: { id: pickedUser.id, fullName: pickedUser.fullName, role: pickedUser.role },
                            }),
                        };
                    }),
                };
            });
            setInfoMessage("Case reassigned from inbox queue.");
            setActiveCaseId(null);
            setActiveMode(null);
            setRefreshKey((value) => value + 1);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to reassign case.");
        } finally {
            setActionBusyCaseId(null);
        }
    }

    async function handleStep(
        caseId: string,
        actionOverride?: "escalation_triggered",
        overrides?: {
            stageCode?: string;
            stepCode?: string;
            nextDepartment?: (typeof DEPARTMENTS)[number];
            reason?: string;
        },
    ) {
        const resolvedAction = actionOverride ?? stepAction;

        setActionBusyCaseId(caseId);
        setInfoMessage("");
        setErrorMessage("");

        try {
            await apiFetch(`/api/operations/cases/${caseId}/step`, {
                method: "POST",
                body: JSON.stringify({
                    action: resolvedAction,
                    stageCode: overrides?.stageCode ?? stageCode,
                    stepCode: overrides?.stepCode ?? stepCode,
                    nextDepartment: overrides?.nextDepartment ?? (resolvedAction === "escalation_triggered" ? "ADMIN_MEDICAL_DIRECTOR" : nextDepartment),
                    reason: (overrides?.reason ?? actionReason.trim()) || undefined,
                }),
            });
            // Optimistic local update — patch the row immediately
            setPayload((prev) => {
                if (!prev) return prev;
                const resolvedStage = overrides?.stageCode ?? stageCode;
                const resolvedStep = overrides?.stepCode ?? stepCode;
                return {
                    ...prev,
                    items: prev.items.map((it) => {
                        if (it.caseId !== caseId) return it;
                        return {
                            ...it,
                            currentStage: resolvedStage,
                            currentStep: resolvedStep,
                            ...(resolvedAction === "escalation_triggered" && {
                                escalationLevel: "ESCALATED",
                                slaState: "BREACHED",
                            }),
                        };
                    }),
                };
            });
            setInfoMessage(resolvedAction === "escalation_triggered" ? "Case escalated from inbox queue." : "Step action recorded from inbox queue.");
            setActiveCaseId(null);
            setActiveMode(null);
            setRefreshKey((value) => value + 1);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to record step action.");
        } finally {
            setActionBusyCaseId(null);
        }
    }

    return (
        <AuthGuard>
            <AppShell
                title="Department Inboxes"
                subtitle="Operational queues with SLA, assignment, and waiting-time visibility"
            >
                <div className="space-y-4">
                    {errorMessage ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {errorMessage}
                        </div>
                    ) : null}

                    {infoMessage ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {infoMessage}
                        </div>
                    ) : null}

                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="grid gap-3 md:grid-cols-4">
                            <select
                                value={department}
                                onChange={(event) => {
                                    setLoading(true);
                                    setDepartment(event.target.value as (typeof DEPARTMENTS)[number]);
                                }}
                                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            >
                                {DEPARTMENTS.map((item) => (
                                    <option key={item} value={item}>
                                        {item.replaceAll("_", " ")}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={assignedFilter}
                                onChange={(event) => {
                                    setLoading(true);
                                    setAssignedFilter(event.target.value);
                                }}
                                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            >
                                <option value="all">All ownership</option>
                                <option value="assigned">Assigned only</option>
                                <option value="unassigned">Unassigned only</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(event) => {
                                    setLoading(true);
                                    setStatusFilter(event.target.value);
                                }}
                                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            >
                                <option value="all">All statuses</option>
                                <option value="OPEN">Open</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="CLOSED">Closed</option>
                            </select>

                            <button
                                type="button"
                                onClick={() => {
                                    setLoading(true);
                                    setRefreshKey((value) => value + 1);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Refresh
                            </button>
                        </div>
                    </section>

                    {payload ? (
                        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <article className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-xs text-slate-500">Queue size</p>
                                <p className="mt-1 text-xl font-bold text-slate-900">{payload.summary.total}</p>
                            </article>
                            <article className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                                <p className="text-xs text-rose-600">Overdue</p>
                                <p className="mt-1 text-xl font-bold text-rose-700">{payload.summary.overdue}</p>
                            </article>
                            <article className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs text-amber-700">At risk</p>
                                <p className="mt-1 text-xl font-bold text-amber-800">{payload.summary.atRisk}</p>
                            </article>
                            <article className="rounded-xl border border-slate-200 bg-white p-3">
                                <p className="text-xs text-slate-500">Unassigned</p>
                                <p className="mt-1 text-xl font-bold text-slate-900">{payload.summary.unassigned}</p>
                            </article>
                        </section>
                    ) : null}

                    {payload ? (
                        <section className="grid gap-4 xl:grid-cols-2">
                            <article className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-sm font-semibold text-slate-900">Workload aging</h2>
                                        <p className="text-xs text-slate-500">Current queue age distribution for {payload.label}</p>
                                    </div>
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                </div>
                                <div className="mt-4 space-y-3">
                                    {payload.analytics.agingBuckets.map((bucket) => (
                                        <div key={bucket.bucket} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs text-slate-600">
                                                <span>{bucket.bucket}</span>
                                                <span>{bucket.count} cases</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-slate-100">
                                                <div
                                                    className="h-2 rounded-full bg-cyan-500"
                                                    style={{ width: bucket.count === 0 ? "0%" : `${Math.max(10, (bucket.count / maxAgingCount) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>

                            <article className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-sm font-semibold text-slate-900">Breach trend</h2>
                                        <p className="text-xs text-slate-500">Recorded breaches and escalations over the last 7 days</p>
                                    </div>
                                    <Siren className="h-4 w-4 text-rose-500" />
                                </div>
                                <div className="mt-4 grid grid-cols-7 gap-2">
                                    {payload.analytics.breachTrend.map((point) => {
                                        const total = point.breaches + point.escalations;

                                        return (
                                            <div key={point.day} className="flex flex-col items-center gap-2">
                                                <div className="flex h-28 w-full items-end justify-center gap-1 rounded-xl bg-slate-50 px-2 py-2">
                                                    <div
                                                        className="w-3 rounded-full bg-rose-400"
                                                        style={{ height: point.breaches === 0 ? "0%" : `${Math.max(8, (point.breaches / maxTrendCount) * 100)}%` }}
                                                        title={`Breaches: ${point.breaches}`}
                                                    />
                                                    <div
                                                        className="w-3 rounded-full bg-amber-400"
                                                        style={{ height: point.escalations === 0 ? "0%" : `${Math.max(8, (point.escalations / maxTrendCount) * 100)}%` }}
                                                        title={`Escalations: ${point.escalations}`}
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[11px] font-semibold text-slate-700">{point.day.slice(5)}</p>
                                                    <p className="text-[10px] text-slate-500">{total} total</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </article>
                        </section>
                    ) : null}

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">{payload?.label || "Department queue"}</h2>
                                <p className="text-xs text-slate-500">Prioritized by SLA urgency and waiting time</p>
                            </div>
                            <div className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <Filter className="h-3.5 w-3.5" />
                                Live queue
                            </div>
                        </div>

                        {loading ? (
                            <div className="px-4 py-10 text-center text-sm text-slate-500">Loading queue...</div>
                        ) : sortedItems.length === 0 ? (
                            <div className="px-4 py-10 text-center text-sm text-slate-500">No cases in this queue.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Case</th>
                                            <th className="px-3 py-2 text-left">Patient</th>
                                            <th className="px-3 py-2 text-left">Stage</th>
                                            <th className="px-3 py-2 text-left">Owner</th>
                                            <th className="px-3 py-2 text-left">SLA</th>
                                            <th className="px-3 py-2 text-left">Waiting</th>
                                            <th className="px-3 py-2 text-left">Escalation</th>
                                            <th className="px-3 py-2 text-left">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedItems.flatMap((item) => [
                                            <tr key={`${item.caseId}-row`} className="border-t border-slate-100 align-top">
                                                <td className="px-3 py-2">
                                                    <Link href={`/cases/${item.caseId}`} className="font-semibold text-cyan-700 hover:text-cyan-800">
                                                        {item.caseNumber || item.caseId.slice(0, 8)}
                                                    </Link>
                                                    <p className="text-xs text-slate-500">{item.title || "Untitled case"}</p>
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">{item.patientName || "-"}</td>
                                                <td className="px-3 py-2">
                                                    <p className="text-slate-700">{item.currentStage}</p>
                                                    <p className="text-xs text-slate-500">{item.currentStep}</p>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {item.assignedTo ? (
                                                        <div>
                                                            <p className="font-medium text-slate-800">{item.assignedTo.fullName}</p>
                                                            <p className="text-xs text-slate-500">{item.assignedTo.role}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                                            <Users className="h-3 w-3" /> Unassigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${item.slaState === "BREACHED"
                                                            ? "bg-rose-100 text-rose-700"
                                                            : item.slaState === "AT_RISK"
                                                                ? "bg-amber-100 text-amber-700"
                                                                : "bg-emerald-100 text-emerald-700"
                                                            }`}
                                                    >
                                                        {item.slaState}
                                                    </span>
                                                    <p className="mt-1 text-xs text-slate-500">{item.timeToSlaMinutes ?? "-"} min to SLA</p>
                                                </td>
                                                <td className="px-3 py-2 text-slate-700">{item.waitingTimeMinutes} min</td>
                                                <td className="px-3 py-2 text-slate-700">{item.escalationLevel}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex flex-wrap gap-2">
                                                        {canAssign ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openActionPanel(item, "assign")}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                            >
                                                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                                                Assign
                                                            </button>
                                                        ) : null}
                                                        {canRunSteps ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openActionPanel(item, "step")}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                            >
                                                                <ChevronDown className="h-3.5 w-3.5" />
                                                                Step
                                                            </button>
                                                        ) : null}
                                                        {canEscalate ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    void handleStep(item.caseId, "escalation_triggered", {
                                                                        stageCode: item.currentStage,
                                                                        stepCode: item.currentStep,
                                                                        nextDepartment: "ADMIN_MEDICAL_DIRECTOR",
                                                                    });
                                                                }}
                                                                disabled={actionBusyCaseId === item.caseId}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                                            >
                                                                <Siren className="h-3.5 w-3.5" />
                                                                Escalate
                                                            </button>
                                                        ) : null}
                                                        {!canAssign && !canRunSteps && !canEscalate ? (
                                                            <span className="text-xs text-slate-400">View only</span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>,
                                            activeCaseId === item.caseId && activeMode ? (
                                                <tr key={`${item.caseId}-panel`} className="border-t border-slate-100 bg-slate-50/70">
                                                    <td colSpan={9} className="px-4 py-3">
                                                        {activeMode === "assign" ? (
                                                            <div className="grid gap-2 md:grid-cols-[1fr_1.2fr_1fr_2fr_auto]">
                                                                {/* Dept picker — drives the user list */}
                                                                <select
                                                                    value={assignDepartment}
                                                                    onChange={(event) => {
                                                                        setAssignDepartment(event.target.value as (typeof DEPARTMENTS)[number]);
                                                                        setAssignToUserId(null);
                                                                    }}
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                                >
                                                                    {DEPARTMENTS.map((value) => (
                                                                        <option key={value} value={value}>
                                                                            {value.replaceAll("_", " ")}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {/* Assignee picker — populated from /api/operations/members */}
                                                                <select
                                                                    value={assignToUserId ?? ""}
                                                                    onChange={(event) => setAssignToUserId(event.target.value || null)}
                                                                    disabled={deptUsersLoading}
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
                                                                >
                                                                    <option value="">— Dept. only —</option>
                                                                    {deptUsers.map((u) => (
                                                                        <option key={u.id} value={u.id}>
                                                                            {u.fullName}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <select
                                                                    value={assignPriority}
                                                                    onChange={(event) => setAssignPriority(event.target.value as "LOW" | "NORMAL" | "HIGH" | "CRITICAL")}
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                                >
                                                                    <option value="LOW">LOW</option>
                                                                    <option value="NORMAL">NORMAL</option>
                                                                    <option value="HIGH">HIGH</option>
                                                                    <option value="CRITICAL">CRITICAL</option>
                                                                </select>
                                                                <input
                                                                    value={actionReason}
                                                                    onChange={(event) => setActionReason(event.target.value)}
                                                                    placeholder="Reason for reassignment"
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        void handleAssign(item.caseId);
                                                                    }}
                                                                    disabled={actionBusyCaseId === item.caseId}
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
                                                                >
                                                                    {actionBusyCaseId === item.caseId ? "Saving..." : "Apply"}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_1fr_2fr_auto]">
                                                                <input
                                                                    value={stageCode}
                                                                    onChange={(event) => setStageCode(event.target.value)}
                                                                    placeholder="Stage code"
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                                />
                                                                <input
                                                                    value={stepCode}
                                                                    onChange={(event) => setStepCode(event.target.value)}
                                                                    placeholder="Step code"
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                                />
                                                                <select
                                                                    value={stepAction}
                                                                    onChange={(event) => setStepAction(event.target.value as "step_completed" | "step_returned" | "delay_detected" | "sla_breached" | "escalation_triggered" | "case_closed")}
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                                >
                                                                    <option value="step_completed">step_completed</option>
                                                                    <option value="step_returned">step_returned</option>
                                                                    <option value="delay_detected">delay_detected</option>
                                                                    <option value="sla_breached">sla_breached</option>
                                                                    <option value="case_closed">case_closed</option>
                                                                </select>
                                                                <select
                                                                    value={nextDepartment}
                                                                    onChange={(event) => setNextDepartment(event.target.value as (typeof DEPARTMENTS)[number])}
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                                >
                                                                    {DEPARTMENTS.map((value) => (
                                                                        <option key={value} value={value}>
                                                                            {value.replaceAll("_", " ")}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <input
                                                                    value={actionReason}
                                                                    onChange={(event) => setActionReason(event.target.value)}
                                                                    placeholder="Reason or note"
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        void handleStep(item.caseId);
                                                                    }}
                                                                    disabled={actionBusyCaseId === item.caseId}
                                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white disabled:opacity-60"
                                                                >
                                                                    {actionBusyCaseId === item.caseId ? "Saving..." : "Apply"}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ) : null,
                                        ])}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </AppShell>
        </AuthGuard>
    );
}
