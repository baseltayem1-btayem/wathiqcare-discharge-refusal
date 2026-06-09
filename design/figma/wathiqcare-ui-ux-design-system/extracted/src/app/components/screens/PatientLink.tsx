import { useState } from "react";
import {
  Globe, Shield, ChevronRight, ChevronLeft, Check, Pen, Lock,
  BookOpen, FileText, Phone, MessageSquare, QrCode, Download,
  AlertCircle, Smartphone, Tablet, Monitor
} from "lucide-react";

type Step = "language" | "otp" | "summary" | "education" | "consent" | "question" | "signature" | "complete";
type Viewport = "mobile" | "tablet" | "desktop";

const stepOrder: Step[] = ["language", "otp", "summary", "education", "consent", "question", "signature", "complete"];

const stepLabels = {
  en: { language: "Language", otp: "Verify", summary: "Summary", education: "Learn", consent: "Review", question: "Questions", signature: "Sign", complete: "Done" },
  ar: { language: "اللغة", otp: "تحقق", summary: "ملخص", education: "تعلم", consent: "مراجعة", question: "أسئلة", signature: "توقيع", complete: "تم" }
};

export function PatientLink() {
  const [viewport, setViewport] = useState<Viewport>("mobile");
  const [step, setStep] = useState<Step>("language");
  const [lang, setLang] = useState<"en" | "ar">("ar");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [signed, setSigned] = useState(false);
  const [question, setQuestion] = useState("");
  const [questionSent, setQuestionSent] = useState(false);
  const [understood, setUnderstood] = useState(false);

  const isRTL = lang === "ar";

  const next = () => {
    const i = stepOrder.indexOf(step);
    if (i < stepOrder.length - 1) setStep(stepOrder[i + 1]);
  };
  const prev = () => {
    const i = stepOrder.indexOf(step);
    if (i > 0) setStep(stepOrder[i - 1]);
  };

  const viewportWidth: Record<Viewport, string> = {
    mobile: "w-[375px]",
    tablet: "w-[768px]",
    desktop: "w-[1200px]"
  };

  const viewportMinH: Record<Viewport, string> = {
    mobile: "min-h-[750px]",
    tablet: "min-h-[700px]",
    desktop: "min-h-[700px]"
  };

  return (
    <div className="flex-1 overflow-auto" style={{ background: "#102A43" }}>
      {/* Viewport switcher */}
      <div className="sticky top-0 z-10 flex items-center justify-center gap-3 py-3 px-4" style={{ background: "#0D2035", borderBottom: "1px solid #1a3550" }}>
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          {isRTL ? "معاينة رابط المريض" : "Patient Link Preview"}
        </span>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "#1a3550" }}>
          {([
            { id: "mobile", icon: Smartphone, label: "375px" },
            { id: "tablet", icon: Tablet, label: "768px" },
            { id: "desktop", icon: Monitor, label: "1200px" },
          ] as const).map(v => (
            <button
              key={v.id}
              onClick={() => setViewport(v.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: viewport === v.id ? "#2F90C7" : "transparent",
                color: viewport === v.id ? "white" : "white/50"
              }}
            >
              <v.icon size={13} />
              <span className="text-white/80">{v.label}</span>
            </button>
          ))}
        </div>
        {/* Reset */}
        <button onClick={() => { setStep("language"); setSigned(false); setOtp(["","","","","",""]); }}
          className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: "#1a3550", color: "#64798B" }}>
          Reset
        </button>
      </div>

      {/* Phone/tablet/desktop frame */}
      <div className="flex items-start justify-center py-8 px-4">
        <div
          className={`${viewportWidth[viewport]} ${viewportMinH[viewport]} rounded-2xl overflow-hidden shadow-2xl flex flex-col`}
          style={{ background: "#F7FBFC" }}
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Patient app top bar */}
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "#123B5C" }}>
            <div className="flex items-center gap-2">
              <Lock size={13} color="white" className="opacity-70" />
              <span className="text-xs text-white/70">consent.wathiqcare.com</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#19A978" }} />
              <span className="text-xs text-white/70">{isRTL ? "آمن ومشفر" : "Secure"}</span>
            </div>
          </div>

          {/* Progress dots */}
          {step !== "language" && step !== "complete" && (
            <div className="flex items-center justify-center gap-1.5 py-3" style={{ background: "white" }}>
              {(["otp", "summary", "education", "consent", "question", "signature"] as Step[]).map(s => {
                const done = stepOrder.indexOf(s) < stepOrder.indexOf(step);
                const active = s === step;
                return (
                  <div
                    key={s}
                    className="rounded-full transition-all"
                    style={{
                      width: active ? 20 : 6,
                      height: 6,
                      background: done ? "#19A978" : active ? "#2F90C7" : "#D8E8EF"
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {/* STEP: Language */}
            {step === "language" && (
              <div className="flex flex-col items-center justify-center min-h-full px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg"
                  style={{ background: "linear-gradient(135deg,#123B5C,#2F90C7)" }}>
                  <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 3a2 2 0 110 4 2 2 0 010-4zm0 11c-2.67 0-5.03-1.34-6.42-3.37C4.79 10.82 8.17 10 10 10c1.83 0 5.21.82 6.42 2.63C14.03 14.66 11.67 16 10 16z" fill="white"/>
                  </svg>
                </div>
                <div className="text-xl font-bold mb-1" style={{ color: "#102A43" }}>WathiqCare</div>
                <div className="text-sm mb-6" style={{ color: "#64798B" }}>
                  Secure Consent · موافقة آمنة
                </div>
                <p className="text-sm mb-6" style={{ color: "#64798B" }}>
                  {lang === "en" ? "Dr. Ahmad Khalil has sent you a consent request for:" : "أرسل لك د. أحمد خليل طلب موافقة للإجراء:"}
                </p>
                <div className="px-5 py-3 rounded-2xl mb-8 w-full" style={{ background: "#EAF6FF", border: "1px solid #2F90C730" }}>
                  <div className="text-base font-bold" style={{ color: "#123B5C" }}>
                    {lang === "en" ? "Appendectomy" : "استئصال الزائدة الدودية"}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "#64798B" }}>
                    {lang === "en" ? "King Abdulaziz Hospital · 12 Jun 2026" : "مستشفى الملك عبدالعزيز · ١٢ يونيو ٢٠٢٦"}
                  </div>
                </div>
                <p className="text-sm font-semibold mb-3" style={{ color: "#102A43" }}>
                  اختر لغتك / Choose your language
                </p>
                <div className="flex flex-col gap-3 w-full">
                  {[
                    { code: "ar" as const, label: "العربية", sub: "Arabic" },
                    { code: "en" as const, label: "English", sub: "الإنجليزية" },
                  ].map(l => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l.code)}
                      className="flex items-center justify-between px-5 py-4 rounded-2xl border transition-all"
                      style={{
                        borderColor: lang === l.code ? "#2F90C7" : "#D8E8EF",
                        background: lang === l.code ? "#EAF6FF" : "white",
                      }}
                    >
                      <div className="text-left">
                        <div className="text-base font-bold" style={{ color: "#102A43" }}>{l.label}</div>
                        <div className="text-sm" style={{ color: "#64798B" }}>{l.sub}</div>
                      </div>
                      {lang === l.code && <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#2F90C7" }}>
                        <Check size={13} color="white" />
                      </div>}
                    </button>
                  ))}
                </div>
                <button
                  onClick={next}
                  className="w-full mt-6 py-4 rounded-2xl font-bold text-white text-base shadow-lg transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(90deg,#2F90C7,#12B7B5)" }}
                >
                  {isRTL ? "متابعة" : "Continue"} <ChevronRight className="inline ms-1" size={16} />
                </button>
              </div>
            )}

            {/* STEP: OTP */}
            {step === "otp" && (
              <div className="flex flex-col items-center px-6 py-8">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: "#EAF6FF" }}>
                  <Shield size={24} style={{ color: "#2F90C7" }} />
                </div>
                <h2 className="text-xl font-bold text-center mb-2" style={{ color: "#102A43" }}>
                  {isRTL ? "التحقق من هويتك" : "Verify Your Identity"}
                </h2>
                <p className="text-sm text-center mb-2" style={{ color: "#64798B" }}>
                  {isRTL ? "تم إرسال رمز التحقق إلى" : "We sent a verification code to"}
                </p>
                <p className="text-sm font-bold mb-6" style={{ color: "#123B5C" }}>+966 055 *** 4567</p>

                <div className="flex gap-2 mb-6" dir="ltr">
                  {otp.map((v, i) => (
                    <input
                      key={i}
                      maxLength={1}
                      value={v}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        const next = [...otp]; next[i] = val;
                        setOtp(next);
                        if (val && i < 5) {
                          const nextEl = document.getElementById(`otp-${i + 1}`);
                          nextEl?.focus();
                        }
                      }}
                      id={`otp-${i}`}
                      className="w-11 h-14 text-center text-xl font-bold rounded-xl border outline-none focus:ring-2 transition-all"
                      style={{ borderColor: v ? "#2F90C7" : "#D8E8EF", background: v ? "#EAF6FF" : "white", color: "#102A43" }}
                    />
                  ))}
                </div>

                <button
                  onClick={() => { setOtp(["1","2","3","4","5","6"]); setTimeout(next, 300); }}
                  className="w-full py-4 rounded-2xl font-bold text-white mb-3"
                  style={{ background: "linear-gradient(90deg,#2F90C7,#12B7B5)" }}
                >
                  {isRTL ? "تحقق من الرمز" : "Verify Code"}
                </button>
                <button className="text-sm" style={{ color: "#64798B" }}>
                  {isRTL ? "إعادة إرسال الرمز" : "Resend code"}
                </button>
              </div>
            )}

            {/* STEP: Summary */}
            {step === "summary" && (
              <div className="px-5 py-6 space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "#E8F9F4" }}>
                    <Check size={22} style={{ color: "#19A978" }} />
                  </div>
                  <h2 className="text-lg font-bold" style={{ color: "#102A43" }}>
                    {isRTL ? "مرحباً يا ليلى" : "Hello, Layla"}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "#64798B" }}>
                    {isRTL ? "يرجى مراجعة ملخص الموافقة" : "Please review your consent summary"}
                  </p>
                </div>
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#D8E8EF" }}>
                  {[
                    { labelEn: "Procedure", labelAr: "الإجراء", val: isRTL ? "استئصال الزائدة الدودية" : "Appendectomy" },
                    { labelEn: "Surgeon", labelAr: "الجراح", val: isRTL ? "د. أحمد خليل" : "Dr. Ahmad Khalil" },
                    { labelEn: "Hospital", labelAr: "المستشفى", val: isRTL ? "مستشفى الملك عبدالعزيز" : "King Abdulaziz Hospital" },
                    { labelEn: "Date", labelAr: "التاريخ", val: "12 Jun 2026 · 09:00" },
                    { labelEn: "Anesthesia", labelAr: "التخدير", val: isRTL ? "تخدير عام" : "General Anesthesia" },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between px-4 py-3 border-b" style={{ borderColor: "#F7FBFC", background: i % 2 === 0 ? "white" : "#F7FBFC" }}>
                      <span className="text-sm" style={{ color: "#64798B" }}>{isRTL ? r.labelAr : r.labelEn}</span>
                      <span className="text-sm font-semibold" style={{ color: "#102A43" }}>{r.val}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-2xl" style={{ background: "#FFF8E8", border: "1px solid #D9A93B30" }}>
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} style={{ color: "#D9A93B" }} className="mt-0.5 flex-shrink-0" />
                    <p className="text-xs" style={{ color: "#D9A93B" }}>
                      {isRTL ? "يُرجى قراءة المواد التعليمية والنموذج الكامل قبل التوقيع." : "Please read the education materials and full form before signing."}
                    </p>
                  </div>
                </div>
                <button onClick={next} className="w-full py-4 rounded-2xl font-bold text-white" style={{ background: "linear-gradient(90deg,#2F90C7,#12B7B5)" }}>
                  {isRTL ? "مراجعة المواد التعليمية" : "Review Education Materials"} <ChevronRight className="inline ms-1" size={16} />
                </button>
              </div>
            )}

            {/* STEP: Education */}
            {step === "education" && (
              <div className="px-5 py-6 space-y-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} style={{ color: "#6B5CE7" }} />
                  <h2 className="text-lg font-bold" style={{ color: "#102A43" }}>
                    {isRTL ? "مواد التثقيف الصحي" : "Health Education"}
                  </h2>
                </div>
                <p className="text-sm" style={{ color: "#64798B" }}>
                  {isRTL ? "أرسل لك طبيبك هذه المواد للمساعدة في فهم العملية" : "Your doctor has shared these to help you understand the procedure"}
                </p>
                {[
                  { icon: "📄", titleEn: "Pre-operative Fasting Guide", titleAr: "دليل الصيام قبل العملية", duration: "5 min", color: "#E84B7A" },
                  { icon: "🎬", titleEn: "What Happens During Surgery", titleAr: "ماذا يحدث أثناء الجراحة", duration: "4 min", color: "#2F90C7" },
                  { icon: "🖼️", titleEn: "Post-op Recovery Guide", titleAr: "دليل التعافي بعد العملية", duration: "3 min", color: "#19A978" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-2xl border" style={{ borderColor: "#D8E8EF" }}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: m.color + "15" }}>
                      {m.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: "#102A43" }}>{isRTL ? m.titleAr : m.titleEn}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#64798B" }}>{m.duration} {isRTL ? "قراءة" : "read"}</div>
                    </div>
                    <button className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: m.color, color: "white" }}>
                      {isRTL ? "عرض" : "View"}
                    </button>
                  </div>
                ))}
                <button onClick={next} className="w-full py-4 rounded-2xl font-bold text-white" style={{ background: "linear-gradient(90deg,#2F90C7,#12B7B5)" }}>
                  {isRTL ? "مراجعة الموافقة" : "Review Consent Form"} <ChevronRight className="inline ms-1" size={16} />
                </button>
              </div>
            )}

            {/* STEP: Consent review */}
            {step === "consent" && (
              <div className="px-5 py-6 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText size={18} style={{ color: "#2F90C7" }} />
                  <h2 className="text-lg font-bold" style={{ color: "#102A43" }}>
                    {isRTL ? "نموذج الموافقة الكامل" : "Full Consent Form"}
                  </h2>
                </div>
                <div className="p-4 rounded-2xl bg-white border space-y-3 max-h-72 overflow-y-auto" style={{ borderColor: "#D8E8EF" }}>
                  {[
                    { hEn: "1. Procedure Description", hAr: "١. وصف الإجراء", bodyEn: "You are scheduled for an Appendectomy — surgical removal of the appendix — performed under general anesthesia by Dr. Ahmad Khalil.", bodyAr: "أنتِ مجدولة لعملية استئصال الزائدة الدودية — الاستئصال الجراحي للزائدة — تحت التخدير العام بواسطة د. أحمد خليل." },
                    { hEn: "2. Risks & Complications", hAr: "٢. المخاطر والمضاعفات", bodyEn: "Risks include bleeding, infection, injury to adjacent organs, and rarely the need for a second procedure. Your anesthesiologist will monitor you continuously.", bodyAr: "تشمل المخاطر النزيف والعدوى والإصابة بالأعضاء المجاورة ونادراً الحاجة إلى إجراء ثانٍ. سيراقبك طبيب التخدير باستمرار." },
                    { hEn: "3. Alternatives", hAr: "٣. البدائل", bodyEn: "Non-surgical management with antibiotics is an alternative, though it may be less effective and carries risk of recurrence.", bodyAr: "العلاج غير الجراحي بالمضادات الحيوية بديل محتمل، وإن كان أقل فاعلية وينطوي على خطر التكرار." },
                    { hEn: "4. Patient Rights", hAr: "٤. حقوق المريض", bodyEn: "You have the right to withdraw consent at any time before the procedure begins. Your decision will not affect the quality of your care.", bodyAr: "يحق لكِ سحب الموافقة في أي وقت قبل بدء الإجراء. لن يؤثر قرارك على جودة رعايتك." },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="text-sm font-bold mb-1" style={{ color: "#123B5C" }}>{isRTL ? s.hAr : s.hEn}</div>
                      <p className="text-sm leading-relaxed" style={{ color: "#64798B" }}>{isRTL ? s.bodyAr : s.bodyEn}</p>
                    </div>
                  ))}
                </div>
                <button onClick={next} className="w-full py-4 rounded-2xl font-bold text-white" style={{ background: "linear-gradient(90deg,#2F90C7,#12B7B5)" }}>
                  {isRTL ? "لدي سؤال / أفهمت" : "I Have a Question / I Understand"} <ChevronRight className="inline ms-1" size={16} />
                </button>
              </div>
            )}

            {/* STEP: Question */}
            {step === "question" && (
              <div className="px-5 py-6 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} style={{ color: "#D9A93B" }} />
                  <h2 className="text-lg font-bold" style={{ color: "#102A43" }}>
                    {isRTL ? "هل لديك سؤال؟" : "Any Questions?"}
                  </h2>
                </div>
                <p className="text-sm" style={{ color: "#64798B" }}>
                  {isRTL ? "يمكنك إرسال سؤال للطبيب أو تأكيد فهمك للمتابعة." : "You can ask your doctor a question or confirm you understand to proceed."}
                </p>
                {!questionSent ? (
                  <>
                    <textarea
                      rows={4}
                      className="w-full px-4 py-3 rounded-2xl border text-sm outline-none resize-none"
                      style={{ borderColor: "#D8E8EF", background: "white", color: "#102A43" }}
                      placeholder={isRTL ? "اكتب سؤالك هنا..." : "Type your question here..."}
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                    />
                    <button
                      onClick={() => { if (question) setQuestionSent(true); }}
                      disabled={!question}
                      className="w-full py-3 rounded-2xl text-sm font-semibold text-white disabled:opacity-40"
                      style={{ background: "#D9A93B" }}
                    >
                      {isRTL ? "إرسال السؤال للطبيب" : "Send Question to Doctor"}
                    </button>
                  </>
                ) : (
                  <div className="p-4 rounded-2xl" style={{ background: "#E8F9F4" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Check size={15} style={{ color: "#19A978" }} />
                      <span className="text-sm font-semibold" style={{ color: "#19A978" }}>
                        {isRTL ? "تم إرسال سؤالك" : "Question sent!"}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "#64798B" }}>
                      {isRTL ? "سيرد الطبيب خلال ٢٤ ساعة. يمكنك المتابعة للتوقيع." : "Doctor will respond within 24h. You can proceed to sign."}
                    </p>
                  </div>
                )}
                <div className="p-4 rounded-2xl border" style={{ borderColor: "#D8E8EF" }}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div
                      onClick={() => setUnderstood(!understood)}
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border transition-all"
                      style={{ background: understood ? "#2F90C7" : "white", borderColor: understood ? "#2F90C7" : "#D8E8EF" }}
                    >
                      {understood && <Check size={12} color="white" />}
                    </div>
                    <span className="text-sm" style={{ color: "#102A43" }}>
                      {isRTL
                        ? "أؤكد أنني فهمت محتوى الموافقة ومخاطرها وبدائلها، وأرغب في المتابعة."
                        : "I confirm I have read and understood the consent, its risks and alternatives, and wish to proceed."}
                    </span>
                  </label>
                </div>
                <button
                  onClick={next}
                  disabled={!understood}
                  className="w-full py-4 rounded-2xl font-bold text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(90deg,#2F90C7,#12B7B5)" }}
                >
                  {isRTL ? "متابعة للتوقيع" : "Proceed to Signature"} <ChevronRight className="inline ms-1" size={16} />
                </button>
              </div>
            )}

            {/* STEP: Signature */}
            {step === "signature" && (
              <div className="px-5 py-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Pen size={18} style={{ color: "#123B5C" }} />
                  <h2 className="text-lg font-bold" style={{ color: "#102A43" }}>
                    {isRTL ? "التوقيع الإلكتروني" : "Electronic Signature"}
                  </h2>
                </div>
                <p className="text-sm" style={{ color: "#64798B" }}>
                  {isRTL ? "ارسم توقيعك في الإطار أدناه" : "Draw your signature in the box below"}
                </p>

                <div
                  onClick={() => setSigned(true)}
                  className="w-full h-40 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all"
                  style={{ borderColor: signed ? "#19A978" : "#D8E8EF", background: signed ? "#E8F9F4" : "white" }}
                >
                  {signed ? (
                    <div className="text-center">
                      <div className="text-3xl font-bold italic mb-1" style={{ color: "#19A978", fontFamily: "cursive" }}>ليلى حسن</div>
                      <div className="text-xs" style={{ color: "#64798B" }}>Layla Hassan</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Pen size={24} className="mx-auto mb-2 opacity-30" style={{ color: "#64798B" }} />
                      <p className="text-sm" style={{ color: "#64798B" }}>
                        {isRTL ? "انقر للتوقيع" : "Tap to sign"}
                      </p>
                    </div>
                  )}
                </div>

                {signed && (
                  <div className="p-3 rounded-xl" style={{ background: "#EAFFFB", border: "1px solid #12B7B530" }}>
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#12B7B5" }}>
                      <Lock size={11} />
                      <span>
                        {isRTL ? "تم التقاط التوقيع مع الطابع الزمني وبصمة الجهاز" : "Signature captured with timestamp & device fingerprint"}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={next}
                  disabled={!signed}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base disabled:opacity-40 shadow-lg"
                  style={{ background: "linear-gradient(90deg,#19A978,#0ECBA1)" }}
                >
                  {isRTL ? "تأكيد وإرسال الموافقة" : "Confirm & Submit Consent"}
                </button>
              </div>
            )}

            {/* STEP: Complete */}
            {step === "complete" && (
              <div className="flex flex-col items-center px-5 py-10 text-center space-y-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-2" style={{ background: "linear-gradient(135deg,#19A978,#0ECBA1)" }}>
                  <Check size={36} color="white" />
                </div>
                <h2 className="text-2xl font-bold" style={{ color: "#102A43" }}>
                  {isRTL ? "تم التوقيع بنجاح!" : "Consent Signed!"}
                </h2>
                <p className="text-sm" style={{ color: "#64798B" }}>
                  {isRTL
                    ? "تم توقيع موافقتك وإرسالها إلى الفريق الطبي. شكراً لكِ."
                    : "Your consent has been signed and sent to the medical team. Thank you."}
                </p>
                <div className="w-full p-5 rounded-2xl bg-white border space-y-3" style={{ borderColor: "#D8E8EF" }}>
                  <div className="w-28 h-28 mx-auto rounded-2xl flex items-center justify-center" style={{ background: "#F7FBFC" }}>
                    <QrCode size={64} style={{ color: "#123B5C" }} />
                  </div>
                  <div className="text-xs" style={{ color: "#64798B" }}>
                    {isRTL ? "رمز QR للتحقق من الموافقة" : "QR code to verify consent"}
                  </div>
                  <div className="text-xs font-mono" style={{ color: "#2F90C7" }}>WC-2026-0412 · Layla Hassan</div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold border text-sm" style={{ borderColor: "#D8E8EF", color: "#64798B" }}>
                  <Download size={15} /> {isRTL ? "تحميل PDF" : "Download PDF Copy"}
                </button>
                <p className="text-xs" style={{ color: "#64798B" }}>
                  {isRTL ? "سيتم إرسال نسخة إلى بريدك الإلكتروني" : "A copy will be sent to your email"}
                </p>
              </div>
            )}
          </div>

          {/* Bottom nav for non-first/last steps */}
          {step !== "language" && step !== "complete" && step !== "otp" && (
            <div className="bg-white border-t flex items-center justify-between px-5 py-3" style={{ borderColor: "#D8E8EF" }}>
              <button onClick={prev} className="flex items-center gap-1 text-sm" style={{ color: "#64798B" }}>
                <ChevronLeft size={14} /> {isRTL ? "السابق" : "Back"}
              </button>
              <div className="text-xs" style={{ color: "#64798B" }}>
                {isRTL ? "آمن ومشفر • WathiqCare" : "Secure • WathiqCare"}
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: "#19A978" }}>
                <Lock size={11} /> {isRTL ? "محمي" : "Secure"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
