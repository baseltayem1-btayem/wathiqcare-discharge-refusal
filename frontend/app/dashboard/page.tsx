"use client";

import Link from "next/link";
import { ArrowRight, ClipboardCheck, PlusCircle, Search } from "lucide-react";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatusBadge from "@/components/hospital/StatusBadge";
import { useAuthSession } from "@/lib/hooks/use-auth";
import { useCasesQuery } from "@/lib/hooks/use-cases";
import {
    useCasesSummaryQuery,
    useLegalEscalationsQuery,
    useReportsDashboardQuery,
    useTasksOverdueQuery,
} from "@/lib/hooks/use-reports";

type RoleCard = {
    role: string;
    title: string;
    subtitle: string;
    value: number;
};

function roleCardCatalog(input: {
    openCases: number;
    inProgressCases: number;
    escalatedCases: number;
    overdueTasks: number;
    legalEscalations: number;
}) {
    const { openCases, inProgressCases, escalatedCases, overdueTasks, legalEscalations } = input;

    const cards: RoleCard[] = [
        {
            role: "nurse",
            title: "Nurse View",
            subtitle: "Open patient discharge-refusal cases",
            value: openCases,
        },
        {
            role: "physician",
            title: "Physician View",
            subtitle: "In-progress medical discharge decisions",
            value: inProgressCases,
        },
        {
            role: "patient_relations",
            title: "Patient Relations View",
            subtitle: "Overdue follow-up tasks",
            value: overdueTasks,
        },
        {
            role: "social_work",
            title: "Social Work View",
            subtitle: "Cases currently requiring intervention",
            value: inProgressCases,
        },
        {
            role: "finance",
            title: "Finance View",
            subtitle: "Escalated cases with financial impact",
            value: escalatedCases,
        },
        {
            role: "legal",
            title: "Legal View",
            subtitle: "Legal escalations requiring review",
            value: legalEscalations,
        },
        {
            role: "admin",
            title: "Admin View",
            subtitle: "Total active operational load",
            value: openCases + inProgressCases + escalatedCases,
        },
    ];

    return cards;
}

