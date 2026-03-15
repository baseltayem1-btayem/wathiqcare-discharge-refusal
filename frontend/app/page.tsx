import Link from "next/link";
import Image from "next/image";

const FEATURES = [
    {
        icon: "🏥",
        title: "إدارة الخروج الطبي",
        desc: "مسار موحد لتخطيط الخروج من الرفض حتى الموافقة مع توثيق كامل لكل مرحلة.",
    },
    {
        icon: "✍️",
        title: "التوقيع الرقمي",
        desc: "توقيع المريض أو الولي إلكترونياً مع ختم زمني وإثبات رقمي غير قابل للطعن.",
    },
    {
        icon: "⚖️",
        title: "التصعيد القانوني",
        desc: "آلية تصعيد تلقائية متدرجة تضمن حماية المستشفى قانونياً في حالات الرفض.",
    },
    {
        icon: "📋",
        title: "الموافقات المستنيرة",
        desc: "نماذج قانونية معتمدة بالعربية والإنجليزية مع تتبع حالة كل نموذج.",
    },
    {
        icon: "🔔",
        title: "الإشعارات الفورية",
        desc: "إشعارات بريد إلكتروني تلقائية للمريض وفريق الرعاية عند كل إجراء.",
    },
    {
        icon: "🛡️",
        title: "سجل التدقيق",
        desc: "سجل تدقيق شامل وغير قابل للتعديل لكل حدث في مسار القضية.",
    },
];

const STATS = [
    { value: "100%", label: "امتثال للمعايير التنظيمية" },
    { value: "< 2 دقيقة", label: "وقت إنشاء القضية" },
    { value: "24/7", label: "توفر المنصة" },
    { value: "ISO 27001", label: "معيار أمن المعلومات" },
];

export default function HomePage() {
    return (
        <main
            className="min-h-screen"
            style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f4c3a 100%)" }}
            dir="rtl"
        >
            {/* Decorative blobs */}
            <div
                aria-hidden
                className="pointer-events-none fixed inset-0 overflow-hidden"
                style={{ zIndex: 0 }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: "-10%",
                        right: "-5%",
                        width: "500px",
                        height: "500px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
                        filter: "blur(40px)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: "10%",
                        left: "-5%",
                        width: "400px",
                        height: "400px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%)",
                        filter: "blur(40px)",
                    }}
                />
            </div>

            <div className="relative" style={{ zIndex: 1 }}>
                {/* ─── Hero ─── */}
                <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 text-center sm:pt-24">
                    {/* Logo */}
                    <div className="mx-auto mb-8 flex items-center justify-center">
                        <div
                            className="rounded-3xl p-4 shadow-2xl"
                            style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.10)" }}
                        >
                            <Image
                                src="https://cdn.phototourl.com/uploads/2026-03-08-8e081936-6059-4849-a3de-b482e86049fd.png"
                                alt="WathiqCare Logo"
                                width={320}
                                height={100}
                                className="h-auto w-[220px] object-contain sm:w-[280px] lg:w-[320px]"
                                priority
                            />
                        </div>
                    </div>

                    {/* Badge */}
                    <span
                        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest"
                        style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.3)" }}
                    >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        منصة واثق كير الرقمية — الإصدار التجريبي
                    </span>

                    {/* Headline */}
                    <h1
                        className="mx-auto mt-7 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl lg:text-6xl"
                        style={{ color: "#f1f5f9", letterSpacing: "-0.02em" }}
                    >
                        إدارة احترافية لرفض
                        <span style={{ color: "#34d399" }}> الخروج الطبي </span>
                        مع توثيق قانوني شامل
                    </h1>

                    <p
                        className="mx-auto mt-5 max-w-2xl text-base leading-8 sm:text-lg"
                        style={{ color: "#94a3b8" }}
                    >
                        منصة متكاملة تربط الفرق الطبية والقانونية وشؤون المرضى في مسار موحد وآمن، لضمان توثيق التوقيع وحفظ سجل إثبات قابل للمراجعة القانونية.
                    </p>

                    {/* CTA buttons */}
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-emerald-500/30"
                            style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 24px rgba(16,185,129,0.35)" }}
                        >
                            <span>🔐</span>
                            تسجيل الدخول
                        </Link>
                        <Link
                            href="/request-demo"
                            className="inline-flex items-center gap-2 rounded-2xl border px-8 py-3.5 text-sm font-semibold transition-all hover:scale-105"
                            style={{ borderColor: "rgba(255,255,255,0.15)", color: "#e2e8f0", background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}
                        >
                            <span>📩</span>
                            طلب عرض توضيحي
                        </Link>
                    </div>
                </section>

                {/* ─── Stats strip ─── */}
                <section
                    className="mx-auto max-w-4xl px-4 pb-10"
                >
                    <div
                        className="grid grid-cols-2 gap-3 rounded-2xl p-5 sm:grid-cols-4"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                        {STATS.map((s) => (
                            <div key={s.label} className="text-center">
                                <p className="text-2xl font-extrabold" style={{ color: "#34d399" }}>{s.value}</p>
                                <p className="mt-1 text-xs" style={{ color: "#64748b" }}>{s.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ─── Features grid ─── */}
                <section className="mx-auto max-w-5xl px-4 pb-16">
                    <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748b" }}>
                        ما تقدمه المنصة
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map((f) => (
                            <div
                                key={f.title}
                                className="rounded-2xl p-5 transition-all hover:-translate-y-0.5"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}
                            >
                                <span className="text-2xl">{f.icon}</span>
                                <h3 className="mt-3 text-sm font-bold" style={{ color: "#e2e8f0" }}>{f.title}</h3>
                                <p className="mt-1.5 text-xs leading-6" style={{ color: "#64748b" }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ─── Footer ─── */}
                <footer
                    className="border-t px-4 py-6 text-center text-xs"
                    style={{ borderColor: "rgba(255,255,255,0.07)", color: "#475569" }}
                >
                    © {new Date().getFullYear()} WathiqCare — جميع الحقوق محفوظة &nbsp;|&nbsp; نظام موثق وآمن وفق بروتوكولات ISO 27001
                </footer>
            </div>
        </main>
    );
}
