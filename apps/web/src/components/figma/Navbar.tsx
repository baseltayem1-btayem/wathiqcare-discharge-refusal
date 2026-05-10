import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Navbar() {
  const { t, isRtl } = useI18n();

  return (
    <nav className={`sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm ${isRtl ? "rtl" : "ltr"}`}
      style={{ minHeight: "0" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-between min-h-[92px] md:min-h-[88px] lg:min-h-[96px]"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 min-h-[72px]">
            <div
              className="flex items-center justify-center rounded-lg shadow-md bg-gradient-to-br from-blue-600 to-cyan-500"
              style={{ width: "80px", height: "80px", maxHeight: "82px" }}
            >
              <span className="text-2xl font-bold text-white" style={{ lineHeight: 1 }}>WC</span>
            </div>
            <span className="font-bold text-2xl md:text-xl text-slate-900 flex items-center" style={{lineHeight:1}}>
              {t("app.name")}
            </span>
          </div>

          {/* Spacer for large screens */}
          <div className="hidden md:flex flex-1 justify-center" />

          {/* CTA & Language */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-700 text-white text-base font-semibold rounded-lg hover:bg-blue-800 transition min-h-[48px]"
              style={{ lineHeight: 1, height: "auto" }}
            >
              {t("homePage.enterSystem")}
              <ArrowUpRight size={18} color="#fff" />
            </Link>
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 768px) {
          nav > div > div {
            min-height: 72px !important;
          }
          .logo-container {
            min-height: 56px !important;
          }
        }
        @media (max-width: 480px) {
          nav > div > div {
            min-height: 56px !important;
            padding-top: 8px;
            padding-bottom: 8px;
          }
          .logo-container {
            min-height: 48px !important;
          }
        }
      `}</style>
    </nav>
  );
}
