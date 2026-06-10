import { useState } from "react";
import { Wind, Clock, AlertTriangle, Check, ChevronRight, User } from "lucide-react";
import { StatusBadge } from "../StatusBadge";

interface Props { lang: "en" | "ar" }

const queue = [
  { id: "AQ-001", patientEn: "Omar Al-Rashid", patientAr: "ع&ر اراشد", mrn: "MRN-187432", procedureEn: "Cardiac Catheterization", procedureAr: "سطرة ب`ة", typeEn: "General Anesthesia", typeAr: "تخدير عام", orRoom: "OR-1", scheduledTime: "08:00", anesthesiologistEn: "Dr. Sara Al-Mansouri", anesthesiologistAr: "د. سارة ا& صر`", status: "pending" as const, alert: true, alertMsgEn: "Allergy: Penicillin", alertMsgAr: "حساس`ة: ب س` " },
  { id: "AQ-002", patientEn: "Fatimah Ibrahim", patientAr: "فاطمة إبراهيم", mrn: "MRN-210045", procedureEn: "Cataract Surgery", procedureAr: "جراحة اساد", typeEn: "Local Anesthesia", typeAr: "تخدير موضعي", orRoom: "OR-3", scheduledTime: "09:30", anesthesiologistEn: "Dr. Yusuf Al-Harbi", anesthesiologistAr: "د. `سف احرب`", status: "approved" as const, alert: false, alertMsgEn: "", alertMsgAr: "" },
  { id: "AQ-003", patientEn: "Khalid Nasser", patientAr: "خاد  اصر", mrn: "MRN-195700", procedureEn: "Knee Replacement", procedureAr: "تبد` &فص ارْبة", typeEn: "Spinal Epidural", typeAr: "تخدير نخاعي", orRoom: "OR-2", scheduledTime: "11:00", anesthesiologistEn: "Dr. Sara Al-Mansouri", anesthesiologistAr: "د. سارة ا& صر`", status: "anesthesia" as const, alert: true, alertMsgEn: "Diabetes Type 2  check glucose", alertMsgAr: "سْر`  ع ٢  تح &  اجْز" },
  { id: "AQ-004", patientEn: "Reem Al-Zahrani", patientAr: "ر`& از!را `", mrn: "MRN-199832", procedureEn: "Hernia Repair", procedureAr: "إصاح افت", typeEn: "General Anesthesia", typeAr: "تخدير عام", orRoom: "OR-1", scheduledTime: "13:00", anesthesiologistEn: "Dr. Yusuf Al-Harbi", anesthesiologistAr: "د. `سف احرب`", status: "pending" as const, alert: false, alertMsgEn: "", alertMsgAr: "" },
];

