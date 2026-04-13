import Link from "next/link";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";

export default function DashboardsPage() {
    return (
        <AuthGuard>
            <AppShell title="Dashboards" subtitle="Operational dashboards for discharge refusal and legal oversight">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Legal Risk Dashboard</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-slate-600">
                            <p>
                                Monitor high-risk refusal cases, 24-hour escalation compliance, missing documents, signature gaps,
                                and financial exposure using existing workflow and document data.
                            </p>
                            <Link
                                href="/dashboards/legal-risk"
                                className="inline-flex items-center rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 font-medium text-cyan-800 hover:bg-cyan-100"
                            >
                                Open Legal Risk Dashboard
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </AppShell>
        </AuthGuard>
    );
}
