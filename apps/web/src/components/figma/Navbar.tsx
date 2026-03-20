import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Navbar() {
  const { t, isRtl } = useI18n();

  return (
    <nav className={`sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm ${isRtl ? "rtl" : "ltr"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg shadow-md flex items-center justify-center">
              <span className="text-xs font-bold text-white">WC</span>
            </div>
            <span className="font-bold text-lg text-slate-900">{t("app.name")}</span>
          </div>

          {/* Spacer for large screens */}
          <div className="hidden md:flex flex-1 justify-center" />

          {/* CTA & Language */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition"
            >
              {t("homePage.enterSystem")}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
