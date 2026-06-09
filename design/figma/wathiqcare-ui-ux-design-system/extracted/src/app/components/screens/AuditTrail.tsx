import { Activity, Download, Filter, Lock, User, FileText, Send, Eye, CheckSquare } from "lucide-react";

interface Props { lang: "en" | "ar" }

const events = [
  { id: "EVT-0841", time: "09:14:32", date: "09 Jun 2026", actorEn: "Dr. Ahmad Khalil", actorAr: "د. أحمد خليل", actionEn: "Consent signed by patient — Layla Hassan", actionAr: "تم توقيع الموافقة من المريضة — ليلى حسن", typeEn: "Signature", typeAr: "توقيع", icon: CheckSquare, color: "#19A978", ip: "192.168.1.45", deviceEn: "Mobile Safari / iOS", deviceAr: "موبايل سفاري / iOS" },
  { id: "EVT-0840", time: "08:57:11", date: "09 Jun 2026", actorEn: "Dr. Ahmad Khalil", actorAr: "د. أحمد خليل", actionEn: "Secure link sent via SMS to +966 055 123 4567", actionAr: "تم إرسال الرابط الآمن عبر SMS إلى +966 055 123 4567", typeEn: "Link Sent", typeAr: "إرسال رابط", icon: Send, color: "#2F90C7", ip: "10.0.0.12", deviceEn: "Chrome / Windows 11", deviceAr: "كروم / ويندوز ١١" },
  { id: "EVT-0839", time: "08:47:00", date: "09 Jun 2026", actorEn: "Dr. Ahmad Khalil", actorAr: "د. أحمد خليل", actionEn: "Consent form created — Appendectomy (WC-2026-0412)", actionAr: "تم إنشاء نموذج الموافقة — استئصال الزائدة (WC-2026-0412)", typeEn: "Form Created", typeAr: "إنشاء نموذج", icon: FileText, color: "#6B5CE7", ip: "10.0.0.12", deviceEn: "Chrome / Windows 11", deviceAr: "كروم / ويندوز ١١" },
  { id: "EVT-0838", time: "08:32:15", date: "09 Jun 2026", actorEn: "System", actorAr: "النظام", actionEn: "Patient OTP verified — Layla Hassan (MRN-204871)", actionAr: "تم التحقق من OTP للمريضة — ليلى حسن (MRN-204871)", typeEn: "OTP Verified", typeAr: "التحقق OTP", icon: Lock, color: "#12B7B5", ip: "Mobile Network", deviceEn: "Mobile Safari / iOS", deviceAr: "موبايل سفاري / iOS" },
  { id: "EVT-0837", time: "17:22:04", date: "08 Jun 2026", actorEn: "Dr. Nasser Al-Ghamdi", actorAr: "د. ناصر الغامدي", actionEn: "Consent record WC-2026-0410 downloaded (PDF)", actionAr: "تم تنزيل سجل الموافقة WC-2026-0410 (PDF)", typeEn: "Download", typeAr: "تنزيل", icon: Download, color: "#D9A93B", ip: "10.0.0.21", deviceEn: "Firefox / macOS", deviceAr: "فايرفوكس / macOS" },
  { id: "EVT-0836", time: "15:09:44", date: "08 Jun 2026", actorEn: "Dr. Ahmad Khalil", actorAr: "د. أحمد خليل", actionEn: "Patient education materials sent — Sara Al-Mansouri", actionAr: "تم إرسال مواد التثقيف — سارة المنصوري", typeEn: "Education", typeAr: "تثقيف", icon: Eye, color: "#19A978", ip: "10.0.0.12", deviceEn: "Chrome / Windows 11", deviceAr: "كروم / ويندوز ١١" },
  { id: "EVT-0835", time: "11:03:28", date: "07 Jun 2026", actorEn: "System", actorAr: "النظام", actionEn: "Consent link expired — Khalid Nasser (no response in 48h)", actionAr: "انتهت صلاحية رابط الموافقة — خالد ناصر (لا استجابة خلال ٤٨ ساعة)", typeEn: "Expired", typeAr: "انتهى", icon: Lock, color: "#E84B7A", ip: "—", deviceEn: "—", deviceAr: "—" },
];

export function AuditTrail({ lang }: Props) {
  const isRTL = lang === "ar";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b bg-white" style={{ borderColor: "#D8E8EF" }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
            {isRTL ? "مسار التدقيق / الأدلة القانونية" : "Audit Trail / Legal Evidence"}
          </h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium" style={{ borderColor: "#D8E8EF", color: "#64798B" }}>
              <Filter size={13} /> {isRTL ? "تصفية" : "Filter"}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "#123B5C" }}>
              <Download size={13} /> {isRTL ? "تصدير السجل" : "Export Log"}
            </button>
          </div>
        </div>
        <p className="text-sm" style={{ color: "#64798B" }}>
          {isRTL ? "سجل غير قابل للتعديل لجميع أنشطة المنصة • مشفر • مختوم بالوقت" : "Immutable log of all platform activity • Encrypted • Timestamped"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {events.map(ev => (
          <div key={ev.id} className="flex gap-4 p-4 bg-white rounded-2xl border" style={{ borderColor: "#D8E8EF" }}>
            {/* Icon + line */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: ev.color + "15" }}>
                <ev.icon size={16} style={{ color: ev.color }} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#102A43" }}>
                    {isRTL ? ev.actionAr : ev.actionEn}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "#64798B" }}>
                    <span className="flex items-center gap-1">
                      <User size={10} /> {isRTL ? ev.actorAr : ev.actorEn}
                    </span>
                    <span>·</span>
                    <span>{ev.time} · {ev.date}</span>
                    <span>·</span>
                    <span>IP: {ev.ip}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: "#64798B" }}>
                    {isRTL ? ev.deviceAr : ev.deviceEn}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: ev.color + "18", color: ev.color }}>
                    {isRTL ? ev.typeAr : ev.typeEn}
                  </span>
                  <span className="text-xs font-mono" style={{ color: "#64798B" }}>{ev.id}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="p-4 rounded-2xl" style={{ background: "#EAF6FF", border: "1px solid #2F90C730" }}>
          <div className="flex items-center gap-2 mb-2">
            <Lock size={13} style={{ color: "#2F90C7" }} />
            <span className="text-xs font-bold" style={{ color: "#2F90C7" }}>
              {isRTL ? "ملاحظة قانونية" : "Legal Note"}
            </span>
          </div>
          <p className="text-xs" style={{ color: "#64798B" }}>
            {isRTL
              ? "جميع الإدخالات في هذا السجل مختومة زمنياً ومشفرة ولا يمكن تعديلها. هذا السجل صالح كدليل قانوني وفقاً لمعايير HIPAA وNCA."
              : "All entries in this log are timestamped, encrypted, and immutable. This log is valid as legal evidence per HIPAA and NCA standards."}
          </p>
        </div>
      </div>
    </div>
  );
}
