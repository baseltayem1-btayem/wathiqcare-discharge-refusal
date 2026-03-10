import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export default function Navbar() {
  const { lang } = useI18n();
  const isArabic = lang === "ar";

  return (
    <nav className={`bg-white shadow-sm ${isArabic ? "rtl" : "ltr"}`}>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg"></div>
          <span className="font-bold text-lg">WathiqCare</span>
        </div>

        {/* Menu */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-gray-600 hover:text-gray-900">
            {isArabic ? "المميزات" : "Features"}
          </Link>
          <Link href="#about" className="text-gray-600 hover:text-gray-900">
            {isArabic ? "حول" : "About"}
          </Link>
          <Link href="#contact" className="text-gray-600 hover:text-gray-900">
            {isArabic ? "اتصل" : "Contact"}
          </Link>
        </div>

        {/* CTA */}
        <Link
          href="/login"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          {isArabic ? "الدخول" : "Login"}
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </nav>
  );
}
