import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export default function CoverageArea() {
  const { lang } = useI18n();
  const isArabic = lang === "ar";

  return (
    <section className={`py-20 ${isArabic ? "rtl" : "ltr"}`}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left - Content */}
          <div>
            <div className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full mb-6 text-sm font-semibold">
              {isArabic ? "التغطية الجغرافية" : "Coverage"}
            </div>
            
            <h2 className="text-4xl font-bold mb-6">
              {isArabic
                ? "خدمات موثوقة في جميع أنحاء المملكة" 
                : "Trusted Services Across the Kingdom"}
            </h2>
            
            <p className="text-xl text-gray-600 mb-8">
              {isArabic
                ? "WathiqCare توفر حلول معتمدة من وزارة الصحة وتدعم معايير دولية للامتثال والأمان"
                : "WathiqCare provides government-approved solutions with international compliance and security standards"}
            </p>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="border rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
                <p className="text-gray-600 text-sm">
                  {isArabic ? "منشأة صحية" : "Healthcare Facilities"}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600 mb-2">50K+</div>
                <p className="text-gray-600 text-sm">
                  {isArabic ? "حالة مُدارة" : "Cases Managed"}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600 mb-2">99.9%</div>
                <p className="text-gray-600 text-sm">
                  {isArabic ? "معدل الامتثال" : "Compliance Rate"}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
                <p className="text-gray-600 text-sm">
                  {isArabic ? "الدعم الفني" : "Technical Support"}
                </p>
              </div>
            </div>

            <Link
              href="/request-demo"
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              {isArabic ? "اطلب عرض توضيحي" : "Request Demo"}
              <ArrowUpRight size={20} />
            </Link>
          </div>

          {/* Right - Image Placeholder */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl p-12 aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {isArabic ? "صورة توضيحية" : "Illustration"}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
