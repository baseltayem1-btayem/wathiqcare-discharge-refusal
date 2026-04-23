"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import { useI18n } from "@/i18n/I18nProvider";

export default function DashboardsPage() {
    const { lang } = useI18n();
    const txt = (en: string, ar: string) => (lang === "ar" ? ar : en);

    return (
        <AuthGuard>
            <AppShell
                title={txt("Dashboards", "لوحات المتابعة")}
                subtitle={txt("Operational dashboards for discharge refusal and legal oversight", "لوحات متابعة تشغيلية لرفض الخروج والإشراف القانوني")}
            >
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">{txt("Next Action", "الإجراء التالي")}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-base font-semibold text-slate-900">
                                    {txt("Review high-risk legal queue first", "ابدأ بمراجعة طابور المخاطر القانونية")}
                                </div>
                                <p className="mt-1 text-sm text-slate-600">
                                    {txt(
                                        "Prioritize escalations, missing signatures, and refusal paths before executive monitoring.",
                                        "قدّم التصعيدات ونقص التواقيع ومسارات الرفض قبل المتابعة التنفيذية العامة.",
                                    )}
                                </p>
                            </div>
                            <Link
                                href="/dashboards/legal-risk"
                                className="inline-flex items-center rounded-xl border border-[var(--primary)] bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--primary-hover)]"
                            >
                                {txt("Open Legal Risk Dashboard", "فتح لوحة المخاطر القانونية")}
                            </Link>
                        </CardContent>
                    </Card>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{txt("Legal Risk Dashboard", "لوحة المخاطر القانونية")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-slate-600">
                            <p>
                                {txt(
                                    "Monitor high-risk refusal cases, 24-hour escalation compliance, missing documents, signature gaps, and financial exposure using existing workflow and document data.",
                                    "تابع حالات الرفض عالية الخطورة، والالتزام بالتصعيد خلال 24 ساعة، ونقص المستندات، وفجوات التوقيع، والتعرض المالي باستخدام بيانات سير العمل والمستندات الحالية.",
                                )}
                            </p>
                            <Link
                                href="/dashboards/legal-risk"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                {txt("Open Legal Risk Dashboard", "فتح لوحة المخاطر القانونية")}
                            </Link>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">{txt("Legal & Operational Overview", "النظرة العامة القانونية والتشغيلية")}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-slate-600">
                            <p>
                                {txt(
                                    "Executive view for total cases, finalization readiness, blocked records, missing data alerts, and PDF generation success.",
                                    "عرض تنفيذي لإجمالي الحالات وجاهزية الاعتماد النهائي والحالات المحظورة وتنبيهات نقص البيانات ومعدل نجاح إنشاء PDF.",
                                )}
                            </p>
                            <Link
                                href="/dashboards/legal-operational-overview"
                                className="inline-flex items-center rounded-xl border border-[var(--border)] bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                {txt("Open Executive Overview", "فتح النظرة التنفيذية")}
                            </Link>
                        </CardContent>
                    </Card>
                </div>
                </div>
            </AppShell>
        </AuthGuard>
    );
}
