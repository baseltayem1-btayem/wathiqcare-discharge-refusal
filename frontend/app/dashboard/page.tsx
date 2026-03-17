"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowRight, ClipboardCheck, PlusCircle, Rocket, Search, TrendingUp } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  status?: string | null;
  createdAt?: string | null;
};

type SystemModule = {
  name: string;
  description: string;
  enabled: boolean;
};

type SystemInspectData = {
  status: "healthy" | "degraded";
  api: { title: string; version: string; inspected_at: string };
  database: { reachable: boolean; error: string | null };
  modules: SystemModule[];
  integrations: Record<string, { enabled: boolean; description: string }>;
};

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [launch, setLaunch] = useState<SystemInspectData | null>(null);
  const [launchLoading, setLaunchLoading] = useState(true);
  const [launchError, setLaunchError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    apiFetch<CaseItem[]>("/api/cases?limit=200", { signal })
      .then((items) => setCases(Array.isArray(items) ? items : []))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setCases([]);
      });

    apiFetch<SystemInspectData>("/api/system/inspect", { signal })
      .then((data) => {
        setLaunch(data);
        setLaunchError(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setLaunchError(true);
      })
      .finally(() => {
        if (!signal.aborted) {
          setLaunchLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const stats = useMemo(() => {
    const total = cases.length;
    const open = cases.filter((item) => (item.status || "").toUpperCase() === "OPEN").length;
    const closed = cases.filter((item) => (item.status || "").toUpperCase() === "CLOSED").length;
    return { total, open, closed };
  }, [cases]);

  return (
    <AuthGuard>
      <AppShell
        title="لوحة التحكم | Dashboard"
        subtitle="ابدأ بسرعة: تسجيل قضية جديدة، إدارة قضية مسجلة، أو البحث في الأرشيف"
      >
        <section className="grid gap-4 md:grid-cols-3">
          <Link
            href="/cases/new"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="inline-flex items-center gap-2 text-slate-900">
              <PlusCircle className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold">تسجيل قضية جديدة</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">إنشاء ملف الحالة وبدء مسار التخطيط للخروج.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              فتح النموذج <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link
            href="/cases"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="inline-flex items-center gap-2 text-slate-900">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold">اتخاذ إجراء على قضية مسجلة</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">استعراض القضايا المفتوحة واستكمال الإجراءات.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
              عرض القضايا <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>

          <Link
            href="/archive"
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
          >
            <div className="inline-flex items-center gap-2 text-slate-900">
              <Archive className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-semibold">البحث في الأرشيف</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">الوصول السريع للحالات السابقة مع البحث بالاسم أو رقم الملف.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-700">
              فتح الأرشيف <Search className="h-3.5 w-3.5" />
            </span>
          </Link>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">إجمالي القضايا</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">القضايا المفتوحة</p>
            <p className="mt-1 text-xl font-bold text-blue-700">{stats.open}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs text-slate-500">الحالات المؤرشفة/المغلقة</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{stats.closed}</p>
          </div>
        </section>

        {launchLoading ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Loading system health...
          </div>
        ) : launchError ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            System health check unavailable. <Link href="/launch-status" className="underline">View Launch Status</Link>
          </div>
        ) : launch ? (
          <div
            className={`mt-6 rounded-2xl border p-4 ${launch.status === "healthy"
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
              }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg p-2 ${launch.status === "healthy" ? "bg-emerald-600" : "bg-amber-500"
                    }`}
                >
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3
                    className={`text-sm font-semibold ${launch.status === "healthy" ? "text-emerald-900" : "text-amber-900"
                      }`}
                  >
                    {launch.api.title} v{launch.api.version} - {launch.status === "healthy" ? "Healthy" : "Degraded"}
                  </h3>
                  <p
                    className={`mt-0.5 text-xs ${launch.status === "healthy" ? "text-emerald-700" : "text-amber-700"
                      }`}
                  >
                    DB {launch.database.reachable ? "reachable" : "unreachable"} · {launch.modules.filter((m) => m.enabled).length}/{launch.modules.length} modules active · Inspected at {new Date(launch.api.inspected_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Link
                href="/launch-status"
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${launch.status === "healthy"
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  }`}
              >
                <Rocket className="h-3.5 w-3.5" />
                Launch Status
              </Link>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {launch.modules.map((mod) => (
                <div
                  key={mod.name}
                  className="flex items-center justify-between rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-xs"
                >
                  <span className="text-slate-700">{mod.description}</span>
                  <span className={mod.enabled ? "font-medium text-emerald-700" : "font-medium text-slate-400"}>
                    {mod.enabled ? "Active" : "Off"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
