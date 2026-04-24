"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Bell, CheckCircle2, CircleAlert, FileCheck2, ShieldCheck, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";

type RequirementTone = "success" | "danger" | "info";

type RequirementItem = {
    id: number;
    title: string;
    description: string;
    status: string;
    action: string;
    tone: RequirementTone;
};

const REQUIREMENTS: RequirementItem[] = [
    {
        id: 1,
        title: "قرار المريض موثق",
        description: "تم توثيق القرار وربطه بملف الحالة",
        status: "مكتمل",
        action: "عرض التفاصيل",
        tone: "success",
    },
    {
        id: 2,
        title: "الإفصاح عن المخاطر مكتمل",
        description: "يتطلب استكمال الإفصاح عن المخاطر السريرية",
        status: "غير مكتمل",
        action: "إضافة الإفصاح",
        tone: "danger",
    },
    {
        id: 3,
        title: "التوقيع صحيح",
        description: "التحقق من التوقيع وصحة بيانات الموقّع",
        status: "مكتمل",
        action: "عرض التفاصيل",
        tone: "success",
    },
    {
        id: 4,
        title: "التسلسل الزمني مكتمل (Audit Trail)",
        description: "جميع أحداث التدقيق متسلسلة ومتحقق منها",
        status: "مكتمل",
        action: "عرض التفاصيل",
        tone: "info",
    },
    {
        id: 5,
        title: "المستند النهائي تم توليده",
        description: "لم يتم إنشاء الإصدار النهائي بعد",
        status: "غير متوفر",
        action: "توليد المستند النهائي",
        tone: "danger",
    },
];

const TABS = ["نظرة عامة", "المخاطر القانونية", "المهام", "التنبيهات", "التقارير", "المستندات"];

function toneClasses(tone: RequirementTone): {
    row: string;
    icon: string;
    badge: string;
    button: string;
} {
    if (tone === "success") {
        return {
            row: "border-emerald-200 bg-emerald-50/40",
            icon: "text-emerald-600",
            badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
            button: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
        };
    }

    if (tone === "info") {
        return {
            row: "border-sky-200 bg-sky-50/40",
            icon: "text-sky-600",
            badge: "border-sky-200 bg-sky-50 text-sky-700",
            button: "border-sky-200 text-sky-700 hover:bg-sky-50",
        };
    }

    return {
        row: "border-rose-200 bg-rose-50/40",
        icon: "text-rose-600",
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        button: "border-rose-200 text-rose-700 hover:bg-rose-50",
    };
}

export default function DashboardsPage() {
    return (
        <AuthGuard>
            <AppShell title="لوحة المعلومات" subtitle="" actions={null}>
                <div dir="rtl" className="w-full min-w-0 space-y-5 overflow-x-hidden">
                    <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <CardContent className="p-4 md:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                                        <UserCircle2 className="h-4 w-4 text-slate-500" />
                                        مستخدم النظام
                                    </div>
                                    <button
                                        type="button"
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        aria-label="التنبيهات"
                                    >
                                        <Bell className="h-4 w-4" />
                                    </button>
                                </div>

                                <Link
                                    href="/dashboards/legal-risk"
                                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    رجوع إلى اللوحات
                                </Link>
                            </div>

                            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                                <div className="space-y-2">
                                    <div className="text-2xl font-bold text-slate-900">لوحة المعلومات</div>
                                    <Badge variant="success">نشطة</Badge>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                    <div className="font-semibold text-slate-900">#DASH-2025-000123</div>
                                    <div className="mt-1">تاريخ الإنشاء: 20 مايو 2025 - 10:30 ص</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="overflow-x-auto">
                        <div className="inline-flex min-w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                            {TABS.map((tab) => {
                                const active = tab === "نظرة عامة";
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        className={active
                                            ? "inline-flex whitespace-nowrap rounded-xl bg-[#0A2540] px-4 py-2 text-sm font-semibold text-white"
                                            : "inline-flex whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"}
                                    >
                                        {tab}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="min-w-0 space-y-4">
                            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg text-slate-900">الجاهزية القانونية</CardTitle>
                                    <div className="text-sm text-slate-500">Legal Readiness</div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                                        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                            <ShieldCheck className="h-6 w-6" />
                                        </div>
                                        <p className="text-sm leading-7 text-slate-700">
                                            الحالة تكون جاهزة قانونياً عند استكمال جميع المتطلبات أدناه ويمكن الدفاع عنها أمام أي جهة رقابية أو قضائية.
                                        </p>
                                    </div>

                                    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_120px]">
                                        <div className="space-y-2">
                                            <div className="text-sm font-semibold text-slate-900">الحالة الحالية</div>
                                            <div className="text-base font-bold text-rose-700">غير جاهزة قانونياً</div>
                                            <div className="text-sm text-slate-600">3 من 5 متطلبات مكتملة</div>
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div className="h-full w-[60%] rounded-full bg-emerald-500" />
                                            </div>
                                        </div>

                                        <div className="mx-auto inline-flex h-[110px] w-[110px] items-center justify-center rounded-full" style={{ background: "conic-gradient(#10b981 60%, #e2e8f0 0)" }}>
                                            <div className="inline-flex h-[84px] w-[84px] items-center justify-center rounded-full bg-white text-lg font-extrabold text-slate-900">
                                                60%
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg text-slate-900">متطلبات الجاهزية القانونية (3/5 مكتملة)</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {REQUIREMENTS.map((item) => {
                                        const tone = toneClasses(item.tone);
                                        const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "info" ? FileCheck2 : CircleAlert;

                                        return (
                                            <div key={item.id} className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm ${tone.row}`}>
                                                <span className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-bold ${tone.badge}`}>
                                                    {item.id}
                                                </span>

                                                <div className="min-w-0">
                                                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                                                        <Icon className={`h-4 w-4 ${tone.icon}`} />
                                                        <span className="truncate">{item.title}</span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-slate-600">{item.description}</div>
                                                    <div className="mt-1 text-xs font-semibold text-slate-700">{item.status}</div>
                                                </div>

                                                <Button variant="outline" className={`h-9 rounded-xl text-xs ${tone.button}`}>
                                                    {item.action}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="min-w-0 space-y-4">
                            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <CardHeader>
                                    <CardTitle>ماذا أفعل الآن؟</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm text-slate-700">
                                    <p>لجعل الحالة جاهزة قانونياً، أكمل المتطلبات الناقصة الموضحة في القائمة.</p>
                                    <Button className="w-full rounded-xl bg-[#0A2540] text-white hover:bg-[#0b3157]">أكمل الجاهزية</Button>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <CardHeader>
                                    <CardTitle>ملخص سريع</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm text-slate-700">
                                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                        <span>إجمالي المتطلبات</span>
                                        <span className="font-semibold text-slate-900">5</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                        <span>المكتملة</span>
                                        <span className="font-semibold text-emerald-700">3</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                        <span>غير المكتملة</span>
                                        <span className="font-semibold text-rose-700">2</span>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                        <span>نسبة الإنجاز</span>
                                        <span className="font-semibold text-slate-900">60%</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <CardHeader>
                                    <CardTitle>مساعدة</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button variant="outline" className="w-full rounded-xl">عرض دليل الجاهزية</Button>
                                    <Button variant="outline" className="w-full rounded-xl">تواصل مع المستشار القانوني</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </AppShell>
        </AuthGuard>
    );
}
