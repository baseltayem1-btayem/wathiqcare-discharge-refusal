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
                                className="inline-flex items-center rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 font-medium text-cyan-800 hover:bg-cyan-100"
                            >
                                {txt("Open Legal Risk Dashboard", "فتح لوحة المخاطر القانونية")}
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </AppShell>
        </AuthGuard>
    );
}
