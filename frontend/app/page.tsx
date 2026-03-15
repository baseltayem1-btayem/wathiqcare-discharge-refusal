import Link from "next/link";

export default function HomePage() {
    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100">
            <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-10 lg:p-14">
                    <div className="mx-auto max-w-4xl text-center">
                        <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-800 sm:text-sm">
                            منصة واثق كير الرقمية
                        </p>

                        <div className="mt-6">
                            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
                                WathiqCare
                            </h1>
                            <p className="mt-2 text-xl font-bold text-slate-700 sm:text-2xl">واثق كير</p>
                        </div>

                        <h2 className="mt-8 text-2xl font-bold leading-tight text-slate-900 sm:text-4xl">
                            إدارة احترافية لموافقات المرضى والإقرارات المالية مع توثيق قانوني شامل
                        </h2>

                        <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                            منصة متكاملة تربط الفرق الطبية والقانونية وشؤون المرضى في مسار موحد وآمن،
                            لضمان إرسال الإقرار للمريض، توثيق التوقيع، وحفظ سجل إثبات قابل للمراجعة.
                        </p>

                        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href="/login"
                                className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                            >
                                تسجيل الدخول
                            </Link>
                            <Link
                                href="/request-demo"
                                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                طلب عرض توضيحي
                            </Link>
                        </div>

                        <div className="mt-10 grid gap-3 text-start sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                                الموافقات المستنيرة والإقرارات المالية
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                                إرسال إشعارات البريد الإلكتروني للمريض
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                                سجل تدقيق وإثباتات رقمية موثقة
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
