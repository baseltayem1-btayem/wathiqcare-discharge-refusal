"use client";

import Navbar from "@/components/figma/Navbar";
import FeaturesSection from "@/components/figma/FeaturesSection";
import CoverageArea from "@/components/figma/CoverageArea";
import Footer from "@/components/figma/Footer";
import { useI18n } from "@/i18n/I18nProvider";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function FigmaPage() {
  const { lang, isRtl } = useI18n();

  return (
    <div className={isRtl ? "rtl" : "ltr"}>
      <Navbar isRtl={isRtl} />

      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center pt-20">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full mb-6 text-sm font-semibold">
              ✨ {isRtl ? "رحبا بك في واثق كير" : "Welcome to WathiqCare"}
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              {isRtl
                ? "منصة رقمية موثوقة لإدارة الموافقات"
                : "Trusted Digital Platform for Consent Management"}
            </h1>

            {/* Description */}
            <p className="text-xl text-gray-600 mb-8">
              {isRtl
                ? "حل متكامل لتوثيق الموافقات والرفض ورفع جودة التوثيق السريري والقانوني"
                : "Comprehensive solution for consent documentation, refusal management, and clinical-legal quality assurance"}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/login"
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2"
              >
                {isRtl ? "الدخول الآن" : "Get Started"}
                <ArrowUpRight size={20} />
              </Link>
              <Link
                href="/request-demo"
                className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold"
              >
                {isRtl ? "طلب عرض توضيحي" : "Request Demo"}
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-gray-200">
              <div>
                <div className="text-4xl font-bold text-blue-600">500+</div>
                <div className="text-gray-600 mt-2">
                  {isRtl ? "منشأة صحية" : "Healthcare Facilities"}
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600">50K+</div>
                <div className="text-gray-600 mt-2">
                  {isRtl ? "حالة مُدارة" : "Cases Managed"}
                </div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600">99.9%</div>
                <div className="text-gray-600 mt-2">
                  {isRtl ? "معدل الامتثال" : "Compliance Rate"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection isRtl={isRtl} />

      {/* Coverage Area */}
      <CoverageArea isRtl={isRtl} />

      {/* CTA Section */}
      <section className={`py-20 bg-blue-600 text-white ${isRtl ? "rtl" : "ltr"}`}>
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            {isRtl
              ? "هل أنت مستعد للبدء؟"
              : "Ready to Get Started?"}
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            {isRtl
              ? "انضم إلى مئات المنشآت الصحية التي تثق بـ WathiqCare"
              : "Join hundreds of healthcare facilities trusting WathiqCare"}
          </p>
          <Link
            href="/login"
            className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-semibold inline-flex items-center gap-2"
          >
            {isRtl ? "ابدأ الآن" : "Start Now"}
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer isRtl={isRtl} />
    </div>
  );
}
