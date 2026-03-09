"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FilePlus2, FolderKanban, Rocket, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  status?: string;
};

type LaunchStatus = {
  goNoGo: boolean;
  metrics: {
    recentErrors: number;
    pendingDocuments: number;
  };
};

export default function DashboardPage() {
  const { t } = useI18n();
  const [caseCount, setCaseCount] = useState<number>(0);
  const [launch, setLaunch] = useState<LaunchStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      apiFetch<CaseItem[]>("/api/cases"),
      apiFetch<LaunchStatus>("/api/launch/status"),
    ]).then((results) => {
      if (!mounted) {
        return;
      }

      const [casesResult, launchResult] = results;

      if (casesResult.status === "fulfilled") {
        setCaseCount(Array.isArray(casesResult.value) ? casesResult.value.length : 0);
      }

      if (launchResult.status === "fulfilled") {
        setLaunch(launchResult.value);
      }

      if (casesResult.status === "rejected" && launchResult.status === "rejected") {
        setError("Unable to load dashboard data right now.");
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const quickLinks = useMemo(
    () => [
      { href: "/cases", label: t("nav.cases"), icon: <FolderKanban className="h-4 w-4" /> },
      { href: "/cases/new", label: t("nav.newCase"), icon: <FilePlus2 className="h-4 w-4" /> },
      { href: "/launch-status", label: t("nav.launchStatus"), icon: <Rocket className="h-4 w-4" /> },
      { href: "/admin", label: t("nav.admin"), icon: <ShieldCheck className="h-4 w-4" /> },
    ],
    [t],
  );

  return (
    <AuthGuard>
      <AppShell
        title={t("nav.dashboard")}
        subtitle="Operational overview and quick navigation"
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <div className="inline-flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Total Cases</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{caseCount}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Pending Documents</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{launch?.metrics.pendingDocuments ?? 0}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Launch Decision</p>
            <p className={launch?.goNoGo ? "mt-2 text-2xl font-semibold text-emerald-700" : "mt-2 text-2xl font-semibold text-rose-700"}>
              {launch ? (launch.goNoGo ? "GO" : "NO-GO") : "-"}
            </p>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 p-4">
          <h2 className="text-base font-semibold text-slate-900">Quick Navigation</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        {launch ? (
          <section className="mt-6 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
            Recent critical errors (24h): <span className="font-semibold">{launch.metrics.recentErrors}</span>
          </section>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
