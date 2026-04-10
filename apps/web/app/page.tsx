
"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  FileText,
  Clock,
  BarChart3,
  Link2,
  CheckCircle2,
  ChevronLeft,
  Users,
  Building2,
  Lock,
  Stethoscope,
} from "lucide-react";

// ─── Data ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Clock,
    title: "إدارة سير العمل السريري",
    desc: "تسجيل أوامر الخروج الطبية، رصد رفض المريض، والتحقق من رموز ICD-11 في الوقت الفعلي.",
  },
  {
    icon: Shield,
    title: "التصعيد القانوني التلقائي",
    desc: "توليد ملفات قانونية آلية مع جداول زمنية للتصعيد خلال 24 / 48 / 72 ساعة.",
  },
  {
    icon: FileText,
    title: "نماذج رفض رقمية",
    desc: "نماذج رفض الخروج مع شهادة الشهود والتوقيع الإلكتروني الموثّق.",
  },
  {
    icon: Link2,
    title: "تكامل EMR / FHIR",
    desc: "واجهات FHIR R4 قابلة للتوصيل مع أنظمة السجلات الطبية الإلكترونية الحالية.",
  },
  {
    icon: BarChart3,
    title: "لوحة تحكم وتقارير",
    desc: "مؤشرات الأداء الرئيسية، تقارير الامتثال، وإحصاءات حالات رفض الخروج.",
  },
  {
    icon: Lock,
    title: "أمان وامتثال PDPL",
    desc: "سجل مراجعة غير قابل للتعديل، تشفير البيانات، والامتثال الكامل لنظام حماية البيانات السعودي.",
  },
];

const STATS = [
  { value: "100%", label: "امتثال PDPL" },
  { value: "24/7", label: "متاح على مدار الساعة" },
  { value: "< 2 دق", label: "متوسط وقت التوثيق" },
  { value: "ICD-11", label: "تحقق تشخيصي آني" },
];