export default function DashboardPage() {
    const { user, hasAnyPermission, hasRole } = useAuthSession();

    const canReadDashboard = hasAnyPermission(["reports.dashboard", "cases.read"]);
    const canReadCasesSummary = hasAnyPermission(["reports.cases_summary"]);
    const canReadOverdue = hasAnyPermission(["reports.tasks_overdue"]);
    const canReadLegalEscalations = hasAnyPermission(["reports.legal_escalations"]);

    const dashboardQuery = useReportsDashboardQuery(canReadDashboard);
    const summaryQuery = useCasesSummaryQuery(canReadCasesSummary);
    const overdueQuery = useTasksOverdueQuery(canReadOverdue);
    const legalEscalationsQuery = useLegalEscalationsQuery(canReadLegalEscalations);

    const recentCasesQuery = useCasesQuery({ page: 1, pageSize: 8 }, hasAnyPermission(["cases.read"]));

    const metrics = {
        openCases: dashboardQuery.data?.openCases || 0,
        inProgressCases: dashboardQuery.data?.inProgressCases || 0,
        escalatedCases: dashboardQuery.data?.escalatedCases || 0,
        closedCases: dashboardQuery.data?.closedCases || 0,
        overdueTasks: dashboardQuery.data?.overdueTasks || 0,
        legalEscalations: legalEscalationsQuery.data?.length || 0,
    };

    const roleCards = roleCardCatalog(metrics).filter((card) => hasRole(card.role));

    return (
        <AuthGuard>
            <AppShell
                title="لوحة التحكم التشغيلية | Operational Dashboard"
                subtitle="Hospital-grade refusal workflow visibility powered by backend-nest reports"
            >
                <section className="grid gap-4 md:grid-cols-3">
                    <Link
                        href="/cases/new"
                        className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                    >
                        <div className="inline-flex items-center gap-2 text-slate-900">
                            <PlusCircle className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-base font-semibold">Create Case</h2>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">Start a real refusal-of-discharge case.</p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                            Open form <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                    </Link>

                    <Link
                        href="/cases"
                        className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                    >
                        <div className="inline-flex items-center gap-2 text-slate-900">
                            <ClipboardCheck className="h-5 w-5 text-blue-600" />
                            <h2 className="text-base font-semibold">Case Worklist</h2>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">Open, triage, and process live backend cases.</p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                            View list <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                    </Link>

                    <Link
                        href="/archive"
                        className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
                    >
                        <div className="inline-flex items-center gap-2 text-slate-900">
                            <Search className="h-5 w-5 text-amber-600" />
                            <h2 className="text-base font-semibold">Archive & Evidence</h2>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">Review exported bundles and historical records.</p>
                        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                            Open archive <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                    </Link>
                </section>

                <section className="mt-5 grid gap-3 sm:grid-cols-5">
                    {[
                        { label: "Open", value: metrics.openCases },
                        { label: "In Progress", value: metrics.inProgressCases },
                        { label: "Escalated", value: metrics.escalatedCases },
                        { label: "Closed", value: metrics.closedCases },
                        { label: "Overdue Tasks", value: metrics.overdueTasks },
                    ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs text-slate-500">{item.label}</p>
                            <p className="mt-1 text-xl font-bold text-slate-900">{item.value}</p>
                        </div>
                    ))}
                </section>

                {dashboardQuery.isLoading ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Loading live dashboard metrics...
                    </div>
                ) : null}

                {dashboardQuery.error ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {dashboardQuery.error.message}
                    </div>
                ) : null}

                <section className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h3 className="text-sm font-semibold text-slate-900">Role-sensitive operational cards</h3>
                        <p className="mt-1 text-xs text-slate-500">Visible cards are restricted by your role assignments.</p>

                        {roleCards.length === 0 ? (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                                No role-specific cards are available for current profile.
                            </div>
                        ) : (
                            <div className="mt-3 grid gap-2">
                                {roleCards.map((card) => (
                                    <div key={card.role} className="rounded-xl border border-slate-200 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-900">{card.title}</p>
                                            <p className="text-lg font-bold text-slate-900">{card.value}</p>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-600">{card.subtitle}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h3 className="text-sm font-semibold text-slate-900">Recent live cases</h3>
                        <p className="mt-1 text-xs text-slate-500">Sourced from backend-nest case management endpoints.</p>

                        {recentCasesQuery.isLoading ? (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                Loading recent cases...
                            </div>
                        ) : recentCasesQuery.error ? (
                            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {recentCasesQuery.error.message}
                            </div>
                        ) : recentCasesQuery.data && recentCasesQuery.data.items.length > 0 ? (
                            <ul className="mt-3 space-y-2">
                                {recentCasesQuery.data.items.slice(0, 6).map((item) => (
                                    <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">{item.caseNumber}</p>
                                                <p className="text-xs text-slate-500">{item.currentStageCode || "Not assigned"}</p>
                                            </div>
                                            <StatusBadge value={item.status} />
                                        </div>
                                        <div className="mt-2">
                                            <Link
                                                href={`/cases/${item.id}`}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                                            >
                                                Open details <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                                No cases found in live backend data.
                            </div>
                        )}
                    </div>
                </section>

                <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Operational report snapshots</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-xs text-slate-500">Cases summary groups</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{summaryQuery.data?.length || 0}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-xs text-slate-500">Tasks overdue rows</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{overdueQuery.data?.length || 0}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-3">
                            <p className="text-xs text-slate-500">Legal escalation rows</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{legalEscalationsQuery.data?.length || 0}</p>
                        </div>
                    </div>
                    {user ? (
                        <p className="mt-3 text-xs text-slate-500">
                            Signed in as {user.fullName || user.email} ({user.roles.join(", ") || "no-role"})
                        </p>
                    ) : null}
                </section>
            </AppShell>
        </AuthGuard>
    );
}
