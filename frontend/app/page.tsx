import Link from "next/link";
import Image from "next/image";
import type { ComponentType } from "react";
import { ActivitySquare, BellRing, FileCheck2, Gavel, HeartPulse, ShieldCheck } from "lucide-react";

type LandingFeature = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const JOURNEY_STEPS = [
  {
    step: "01",
    title: "تسجيل الحالة",
    description: "توثيق بيانات المريض وقرار الخروج في نموذج موحد متوافق مع السياسة.",
  },
  {
    step: "02",
    title: "تواصل موثّق",
    description: "حفظ كل المحاولات والتدخلات الاجتماعية والطبية مع طابع زمني كامل.",
  },
  {
    step: "03",
    title: "اعتماد وتوقيع",
    description: "إصدار النماذج القانونية وجمع التوقيع الرقمي مع تتبّع الشهود.",
  },
  {
    step: "04",
    title: "تصعيد ذكي",
    description: "تنبيه تلقائي للتصعيد القانوني مع حزمة أدلة جاهزة للمراجعة.",
  },
];

const FEATURES = [
  {
    icon: HeartPulse,
    title: "إدارة الخروج الطبي",
    description: "مسار موحد من قرار الخروج حتى إغلاق الحالة بوضوح تشغيلي كامل.",
  },
  {
    icon: FileCheck2,
    title: "التوقيع الرقمي",
    description: "توقيع إلكتروني موثّق للمريض أو الولي مع إثبات زمني قابل للتدقيق.",
  },
  {
    icon: Gavel,
    title: "التصعيد القانوني",
    description: "تفعيل تصعيد تدريجي تلقائي يحافظ على الالتزام القانوني للمؤسسة.",
  },
  {
    icon: ActivitySquare,
    title: "الموافقات المستنيرة",
    description: "نماذج عربية وإنجليزية جاهزة مع حالة فورية لكل نموذج قانوني.",
  },
  {
    icon: BellRing,
    title: "الإشعارات الفورية",
    description: "تنبيهات آلية للفرق الطبية والقانونية عند كل انتقال في مسار الحالة.",
  },
  {
    icon: ShieldCheck,
    title: "سجل التدقيق",
    description: "سجل أحداث غير قابل للتلاعب يوثق كل قرار وتعديل ضمن القضية.",
  },
] as LandingFeature[];

