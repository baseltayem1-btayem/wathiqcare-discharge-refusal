"use client";

import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-lg border p-8 text-center">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>

        <h1 className="text-3xl font-bold text-slate-900">{t("home.title")}</h1>
        <p className="mt-3 text-slate-600">{t("home.subtitle")}</p>

        <div className="mt-6 flex gap-3 justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-slate-900 text-white px-5 py-2.5 font-medium"
          >
            {t("home.login")}
          </Link>
          <Link
            href="/cases"
            className="rounded-xl border px-5 py-2.5 font-medium text-slate-700"
          >
            {t("home.cases")}
          </Link>
        </div>
      </div>
    </main>
  );
}
