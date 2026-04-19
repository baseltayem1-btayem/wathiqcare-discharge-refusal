"use client";

import { useI18n } from "@/i18n/I18nProvider";

export default function GlobalError() {
  const { lang } = useI18n();
  const txt = (en: string, ar: string) => (lang === "ar" ? ar : en);

  return (
    <html lang={lang === "ar" ? "ar" : "en"} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body className="bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">{txt("Application recovered from a fatal error", "تمت استعادة التطبيق بعد خطأ جسيم")}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {txt("A safe fallback was rendered to prevent a blank screen. Reload the page to continue.", "تم عرض وضع آمن بديل لمنع ظهور شاشة فارغة. أعد تحميل الصفحة للمتابعة.")}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {txt("Reload application", "إعادة تحميل التطبيق")}
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}