"use client";

import { useRouter, usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  className?: string;
  variant?: "light" | "sidebar";
};

export default function LanguageSwitcher({ className = "", variant = "light" }: Props) {
  const { lang, setLang, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const isSidebar = variant === "sidebar";

  function switchLang(next: "ar" | "en") {
    setLang(next);
    // Set persistence cookie
    if (typeof document !== "undefined") {
      document.cookie = `wathiqcare_lang=${next};path=/;max-age=31536000;SameSite=Lax`;
    }
    // If on a locale-prefixed route, navigate between locales
    if (pathname) {
      const matched = pathname.match(/^\/(ar|en)(\/.*)?$/);
      if (matched) {
        const rest = matched[2] || "";
        router.push(`/${next}${rest}`);
        return;
      }
    }
    // Non-prefixed route: just update state (dashboard, etc.)
  }

  return (
    <div
      className={
        `${isSidebar
          ? "inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2 py-1 text-white"
          : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1"} ${className}`.trim()
      }
    >
      <span className={isSidebar ? "inline-flex items-center gap-1 text-xs font-medium text-white" : "inline-flex items-center gap-1 text-xs font-medium text-slate-600"}>
        <Languages className="h-3.5 w-3.5" />
        {t("language.label")}
      </span>
      <div className={isSidebar ? "inline-flex items-center rounded-lg border border-white/20 bg-white/5 p-0.5" : "inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5"}>
        <button
          type="button"
          onClick={() => switchLang("en")}
          className={
            lang === "en"
              ? isSidebar
                ? "rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[#0A2540]"
                : "rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white"
              : isSidebar
                ? "rounded-md px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10"
                : "rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          }
          aria-label={t("language.english")}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => switchLang("ar")}
          className={
            lang === "ar"
              ? isSidebar
                ? "rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-[#0A2540]"
                : "rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white"
              : isSidebar
                ? "rounded-md px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10"
                : "rounded-md px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          }
          aria-label={t("language.arabic")}
        >
          عربي
        </button>
      </div>
    </div>
  );
}
