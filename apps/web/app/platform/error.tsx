"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

type PlatformErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PlatformError({ reset }: PlatformErrorProps) {
  const { lang } = useI18n();
  const txt = (en: string, ar: string) => (lang === "ar" ? ar : en);

  return (
    <div className="mx-auto my-10 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-amber-900">{txt("Platform section is temporarily unavailable", "قسم المنصة غير متاح مؤقتًا")}</h2>
      <p className="mt-2 text-sm text-amber-800">
        {txt("A temporary issue occurred while loading this page. You can retry safely without leaving the portal.", "حدثت مشكلة مؤقتة أثناء تحميل هذه الصفحة. يمكنك إعادة المحاولة بأمان دون مغادرة البوابة.")}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          {txt("Retry section", "إعادة المحاولة")}
        </button>
        <Link
          href="/platform"
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          {txt("Open platform overview", "فتح نظرة عامة على المنصة")}
        </Link>
      </div>
    </div>
  );
}