const STATS = [
  { value: "99.9%", label: "جاهزية تشغيل" },
  { value: "< 90 ثانية", label: "لبدء قضية جديدة" },
  { value: "24/7", label: "مراقبة سير الحالة" },
  { value: "ISO 27001", label: "حوكمة أمن معلومات" },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f2f9fa] text-slate-900" dir="rtl">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-1 absolute -left-24 top-[-120px] h-[340px] w-[340px] rounded-full" />
        <div className="orb-2 absolute -right-20 top-[90px] h-[360px] w-[360px] rounded-full" />
        <div className="orb-3 absolute bottom-[-180px] left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full" />
      </div>

      <div style={{ height: "3px", background: "linear-gradient(90deg, #0ea5a4, #06b6d4, #0ea5a4)" }} />

      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Image
            src="https://cdn.phototourl.com/uploads/2026-03-08-8e081936-6059-4849-a3de-b482e86049fd.png"
            alt="WathiqCare"
            width={180}
            height={56}
            className="h-auto w-[128px] object-contain sm:w-[160px]"
            priority
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/request-demo"
              className="rounded-xl border border-teal-100 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 sm:text-sm"
            >
              طلب عرض
            </Link>
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px] hover:shadow-cyan-500/30 sm:text-sm"
              style={{ background: "linear-gradient(120deg, #0f766e, #0891b2, #06b6d4)" }}
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 pb-12 pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-16 md:pt-16">
        <div className="hero-reveal">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-4 py-1.5 text-xs font-semibold tracking-[0.16em] text-teal-700">
            منصة صحية قانونية متقدمة
          </span>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            تجربة عالمية لإدارة
            <span className="block text-transparent" style={{ backgroundImage: "linear-gradient(120deg, #0f766e, #0891b2)", WebkitBackgroundClip: "text" }}>
              حالات رفض الخروج الطبي
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            واثق كير يجمع الفريق الطبي والقانوني في لوحة عمليات واحدة، مع توثيق شفاف، توقيع رقمي،
            وتنبيهات تصعيد مبنية على الوقت لرفع جودة القرار وتقليل المخاطر.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-2xl px-6 py-3 text-sm font-bold text-white transition hover:translate-y-[-1px]"
              style={{ background: "linear-gradient(120deg, #0f766e, #0891b2, #06b6d4)" }}
            >
              ابدأ الآن
            </Link>
            <Link
              href="/request-demo"
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              استعراض المنصة
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STATS.map((stat, index) => (
              <div key={stat.label} className="hero-reveal rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_24px_rgba(12,74,110,0.08)]" style={{ animationDelay: `${0.14 + index * 0.08}s` }}>
                <p className="text-2xl font-extrabold text-cyan-700">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-reveal" style={{ animationDelay: "0.16s" }}>
          <div className="relative overflow-hidden rounded-[28px] border border-teal-100 bg-white p-5 shadow-[0_20px_50px_rgba(8,145,178,0.18)] sm:p-6">
            <div className="absolute -left-10 top-16 h-24 w-24 rounded-full bg-cyan-100/60" />
            <div className="absolute -bottom-16 -right-8 h-40 w-40 rounded-full bg-teal-100/60" />

            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Care Command Center</p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">لوحة مراقبة لحظية لمسار الحالة</h2>

              <div className="mt-5 space-y-3">
                {JOURNEY_STEPS.map((item) => (
                  <div key={item.step} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700">{item.step}</span>
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 md:px-8">
        <div className="rounded-3xl border border-cyan-100 bg-white/85 p-5 shadow-[0_14px_40px_rgba(8,145,178,0.12)] md:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Workflow Snapshot</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900">خط زمني تشغيلي داخل الإطار دائمًا</h3>
            </div>
            <p className="max-w-lg text-sm leading-7 text-slate-600">
              التصميم التالي يعتمد شبكة مرنة تتكيّف تلقائيًا مع عرض الشاشة، من الجوال حتى الشاشات الكبيرة، دون خروج أي عنصر عن حدود النافذة.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {JOURNEY_STEPS.map((item, index) => (
              <article key={`timeline-${item.step}`} className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-500" />
                <span className="text-xs font-bold text-teal-700">المرحلة {item.step}</span>
                <h4 className="mt-2 text-base font-semibold text-slate-900">{item.title}</h4>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
                {index < JOURNEY_STEPS.length - 1 ? <div className="mt-3 h-px w-full bg-gradient-to-l from-cyan-300 to-transparent" /> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Core Platform</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">مصمم وفق معايير منتجات الصحة الرقمية العالمية</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className="hero-reveal group rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-cyan-200" style={{ animationDelay: `${0.16 + index * 0.07}s` }}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25">
                  <Icon className="h-5 w-5" />
                </span>
                <h4 className="mt-4 text-lg font-bold text-slate-900">{feature.title}</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-white/70 bg-white/80 px-4 py-6 text-center text-xs text-slate-500 md:px-8">
        © {new Date().getFullYear()} WathiqCare | تصميم وتجربة تشغيل وفق أفضل ممارسات SaaS للقطاع الصحي.
      </footer>

      <style jsx>{`
        .hero-reveal {
          animation: rise 0.7s ease both;
        }

        .orb-1,
        .orb-2,
        .orb-3 {
          filter: blur(52px);
        }

        .orb-1 {
          background: rgba(8, 145, 178, 0.25);
          animation: drift 10s ease-in-out infinite;
        }

        .orb-2 {
          background: rgba(13, 148, 136, 0.2);
          animation: drift 12s ease-in-out infinite reverse;
        }

        .orb-3 {
          background: rgba(34, 211, 238, 0.2);
          animation: drift 14s ease-in-out infinite;
        }

        @keyframes rise {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes drift {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          50% {
            transform: translateY(-14px) translateX(10px);
          }
        }
      `}</style>
    </main>
  );
}
