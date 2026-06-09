import { FileText, Clock, CheckSquare, Wind, BookOpen, Shield, Archive, Activity, TrendingUp, AlertCircle, Users, ChevronRight } from "lucide-react";
import { StatusBadge } from "../StatusBadge";
import type { DoctorScreen } from "../DoctorSidebar";

interface Props {
  lang: "en" | "ar";
  onNavigate: (s: DoctorScreen) => void;
}

const t = {
  en: {
    hero: "Good morning, Dr. Ahmad",
    heroSub: "Here's your clinical consent activity for today — Tuesday, June 9, 2026",
    stats: ["Pending Consents", "Signed Today", "Anesthesia Queue", "Compliance Score"],
    statVals: ["7", "12", "4", "98%"],
    services: "Quick Services",
    activity: "Recent Activity",
    createNew: "Create New Consent",
    createDesc: "Start a new informed consent for a patient procedure",
    viewPending: "View Pending",
    patientName: "Patient",
    procedureLabel: "Procedure",
    timeLabel: "Time",
    alertTitle: "2 consents awaiting patient signature",
    alertDesc: "Send reminders or re-issue secure links",
  },
  ar: {
    hero: "صباح الخير، د. أحمد",
    heroSub: "إليك نشاط موافقات العيادة لليوم — الثلاثاء ٩ يونيو ٢٠٢٦",
    stats: ["الموافقات المعلقة", "الموقعة اليوم", "طابور التخدير", "نقاط الامتثال"],
    statVals: ["٧", "١٢", "٤", "٩٨٪"],
    services: "الخدمات السريعة",
    activity: "النشاط الأخير",
    createNew: "إنشاء موافقة جديدة",
    createDesc: "ابدأ موافقة مستنيرة جديدة لإجراء المريض",
    viewPending: "عرض المعلق",
    patientName: "المريض",
    procedureLabel: "الإجراء",
    timeLabel: "الوقت",
    alertTitle: "٢ موافقة في انتظار توقيع المريض",
    alertDesc: "أرسل تذكيرات أو أعد إصدار روابط آمنة",
  }
};

const serviceCards = [
  { id: "home", icon: FileText, colorFrom: "#2F90C7", colorTo: "#12B7B5", en: "Create Consent", ar: "إنشاء موافقة", descEn: "New procedure consent", descAr: "موافقة إجراء جديدة" },
  { id: "create-consent", icon: Clock, colorFrom: "#D9A93B", colorTo: "#F5C842", en: "Pending Consents", ar: "الموافقات المعلقة", descEn: "7 awaiting response", descAr: "٧ في انتظار الرد" },
  { id: "approved-forms", icon: CheckSquare, colorFrom: "#19A978", colorTo: "#0ECBA1", en: "Approved Forms", ar: "النماذج المعتمدة", descEn: "Browse form library", descAr: "تصفح مكتبة النماذج" },
  { id: "anesthesia-queue", icon: Wind, colorFrom: "#6B5CE7", colorTo: "#9B8AF5", en: "Anesthesia Queue", ar: "قائمة التخدير", descEn: "4 patients queued", descAr: "٤ مرضى في الانتظار" },
  { id: "patient-education", icon: BookOpen, colorFrom: "#123B5C", colorTo: "#2F90C7", en: "Patient Education", ar: "تثقيف المريض", descEn: "Education resources", descAr: "موارد التثقيف" },
  { id: "compliance-review", icon: Shield, colorFrom: "#12B7B5", colorTo: "#0ECBA1", en: "Compliance Review", ar: "مراجعة الامتثال", descEn: "Smart AI audit", descAr: "تدقيق ذكاء اصطناعي" },
  { id: "consent-records", icon: Archive, colorFrom: "#E84B7A", colorTo: "#F56B9B", en: "Consent Records", ar: "سجلات الموافقة", descEn: "Historical archive", descAr: "الأرشيف التاريخي" },
  { id: "audit-trail", icon: Activity, colorFrom: "#D9A93B", colorTo: "#F0B94D", en: "Audit Trail", ar: "مسار التدقيق", descEn: "Legal evidence log", descAr: "سجل الأدلة القانونية" },
] as const;

