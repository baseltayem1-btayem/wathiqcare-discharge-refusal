"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, ArrowRight, ClipboardCheck, PlusCircle, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type CaseItem = {
    id: string;
    status?: string | null;
    createdAt?: string | null;
};

export default function DashboardPage() {
    const [cases, setCases] = useState<CaseItem[]>([]);

    useEffect(() => {
        apiFetch<CaseItem[]>("/api/cases?limit=200")
            .then((items) => setCases(Array.isArray(items) ? items : []))
            .catch(() => setCases([]));
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
            </AppShell>
        </AuthGuard>
    );
}