export function AnesthesiaQueue({ lang }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const isRTL = lang === "ar";
  const sel = queue.find(q => q.id === selected);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b bg-white" style={{ borderColor: "#D8E8EF" }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold" style={{ color: "#102A43" }}>
              {isRTL ? "ائ&ة ا تظار اتخد`ر" : "Anesthesia Queue"}
            </h2>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold" style={{ background: "#EAFFFB", color: "#12B7B5" }}>
              <Wind size={14} />
              {isRTL ? `${queue.length} مرضى اليوم` : `${queue.length} patients today`}
            </div>
          </div>
          <p className="text-sm" style={{ color: "#64798B" }}>
            {isRTL ? "اثاثاء ٩ ` ` ٢٠٢٦ · &ستشف0 ا&ْ عبداعز`ز" : "Tuesday June 9, 2026 · King Abdulaziz Hospital"}
          </p>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {queue.map((item, i) => (
            <button
              key={item.id}
              onClick={() => setSelected(item.id === selected ? null : item.id)}
              className="w-full text-left p-4 rounded-2xl bg-white border transition-all hover:shadow-sm"
              style={{
                borderColor: selected === item.id ? "#12B7B5" : "#D8E8EF",
                background: selected === item.id ? "#EAFFFB" : "white"
              }}
            >
              <div className="flex items-start gap-4">
                {/* Time */}
                <div className="flex-shrink-0 text-center w-14">
                  <div className="text-sm font-bold" style={{ color: "#12B7B5" }}>{item.scheduledTime}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#64798B" }}>{item.orRoom}</div>
                </div>
                {/* Divider */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#12B7B5", background: "white" }} />
                  {i < queue.length - 1 && <div className="w-0.5 h-8" style={{ background: "#D8E8EF" }} />}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold" style={{ color: "#102A43" }}>
                      {isRTL ? item.patientAr : item.patientEn}
                    </span>
                    <span className="text-xs" style={{ color: "#64798B" }}>{item.mrn}</span>
                    <StatusBadge status={item.status} lang={lang} />
                  </div>
                  <div className="text-sm" style={{ color: "#64798B" }}>
                    {isRTL ? item.procedureAr : item.procedureEn}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#64798B" }}>
                    <span className="px-2 py-0.5 rounded-lg font-medium" style={{ background: "#EAFFFB", color: "#12B7B5" }}>
                      {isRTL ? item.typeAr : item.typeEn}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={10} /> {isRTL ? item.anesthesiologistAr : item.anesthesiologistEn}
                    </span>
                  </div>
                  {item.alert && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: "#D9A93B" }}>
                      <AlertTriangle size={12} />
                      {isRTL ? item.alertMsgAr : item.alertMsgEn}
                    </div>
                  )}
                </div>
                <ChevronRight size={14} style={{ color: "#64798B" }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      {sel && (
        <div className="w-80 border-l bg-white overflow-y-auto flex-shrink-0" style={{ borderColor: "#D8E8EF" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#D8E8EF" }}>
            <span className="text-sm font-bold" style={{ color: "#102A43" }}>{isRTL ? "تفاص` اتخد`ر" : "Anesthesia Detail"}</span>
            <button onClick={() => setSelected(null)} className="text-xs" style={{ color: "#64798B" }}>S"</button>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: "linear-gradient(135deg,#12B7B5,#0ECBA1)" }}>
                {(isRTL ? sel.patientAr : sel.patientEn).charAt(0)}
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "#102A43" }}>{isRTL ? sel.patientAr : sel.patientEn}</div>
                <div className="text-xs" style={{ color: "#64798B" }}>{sel.mrn}</div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { labelEn: "Procedure", labelAr: "اإجراء", val: isRTL ? sel.procedureAr : sel.procedureEn },
                { labelEn: "Anesthesia Type", labelAr: " ع اتخد`ر", val: isRTL ? sel.typeAr : sel.typeEn },
                { labelEn: "OR Room", labelAr: "غرفة اع&`ات", val: sel.orRoom },
                { labelEn: "Scheduled", labelAr: "ا&عد", val: sel.scheduledTime },
                { labelEn: "Anesthesiologist", labelAr: "طب`ب اتخد`ر", val: isRTL ? sel.anesthesiologistAr : sel.anesthesiologistEn },
              ].map(row => (
                <div key={row.labelEn} className="p-3 rounded-xl" style={{ background: "#F7FBFC" }}>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: "#64798B" }}>{isRTL ? row.labelAr : row.labelEn}</div>
                  <div className="text-sm font-medium" style={{ color: "#102A43" }}>{row.val}</div>
                </div>
              ))}
            </div>
            {sel.alert && (
              <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "#FFF8E8" }}>
                <AlertTriangle size={14} style={{ color: "#D9A93B" }} className="mt-0.5 flex-shrink-0" />
                <div className="text-xs font-semibold" style={{ color: "#D9A93B" }}>
                  {isRTL ? sel.alertMsgAr : sel.alertMsgEn}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1.5" style={{ background: "#12B7B5" }}>
                <Check size={14} /> {isRTL ? "تأْ`د" : "Confirm"}
              </button>
              <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold border flex items-center justify-center gap-1.5" style={{ borderColor: "#D8E8EF", color: "#64798B" }}>
                <Clock size={14} /> {isRTL ? "تأج`" : "Defer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


