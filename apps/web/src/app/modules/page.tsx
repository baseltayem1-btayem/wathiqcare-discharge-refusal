"use client";

import Link from "next/link";
import { useState } from "react";

type Lang = "en" | "ar";

const modules = [
  {
    eyebrowEn: "ENTERPRISE PHYSICIAN WORKSPACE",
    eyebrowAr: "مساحة عمل الطبيب المؤسسية",
    titleEn: "Informed Consents",
    titleAr: "الموافقات المستنيرة",
    descriptionEn:
      "Approved consent library, patient journey, procedure selection, anesthesia review, education, physician approval, and secure patient signing.",
    descriptionAr:
      "مكتبة موافقات معتمدة، رحلة المريض، اختيار الإجراء، مراجعة التخدير، التثقيف، اعتماد الطبيب، والتوقيع الآمن للمريض.",
    statusEn: "Production Active",
    statusAr: "الإنتاج مفعل",
    href: "/modules/informed-consents",
    tagsEn: ["Doctor Workspace", "Consent Journey", "Secure Signing"],
    tagsAr: ["مساحة الطبيب", "رحلة الموافقة", "توقيع آمن"],
    accent: "from-[#003b7a] to-[#2d9cdb]",
  },
  {
    eyebrowEn: "PATIENT REFUSAL DOCUMENTATION",
    eyebrowAr: "توثيق رفض المريض",
    titleEn: "Discharge Refusal",
    titleAr: "منصة رفض الخروج",
    descriptionEn:
      "Structured medico-legal documentation for discharge against medical advice, patient acknowledgment, and evidence trail.",
    descriptionAr:
      "توثيق طبي قانوني منظم لحالات الخروج خلافاً للنصيحة الطبية، إقرار المريض، وسجل الأدلة.",
    statusEn: "Active",
    statusAr: "مفعل",
    href: "/modules/discharge-refusal",
    tagsEn: ["Case File", "Patient Signature", "Legal Record"],
    tagsAr: ["ملف الحالة", "توقيع المريض", "سجل قانوني"],
    accent: "from-[#003b7a] to-[#2d9cdb]",
  },
  {
    eyebrowEn: "FINANCIAL UNDERTAKING WORKFLOW",
    eyebrowAr: "مسار التعهدات المالية",
    titleEn: "Promissory Notes",
    titleAr: "السندات لأمر والتعهدات المالية",
    descriptionEn:
      "Controlled legal workflow for undertakings, case tracking, approvals, supporting documents, OTP signing, and PDF evidence.",
    descriptionAr:
      "مسار قانوني منضبط للتعهدات المالية، متابعة الحالات، الاعتمادات، المستندات الداعمة، التوقيع برمز التحقق، وأدلة PDF.",
    statusEn: "Active",
    statusAr: "مفعل",
    href: "/modules/promissory-notes/enterprise",
    tagsEn: ["Legal Review", "Finance", "Approval"],
    tagsAr: ["مراجعة قانونية", "المالية", "الاعتماد"],
    accent: "from-[#073763] via-[#b08d2c] to-[#d6b85a]",
},
];

function t(lang: Lang, en: string, ar: string) {
  return lang === "ar" ? ar : en;
}

export default function ModulesPage() {
  const [lang, setLang] = useState<Lang>("en");
  const isAr = lang === "ar";

  return (
    <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-[#eef6fa] text-[#002b5c]">
      <section className="bg-gradient-to-br from-[#002b5c] via-[#073763] to-[#0f4c81] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-16">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <span className="rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm font-bold">
              {t(lang, "WathiqCare Enterprise Workspace", "مساحة عمل WathiqCare المؤسسية")}
            </span>

            <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setLang("ar")}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  isAr ? "bg-white text-[#002b5c]" : "text-white/80 hover:bg-white/10"
                }`}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  !isAr ? "bg-white text-[#002b5c]" : "text-white/80 hover:bg-white/10"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-center">
            <div>
              <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight md:text-7xl">
                {t(lang, "Modules Command Center", "مركز قيادة الوحدات")}
              </h1>
              <p className="mt-6 max-w-3xl text-xl leading-9 text-blue-50">
                {t(
                  lang,
                  "Unified healthcare legal modules designed for clinical governance, traceability, speed, and controlled production workflows.",
                  "وحدات قانونية صحية موحدة مصممة للحوكمة السريرية، التتبع، السرعة، ومسارات الإنتاج المنضبطة."
                )}
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-4xl font-black">3</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-blue-100">
                    {t(lang, "Modules", "وحدات")}
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black">24/7</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-blue-100">
                    {t(lang, "Access", "وصول")}
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-black">IMC</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-blue-100">
                    {t(lang, "Governance", "حوكمة")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-14">
        <div className="grid gap-7 lg:grid-cols-3">
          {modules.map((module) => (
            <article
              key={module.href}
              className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className={`h-2 bg-gradient-to-r ${module.accent}`} />

              <div className="p-8">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.28em] text-[#1f75d6]">
                      {t(lang, module.eyebrowEn, module.eyebrowAr)}
                    </p>
                    <h2 className="mt-4 text-3xl font-black text-[#002b5c]">
                      {t(lang, module.titleEn, module.titleAr)}
                    </h2>
                  </div>

                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                    {t(lang, module.statusEn, module.statusAr)}
                  </span>
                </div>
<p className="min-h-[120px] text-lg leading-8 text-slate-600">
                  {t(lang, module.descriptionEn, module.descriptionAr)}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {(isAr ? module.tagsAr : module.tagsEn).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  href={module.href}
                  className="mt-8 flex items-center justify-between rounded-2xl bg-[#f1f8fc] px-5 py-4 font-black text-[#002b5c] transition hover:bg-[#dff0fb]"
                >
                  <span>{t(lang, "Open Workspace", "فتح مساحة العمل")}</span>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#002b5c] text-white transition group-hover:scale-105">
                    {isAr ? "←" : "→"}
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <footer className="mt-10 text-sm font-medium text-slate-500">
          {t(lang, "Secured by WathiqCare", "مؤمّن بواسطة WathiqCare")}
        </footer>
      </section>
    </main>
  );
}