const HOW_IT_WORKS = [
  {
    step: "١",
    title: "تسجيل الحالة",
    desc: "يُدخل الطبيب أمر الخروج الطبي ويُسجّل رفض المريض مباشرةً في النظام.",
  },
  {
    step: "٢",
    title: "توليد الوثائق",
    desc: "النظام يولّد نموذج رفض الخروج بتوقيع إلكتروني وتأكيد الشهود فورياً.",
  },
  {
    step: "٣",
    title: "التصعيد القانوني",
    desc: "في حال استمر الرفض، يُطلق النظام دورة التصعيد القانوني الآلي مع إشعارات الفريق.",
  },
  {
    step: "٤",
    title: "الأرشفة والتقارير",
    desc: "جميع الأحداث محفوظة في سجل مراجعة مُؤمَّن قابل للتدقيق في أي وقت.",
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function NavBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="WathiqCare" width={36} height={36} />
          <span className="text-lg font-bold text-cyan-900">واثق كير</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600 font-medium">
          <a href="#features" className="hover:text-cyan-700 transition">المميزات</a>
          <a href="#how" className="hover:text-cyan-700 transition">كيف يعمل</a>
          <a href="#demo" className="hover:text-cyan-700 transition">النسخة التجريبية</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold text-cyan-700 hover:text-cyan-900 transition px-4 py-2 rounded-lg hover:bg-cyan-50"
          >
            دخول المشتركين
          </Link>
          <Link
            href="/request-demo"
            className="text-sm font-semibold bg-cyan-700 text-white px-4 py-2 rounded-lg hover:bg-cyan-800 transition shadow-sm"
          >
            طلب تجربة
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-cyan-50 via-white to-slate-100" dir="rtl">
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
        <span className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-800 text-xs font-semibold px-4 py-1.5 rounded-full border border-cyan-200">
          <Stethoscope size={14} />
          متوافق مع نظام PDPL السعودي ومعايير الاعتماد الصحي
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-cyan-950 leading-tight">
          منصة إدارة رفض الخروج الطبي
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
          واثق كير — نظام متكامل يُساعد المنشآت الصحية على توثيق رفض الخروج الطبي، التصعيد القانوني، والامتثال التنظيمي بسرعة وأمان.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Link
            href="/request-demo"
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-cyan-700 text-white text-base font-bold shadow-lg hover:bg-cyan-800 transition"
          >
            طلب نسخة تجريبية مجانية
            <ChevronLeft size={18} />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-cyan-700 text-base font-bold border border-cyan-200 shadow hover:bg-cyan-50 transition"
          >
            دخول المشتركين
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="bg-cyan-800 py-10 px-6" dir="rtl">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-extrabold text-white">{s.value}</div>
            <div className="text-cyan-200 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-6 bg-white" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-cyan-950 mb-3">مميزات المنصة</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            كل ما تحتاجه المنشأة الصحية لإدارة حالات رفض الخروج بشكل قانوني وموثّق
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border border-slate-100 bg-slate-50 hover:shadow-md hover:border-cyan-200 transition group">
              <div className="w-11 h-11 rounded-xl bg-cyan-100 flex items-center justify-center mb-4 group-hover:bg-cyan-700 transition">
                <Icon size={22} className="text-cyan-700 group-hover:text-white transition" />
              </div>
              <h3 className="font-bold text-cyan-900 text-base mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how" className="py-20 px-6 bg-gradient-to-br from-slate-50 to-cyan-50" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-cyan-950 mb-3">كيف يعمل النظام؟</h2>
          <p className="text-slate-500 text-lg">أربع خطوات بسيطة من التسجيل إلى الأرشفة القانونية</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {HOW_IT_WORKS.map(({ step, title, desc }) => (
            <div key={step} className="flex gap-5 p-6 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-cyan-700 text-white flex items-center justify-center text-xl font-extrabold">
                {step}
              </div>
              <div>
                <h3 className="font-bold text-cyan-900 text-base mb-1">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhoIsItForSection() {
  const profiles = [
    { icon: Stethoscope, title: "الأطباء والأطقم الطبية", desc: "توثيق فوري لأوامر الخروج وردود فعل المريض دون أعباء إدارية." },
    { icon: Building2, title: "المنشآت الصحية", desc: "حماية قانونية كاملة، تقارير دقيقة، وامتثال تلقائي للوائح الصحية." },
    { icon: Users, title: "فرق القانون والامتثال", desc: "سجل مراجعة شامل وغير قابل للتعديل لدعم أي ملف قانوني." },
  ];
  return (
    <section className="py-20 px-6 bg-white" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-cyan-950 mb-3">لمن هذه المنصة؟</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {profiles.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center p-8 rounded-2xl border border-slate-100 bg-slate-50 hover:shadow-md transition">
              <div className="w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-4">
                <Icon size={26} className="text-cyan-700" />
              </div>
              <h3 className="font-bold text-cyan-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComplianceSection() {
  const items = [
    "نظام حماية البيانات الشخصية PDPL",
    "معايير الاعتماد الصحي السعودي CBAHI",
    "معيار HL7 FHIR R4",
    "ICD-11 للتشخيصات الطبية",
    "تشفير البيانات AES-256",
    "سجل مراجعة SHA-256 غير قابل للتعديل",
  ];
  return (
    <section className="py-16 px-6 bg-cyan-900" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-white mb-2">الامتثال والمعايير الدولية</h2>
          <p className="text-cyan-200 text-sm">المنصة مُصممة وفق أعلى معايير الأمان والامتثال التنظيمي</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-3 bg-cyan-800/60 rounded-xl px-4 py-3 border border-cyan-700">
              <CheckCircle2 size={18} className="text-cyan-300 flex-shrink-0" />
              <span className="text-white text-sm font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section id="demo" className="py-20 px-6 bg-gradient-to-br from-cyan-50 to-slate-100" dir="rtl">
      <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
        <h2 className="text-3xl font-extrabold text-cyan-950">ابدأ بالنسخة التجريبية المجانية</h2>
        <p className="text-slate-600 text-lg leading-relaxed">
          سجّل بيانات منشأتك وسيتواصل معك فريق واثق كير لتقديم عرض توضيحي مخصص وتفعيل النسخة التجريبية.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            href="/request-demo"
            className="flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-cyan-700 text-white text-base font-bold shadow-lg hover:bg-cyan-800 transition"
          >
            طلب نسخة تجريبية
            <ChevronLeft size={18} />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-white text-cyan-700 text-base font-bold border border-cyan-200 shadow hover:bg-cyan-50 transition"
          >
            دخول المشتركين
          </Link>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          للتواصل المباشر:{" "}
          <a href="mailto:demo@wathiqcare.online" className="text-cyan-600 underline">
            demo@wathiqcare.online
          </a>
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 py-10 px-6" dir="rtl">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="WathiqCare" width={32} height={32} />
          <span className="text-white font-bold text-base">واثق كير</span>
        </div>
        <nav className="flex flex-wrap justify-center gap-6 text-slate-400 text-sm">
          <a href="#features" className="hover:text-white transition">المميزات</a>
          <a href="#how" className="hover:text-white transition">كيف يعمل</a>
          <a href="#demo" className="hover:text-white transition">النسخة التجريبية</a>
          <Link href="/login" className="hover:text-white transition">دخول المشتركين</Link>
          <a href="mailto:demo@wathiqcare.online" className="hover:text-white transition">تواصل معنا</a>
        </nav>
        <p className="text-slate-500 text-xs">
          جميع الحقوق محفوظة © {new Date().getFullYear()} WathiqCare
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <NavBar />
      <HeroSection />
      <StatsBar />
      <FeaturesSection />
      <HowItWorksSection />
      <WhoIsItForSection />
      <ComplianceSection />
      <DemoSection />
      <Footer />
    </>
  );
}
