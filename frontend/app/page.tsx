import Link from "next/link";

export default function HomePage() {
    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100">
            <section className="border-b border-slate-200 bg-white/90">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div className="text-lg font-semibold text-slate-900">WathiqCare</div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/request-demo"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                            طلب عرض
                        </Link>
                        <Link
                            href="/login"
                            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
                        >
                            تسجيل الدخول
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
                <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                    <div>
                        <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                            منصة موثّق كير
                        </p>
                        <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
                            إدارة رقمية متكاملة لإقرار الخروج الطبي ورفضه مع توثيق قانوني كامل
                        </h1>
                        <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
                            الصفحة التمهيدية قبل الدخول عادت للعمل. يمكنك متابعة الدخول إلى النظام أو طلب عرض توضيحي.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link
                                href="/login"
                                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                الدخول إلى النظام
                            </Link>
                            <Link
                                href="/request-demo"
                                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                طلب عرض توضيحي
                            </Link>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-900">ميزات أساسية</h2>
                        <ul className="mt-4 grid gap-3 text-sm text-slate-700">
                            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">الموافقة المستنيرة والإقرار المالي</li>
                            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">إرسال إشعارات البريد الإلكتروني للمريض</li>
                            <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">سجلات تدقيق وإثباتات قابلة للمراجعة</li>
                        </ul>
                    </div>
                </div>
            </section>
        </main>
    );
}
