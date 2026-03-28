import AppShell from "@/components/AppShell";
import Link from "next/link";

export default function DashboardPage() {
    return (
        <AppShell title="لوحة التحكم">
            <div className="p-8 max-w-4xl mx-auto">
                <h2 className="text-3xl font-extrabold mb-2 text-cyan-900 tracking-tight">مرحباً بك في منصة وثيق كير</h2>
                <p className="mb-8 text-slate-600 text-lg">ابدأ بإدارة حالات رفض الخروج الطبي، التوثيق القانوني، والأرشفة من مكان واحد.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <div className="rounded-2xl border bg-white shadow p-6 flex flex-col items-center">
                        <span className="text-4xl font-bold text-cyan-700 mb-2">2</span>
                        <span className="text-slate-700 font-semibold">حالات نشطة</span>
                    </div>
                    <div className="rounded-2xl border bg-white shadow p-6 flex flex-col items-center">
                        <span className="text-4xl font-bold text-emerald-600 mb-2">1</span>
                        <span className="text-slate-700 font-semibold">جاهزة للإغلاق</span>
                    </div>
                    <div className="rounded-2xl border bg-white shadow p-6 flex flex-col items-center">
                        <span className="text-4xl font-bold text-amber-500 mb-2">0</span>
                        <span className="text-slate-700 font-semibold">تحتاج تدخل قانوني</span>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <h3 className="text-xl font-bold text-cyan-900">نظرة عامة على الحالات</h3>
                    <Link href="/cases" className="px-6 py-3 rounded-xl bg-cyan-700 text-white font-semibold shadow hover:bg-cyan-800 transition">
                        الذهاب إلى الحالات
                    </Link>
                </div>
                <div className="rounded-xl border bg-white shadow p-6 text-slate-600 text-center">
                    لا توجد حالات جديدة اليوم. يمكنك البدء بإضافة أو مراجعة الحالات من خلال القائمة.
                </div>
            </div>
        </AppShell>
    );
}
