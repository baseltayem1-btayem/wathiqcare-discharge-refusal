import Link from "next/link";
import { Facebook, Twitter, Linkedin, Mail } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export default function Footer() {
  const { lang } = useI18n();
  const isArabic = lang === "ar";

  return (
    <footer className={`bg-gray-900 text-white ${isArabic ? "rtl" : "ltr"}`}>
      <div className="container mx-auto px-4 py-16">
        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg"></div>
              <span className="font-bold text-lg">WathiqCare</span>
            </div>
            <p className="text-gray-400 text-sm">
              {isArabic
                ? "منصة رقمية موثوقة لإدارة مسارات الموافقة والرفض الطبي"
                : "Trusted digital platform for healthcare consent and refusal management"}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">
              {isArabic ? "الروابط" : "Links"}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white text-sm">
                  {isArabic ? "الرئيسية" : "Home"}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white text-sm">
                  {isArabic ? "حول" : "About"}
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-gray-400 hover:text-white text-sm">
                  {isArabic ? "المميزات" : "Features"}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-white text-sm">
                  {isArabic ? "الأسعار" : "Pricing"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">
              {isArabic ? "قانوني" : "Legal"}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">
                  {isArabic ? "الخصوصية" : "Privacy"}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white text-sm">
                  {isArabic ? "الشروط" : "Terms"}
                </Link>
              </li>
              <li>
                <Link href="/compliance" className="text-gray-400 hover:text-white text-sm">
                  {isArabic ? "الامتثال" : "Compliance"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-4">
              {isArabic ? "تابعنا" : "Follow"}
            </h4>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition">
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <p className="text-center text-gray-400 text-sm">
            {isArabic
              ? `© ${new Date().getFullYear()} WathiqCare جميع الحقوق محفوظة`
              : `© ${new Date().getFullYear()} WathiqCare. All rights reserved`}
          </p>
        </div>
      </div>
    </footer>
  );
}
