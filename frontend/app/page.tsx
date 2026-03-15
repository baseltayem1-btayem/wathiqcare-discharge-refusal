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
      style={{ background: "linear-gradient(160deg, #f0fdff 0%, #f5f7fa 50%, #e0f2fe 100%)" }}
      dir="rtl"
    >
      {/* Top accent bar */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #0891b2, #06b6d4, #0891b2)" }} />

      {/* ── Nav bar ── */}
      <header
        className="sticky top-0 z-20 px-6 py-3"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Image
            src="https://cdn.phototourl.com/uploads/2026-03-08-8e081936-6059-4849-a3de-b482e86049fd.png"
            alt="WathiqCare"
            width={160}
            height={48}
            className="h-auto w-[130px] object-contain"
            priority
          />
          <div className="flex items-center gap-3">
            <Link
              href="/request-demo"
              className="rounded-lg border px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              style={{ borderColor: "#cbd5e1" }}
            >
              طلب عرض
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: "#0891b2" }}
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-16 text-center sm:pt-24">
        {/* Logo card */}
        <div className="mx-auto mb-8 flex justify-center">
          <div
            className="rounded-3xl p-5"
            style={{
              background: "#ffffff",
              boxShadow: "0 8px 32px rgba(8,145,178,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              border: "1px solid #e0f2fe",
            }}
          >
            <Image
              src="https://cdn.phototourl.com/uploads/2026-03-08-8e081936-6059-4849-a3de-b482e86049fd.png"
              alt="WathiqCare Logo"
              width={360}
              height={110}
              className="h-auto w-[200px] object-contain sm:w-[270px] lg:w-[340px]"
              priority
            />
          </div>
        </div>

        {/* Badge */}
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider"
          style={{ background: "#ecfeff", color: "#0e7490", border: "1px solid #a5f3fc" }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#0891b2" }}
          />
          منصة واثق كير الرقمية — نظام إدارة رفض الخروج الطبي
        </span>

        {/* Headline */}
        <h1 className="mx-auto mt-7 max-w-3xl text-3xl font-extrabold leading-snug tracking-tight text-gray-900 sm:text-5xl">
          إدارة احترافية لرفض{" "}
          <span style={{ color: "#0891b2" }}>الخروج الطبي</span>{" "}
          مع توثيق قانوني شامل
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
          منصة متكاملة تربط الفرق الطبية والقانونية وشؤون المرضى في مسار موحد وآمن،
          لضمان توثيق التوقيع وحفظ سجل إثبات قابل للمراجعة القانونية.
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg"
            style={{
              background: "linear-gradient(135deg, #0891b2, #06b6d4)",
              boxShadow: "0 4px 16px rgba(8,145,178,0.30)",
            }}
          >
            🔐 تسجيل الدخول
          </Link>
          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2 rounded-xl border px-8 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-white hover:shadow-md"
            style={{ borderColor: "#cbd5e1", background: "rgba(255,255,255,0.7)" }}
          >
            📩 طلب عرض توضيحي
          </Link>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="mx-auto max-w-4xl px-4 pb-10">
        <div
          className="grid grid-cols-2 gap-3 rounded-2xl p-5 sm:grid-cols-4"
          style={{
            background: "#ffffff",
            border: "1px solid #e0f2fe",
            boxShadow: "0 2px 12px rgba(8,145,178,0.06)",
          }}
        >
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold" style={{ color: "#0891b2" }}>
                {s.value}
              </p>
              <p className="mt-1 text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
          ما تقدمه المنصة
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 text-sm font-bold text-gray-900">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-6 text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="border-t px-4 py-6 text-center text-xs text-gray-400"
        style={{ borderColor: "#e2e8f0", background: "#ffffff" }}
      >
        © {new Date().getFullYear()} WathiqCare — جميع الحقوق محفوظة &nbsp;|&nbsp;
        نظام موثق وآمن وفق بروتوكولات ISO 27001
      </footer>
    </main>
  );
}