const recentActivity = [
  { patient: "Layla Hassan", patientAr: "ليلى حسن", procedure: "Appendectomy", procedureAr: "استئصال الزائدة", time: "9:14 AM", status: "signed" as const },
  { patient: "Omar Al-Rashid", patientAr: "عمر الراشد", procedure: "Cardiac Catheterization", procedureAr: "قسطرة قلبية", time: "8:47 AM", status: "pending" as const },
  { patient: "Sara Al-Mansouri", patientAr: "سارة المنصوري", procedure: "Knee Replacement", procedureAr: "تبديل الركبة", time: "8:02 AM", status: "approved" as const },
  { patient: "Khalid Nasser", patientAr: "خالد ناصر", procedure: "Anesthesia Pre-op", procedureAr: "تخدير ما قبل العملية", time: "Yesterday", status: "anesthesia" as const },
];

export function DoctorHome({ lang, onNavigate }: Props) {
  const tx = t[lang];
  const isRTL = lang === "ar";

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#F7FBFC" }}>
      {/* Hero Banner */}
      <div
        className="mx-6 mt-6 rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #123B5C 0%, #2F90C7 60%, #12B7B5 100%)",
          boxShadow: "0 4px 24px rgba(47,144,199,0.18)"
        }}
      >
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-1">{tx.hero}</h2>
          <p className="text-sm text-white/70">{tx.heroSub}</p>

          <div className="flex gap-4 mt-5">
            {tx.stats.map((label, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{tx.statVals[i]}</div>
                <div className="text-xs text-white/60 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10" style={{ background: "#EAFFFB" }} />
        <div className="absolute right-20 -bottom-10 w-28 h-28 rounded-full opacity-10" style={{ background: "#EAF6FF" }} />
      </div>

      {/* Alert bar */}
      <div
        className="mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "#FFF8E8", border: "1px solid #D9A93B30" }}
      >
        <AlertCircle size={16} style={{ color: "#D9A93B" }} />
        <div className="flex-1">
          <span className="text-sm font-semibold" style={{ color: "#D9A93B" }}>{tx.alertTitle} — </span>
          <span className="text-sm" style={{ color: "#64798B" }}>{tx.alertDesc}</span>
        </div>
        <button
          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "#D9A93B", color: "white" }}
          onClick={() => onNavigate("create-consent")}
        >
          {lang === "en" ? "View" : "عرض"}
        </button>
      </div>

      {/* Services grid */}
      <div className="px-6 mt-6">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "#64798B" }}>{tx.services}</h3>
        <div className="grid grid-cols-4 gap-3">
          {serviceCards.map((card) => (
            <button
              key={card.id}
              onClick={() => onNavigate(card.id as DoctorScreen)}
              className="group flex flex-col gap-3 p-4 rounded-2xl bg-white border text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              style={{ borderColor: "#D8E8EF" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: `linear-gradient(135deg, ${card.colorFrom} 0%, ${card.colorTo} 100%)` }}
              >
                <card.icon size={18} color="white" />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: "#102A43" }}>
                  {isRTL ? card.ar : card.en}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#64798B" }}>
                  {isRTL ? card.descAr : card.descEn}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="px-6 mt-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "#64798B" }}>{tx.activity}</h3>
          <button
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: "#2F90C7" }}
            onClick={() => onNavigate("consent-records")}
          >
            {lang === "en" ? "See all" : "عرض الكل"} <ChevronRight size={12} />
          </button>
        </div>
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#D8E8EF" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#F7FBFC" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64798B" }}>
                  <div className="flex items-center gap-1.5"><Users size={12} />{tx.patientName}</div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64798B" }}>{tx.procedureLabel}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64798B" }}>{tx.timeLabel}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64798B" }}>Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((row, i) => (
                <tr
                  key={i}
                  className="border-t hover:bg-gray-50/50 transition-colors cursor-pointer"
                  style={{ borderColor: "#D8E8EF" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg, #2F90C7, #12B7B5)" }}
                      >
                        {(isRTL ? row.patientAr : row.patient).charAt(0)}
                      </div>
                      <span className="text-sm font-medium" style={{ color: "#102A43" }}>
                        {isRTL ? row.patientAr : row.patient}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#64798B" }}>
                    {isRTL ? row.procedureAr : row.procedure}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#64798B" }}>{row.time}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} lang={lang} /></td>
                  <td className="px-4 py-3">
                    <button className="p-1 rounded-lg hover:bg-gray-100">
                      <ChevronRight size={14} style={{ color: "#64798B" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
