"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

export default function TermsPage() {
  const { t, lang, isRtl } = useI18n();
  const ArrowBack = isRtl ? ArrowRight : ArrowLeft;

  const sections = [0, 1, 2, 3, 4, 5] as const;

  return (
    <main className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      <div className="h-[3px] bg-gradient-to-r from-teal-600 via-cyan-600 to-cyan-400" />

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
          >
            <ArrowBack className="h-4 w-4" />
            {t("termsPage.backHome")}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-100">
            <FileText className="h-7 w-7 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-cyan-950">{t("termsPage.title")}</h1>
            <p className="text-sm text-slate-400">{t("termsPage.subtitle")}</p>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-700 leading-relaxed">
          {t("termsPage.intro")}
        </div>

        <div className="space-y-6">
          {sections.map((i) => (
            <section key={i}>
              <h2 className="mb-2 text-lg font-bold text-cyan-900">
                {t(`termsPage.sections.${i}.heading`)}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {t(`termsPage.sections.${i}.body`)}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
