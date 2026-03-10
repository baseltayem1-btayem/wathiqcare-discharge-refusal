import { CheckCircle2, FileCheck2, Gavel, ShieldCheck, Workflow } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const featuresList = [
  {
    title: "الموافقة المستنيرة",
    titleEn: "Informed Consent",
    description: "إدارة جلسات الإقرار والتوقيع الرقمي",
    descriptionEn: "Manage acknowledgment sessions with digital signatures",
    icon: FileCheck2,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "رفض الخروج الطبي",
    titleEn: "Discharge Refusal",
    description: "سير عمل منظم لتسجيل القرار والرفض",
    descriptionEn: "Structured workflow for discharge decisions",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-600",
  },
  {
    title: "الحماية القانونية",
    titleEn: "Legal Protection",
    description: "تجميع ملف قانوني متكامل مع المستندات",
    descriptionEn: "Integrated legal case file with documents",
    icon: Gavel,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "الامتثال والتدقيق",
    titleEn: "Compliance Tracking",
    description: "لوحات تشغيلية لمؤشرات الامتثال",
    descriptionEn: "Compliance dashboards and audit trails",
    icon: ShieldCheck,
    color: "bg-orange-100 text-orange-600",
  },
];

export default function FeaturesSection() {
  const { lang } = useI18n();
  const isArabic = lang === "ar";

  return (
    <section className={`py-20 bg-gray-50 ${isArabic ? "rtl" : "ltr"}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            {isArabic ? "المميزات الرئيسية" : "Core Features"}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {isArabic
              ? "منصة متكاملة لإدارة مسارات الموافقة والرفض والتصعيد القانوني"
              : "Integrated platform for managing consent, refusal, and legal workflows"}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresList.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.titleEn}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition"
              >
                <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {isArabic ? feature.title : feature.titleEn}
                </h3>
                <p className="text-gray-600 text-sm">
                  {isArabic ? feature.description : feature.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
