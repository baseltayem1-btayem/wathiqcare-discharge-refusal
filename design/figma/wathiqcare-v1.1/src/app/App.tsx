import { useState } from "react";
import {
  Shield, CheckCircle, AlertTriangle, XCircle, ChevronRight, ChevronLeft,
  FileText, User, Phone, Lock, Eye, Download, Clock, Search,
  LogOut, MoreVertical, Info, AlertCircle, Building2, Stethoscope,
  ClipboardList, Activity, Hash, ArrowLeft, Globe, Check, X
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Lang = "ar" | "en";
type Flow = "patient" | "physician" | "legal";
type PatientScreen =
  | "landing" | "education" | "review" | "decision"
  | "otp" | "signature" | "confirmation"
  | "refusal-decision" | "refusal-ack" | "refusal-confirmed";
type PhysicianScreen = "consent-types" | "patient-lookup" | "dispatch" | "status-tracker";
type LegalScreen = "evidence" | "audit-chain" | "otp-log" | "pdf-status";

// ─── Translation strings ───────────────────────────────────────────────────────
const T = {
  ar: {
    platformName: "وثيق كير",
    platformSub: "منصة الموافقة الطبية الإلكترونية",
    hospitalName: "مستشفى الملك فهد التخصصي",
    step: "الخطوة",
    of: "من",

    // Landing
    landingTitle: "وصل إليك طلب موافقة طبية",
    landingDesc: "أرسل الفريق الطبي طلب موافقة على الإجراء الطبي. يُرجى مراجعة المعلومات بعناية قبل اتخاذ قرارك.",
    patientName: "محمد عبدالله الحارثي",
    mrn: "رقم الملف: MRN-20241187",
    consentType: "موافقة على عملية استئصال المرارة",
    physician: "د. سارة القحطاني — جراحة عامة",
    secureNotice: "هذا الرابط آمن ومشفر ومخصص لك فقط",
    proceed: "مراجعة الموافقة",

    // Education
    eduTitle: "فهم الإجراء الطبي",
    eduDesc: "اطلع على المعلومات التالية بتمعن. يحق لك طرح أي أسئلة قبل اتخاذ قرارك.",
    whatIs: "ما هو الإجراء؟",
    whatIsBody: "استئصال المرارة هو إجراء جراحي لإزالة المرارة، وهو علاج قياسي لحصوات المرارة والتهابها.",
    benefits: "الفوائد المتوقعة",
    benefit1: "إزالة الألم الناجم عن حصوات المرارة",
    benefit2: "منع مضاعفات الالتهاب المتكررة",
    benefit3: "إجراء بسيط بالمنظار في معظم الحالات",
    risks: "المخاطر المحتملة",
    risk1: "نزيف أو عدوى — نادر الحدوث",
    risk2: "تلف في القنوات الصفراوية — نادر جداً",
    risk3: "تخدير عام — مخاطر متعارف عليها",
    alternatives: "البدائل المتاحة",
    altBody: "إدارة الحالة بالأدوية دون تدخل جراحي، أو تأجيل الإجراء مع متابعة طبية.",
    faqTitle: "أسئلة شائعة",
    faq1Q: "كم تستغرق فترة التعافي؟",
    faq1A: "في العادة من يومين إلى أسبوع في المنزل بعد العملية.",
    faq2Q: "هل يمكنني رفض الإجراء؟",
    faq2A: "نعم، قرارك مُحترم تماماً. يمكنك الرفض في أي وقت دون أي ضغط.",
    continueReview: "متابعة للمراجعة",

    // Review
    reviewTitle: "مراجعة شروط الموافقة",
    reviewDesc: "اقرأ محتوى الموافقة بالكامل قبل الموافقة أو الرفض.",
    consentDoc: "وثيقة الموافقة الطبية",
    consentBody: "أنا المريض المذكور أعلاه أؤكد أنني اطلعت على معلومات كاملة حول الإجراء الطبي المقترح، شاملةً الفوائد والمخاطر والبدائل المتاحة، وأن الفريق الطبي أجاب على كافة تساؤلاتي بصورة مُرضية.",
    consentBody2: "أُقرّ بأنني أتخذ هذا القرار بمحض إرادتي وكامل أهليتي القانونية، دون إكراه أو ضغط من أي طرف.",
    legalNote: "هذه الموافقة مستوفية لمتطلبات نظام الرعاية الصحية السعودي ونظام حماية البيانات الشخصية (PDPL).",
    ackLabel: "أؤكد أنني قرأت وفهمت محتوى هذه الوثيقة",
    makeDecision: "اتخاذ القرار",

    // Decision
    decisionTitle: "قرارك بشأن الموافقة",
    decisionDesc: "اختر قرارك بحرية تامة. كلا الخيارين مُسجَّل ومعترف به قانونياً.",
    acceptBtn: "أوافق على الإجراء",
    refuseBtn: "أرفض الإجراء",
    acceptNote: "سيُطلب منك التحقق بكلمة مرور ثم التوقيع",
    refuseNote: "سيُسجَّل رفضك ويُبلَّغ الفريق الطبي",

    // OTP
    otpTitle: "التحقق من هويتك",
    otpDesc: "أُرسل رمز التحقق المكون من 6 أرقام إلى هاتفك المسجل.",
    otpPhone: "+966 5X XXX X847",
    otpExpiry: "الرمز صالح لمدة 10 دقائق",
    otpResend: "إعادة إرسال الرمز",
    otpVerify: "التحقق والمتابعة",

    // Signature
    sigTitle: "توقيعك الإلكتروني",
    sigDesc: "رسم توقيعك أدناه يُعدّ توقيعاً قانونياً معتمداً.",
    sigClear: "مسح التوقيع",
    sigConfirm: "تأكيد وإرسال الموافقة",
    sigLegal: "توقيعك مشفّر ومختوم بالوقت وفق معايير eIDAS المعتمدة.",

    // Confirmation
    confTitle: "تمت الموافقة بنجاح",
    confDesc: "تم تسجيل موافقتك وإرسالها بشكل آمن إلى الفريق الطبي.",
    refNum: "رقم المرجع",
    timestamp: "وقت التسجيل",
    downloadPdf: "تحميل نسخة PDF",
    done: "إنهاء",

    // Refusal
    refusalTitle: "تأكيد رفض الإجراء",
    refusalDesc: "أنت على وشك تسجيل رفضك لهذا الإجراء الطبي. قرارك مُحترم تماماً.",
    refusalNote: "سيُبلَّغ الفريق الطبي بقرارك وسيناقشون معك الخيارات المتاحة.",
    refusalAck: "أؤكد أن هذا قراري الحر دون أي ضغط خارجي",
    confirmRefusal: "تأكيد الرفض",
    refusalConfTitle: "تم تسجيل رفضك",
    refusalConfDesc: "تم تسجيل رفضك بشكل رسمي. سيتواصل معك الفريق الطبي قريباً لمناقشة الخيارات البديلة.",

    // Physician
    physicianTitle: "لوحة تحكم الطبيب",
    selectConsentType: "اختيار نوع الموافقة",
    patientLookup: "البحث عن المريض",
    dispatchConsent: "إرسال الموافقة",
    statusTracker: "متابعة الحالة",
    consentSurgery: "موافقة إجراء جراحي",
    consentAnesthesia: "موافقة تخدير",
    consentInvasive: "إجراء تداخلي",
    comingSoon: "قريباً",
    mrnLabel: "رقم الملف الطبي",
    searchBtn: "بحث",
    sendConsent: "إرسال طلب الموافقة",
    pendingStatus: "بانتظار الموافقة",
    completedStatus: "مكتملة",

    // Legal
    legalTitle: "مراجعة الامتثال القانوني",
    evidenceTitle: "حزمة الأدلة",
    auditChain: "سلسلة المراجعة",
    otpLog: "سجل رموز التحقق",
    pdfStatus: "حالة مستند PDF",
    consentHash: "بصمة الوثيقة (SHA-256)",
    version: "الإصدار",
    verified: "مُتحقق منه",
    generated: "تم الإنشاء",

    // Nav
    patientFlow: "تجربة المريض",
    physicianFlow: "واجهة الطبيب",
    legalFlow: "الامتثال القانوني",
    language: "EN",
  },
  en: {
    platformName: "WathiqCare™",
    platformSub: "Electronic Informed Consent Platform",
    hospitalName: "King Fahd Specialist Hospital",
    step: "Step",
    of: "of",

    landingTitle: "You have a medical consent request",
    landingDesc: "Your medical team has sent a consent request for a medical procedure. Please review the information carefully before making your decision.",
    patientName: "Mohammed Abdullah Al-Harthi",
    mrn: "MRN: MRN-20241187",
    consentType: "Consent for Laparoscopic Cholecystectomy",
    physician: "Dr. Sara Al-Qahtani — General Surgery",
    secureNotice: "This link is secure, encrypted, and intended solely for you",
    proceed: "Review Consent",

    eduTitle: "Understanding Your Procedure",
    eduDesc: "Please read the following carefully. You have the right to ask any questions before making your decision.",
    whatIs: "What is the procedure?",
    whatIsBody: "Cholecystectomy is a surgical procedure to remove the gallbladder. It is the standard treatment for gallstones and gallbladder inflammation.",
    benefits: "Expected Benefits",
    benefit1: "Elimination of pain caused by gallstones",
    benefit2: "Prevention of recurring inflammatory complications",
    benefit3: "Minimally invasive laparoscopic procedure in most cases",
    risks: "Potential Risks",
    risk1: "Bleeding or infection — rare",
    risk2: "Bile duct injury — very rare",
    risk3: "General anesthesia — standard known risks",
    alternatives: "Available Alternatives",
    altBody: "Medical management without surgery, or postponing the procedure with medical follow-up.",
    faqTitle: "Frequently Asked Questions",
    faq1Q: "How long is the recovery period?",
    faq1A: "Typically two days to one week at home after the procedure.",
    faq2Q: "Can I refuse the procedure?",
    faq2A: "Yes, your decision is fully respected. You may refuse at any time without any pressure.",
    continueReview: "Continue to Review",

    reviewTitle: "Review Consent Terms",
    reviewDesc: "Read the full consent content before accepting or refusing.",
    consentDoc: "Medical Consent Document",
    consentBody: "I, the above-named patient, confirm that I have been fully informed about the proposed medical procedure, including its benefits, risks, and available alternatives, and that the medical team has satisfactorily answered all my questions.",
    consentBody2: "I confirm that I am making this decision of my own free will and full legal capacity, without coercion or pressure from any party.",
    legalNote: "This consent complies with Saudi Healthcare Regulations and the Personal Data Protection Law (PDPL).",
    ackLabel: "I confirm that I have read and understood the content of this document",
    makeDecision: "Make My Decision",

    decisionTitle: "Your Consent Decision",
    decisionDesc: "Choose freely. Both options are legally recognized and recorded.",
    acceptBtn: "I Accept the Procedure",
    refuseBtn: "I Refuse the Procedure",
    acceptNote: "You will be asked to verify your identity and sign",
    refuseNote: "Your refusal will be recorded and the medical team will be notified",

    otpTitle: "Verify Your Identity",
    otpDesc: "A 6-digit verification code has been sent to your registered phone number.",
    otpPhone: "+966 5X XXX X847",
    otpExpiry: "Code valid for 10 minutes",
    otpResend: "Resend Code",
    otpVerify: "Verify and Continue",

    sigTitle: "Your Electronic Signature",
    sigDesc: "Drawing your signature below constitutes a legally binding electronic signature.",
    sigClear: "Clear Signature",
    sigConfirm: "Confirm and Submit Consent",
    sigLegal: "Your signature is encrypted and timestamped in accordance with eIDAS standards.",

    confTitle: "Consent Recorded Successfully",
    confDesc: "Your consent has been securely recorded and sent to the medical team.",
    refNum: "Reference Number",
    timestamp: "Recorded At",
    downloadPdf: "Download PDF Copy",
    done: "Done",

    refusalTitle: "Confirm Procedure Refusal",
    refusalDesc: "You are about to record your refusal of this medical procedure. Your decision is fully respected.",
    refusalNote: "The medical team will be notified of your decision and will discuss available options with you.",
    refusalAck: "I confirm this is my free decision without any external pressure",
    confirmRefusal: "Confirm Refusal",
    refusalConfTitle: "Refusal Recorded",
    refusalConfDesc: "Your refusal has been officially recorded. The medical team will contact you soon to discuss alternative options.",

    physicianTitle: "Physician Dashboard",
    selectConsentType: "Select Consent Type",
    patientLookup: "Patient Lookup",
    dispatchConsent: "Dispatch Consent",
    statusTracker: "Status Tracker",
    consentSurgery: "Surgical Consent",
    consentAnesthesia: "Anesthesia Consent",
    consentInvasive: "Invasive Procedure",
    comingSoon: "Coming Soon",
    mrnLabel: "Medical Record Number",
    searchBtn: "Search",
    sendConsent: "Send Consent Request",
    pendingStatus: "Pending",
    completedStatus: "Completed",

    legalTitle: "Legal Compliance Review",
    evidenceTitle: "Evidence Package",
    auditChain: "Audit Chain",
    otpLog: "OTP Event Log",
    pdfStatus: "PDF Document Status",
    consentHash: "Document Hash (SHA-256)",
    version: "Version",
    verified: "Verified",
    generated: "Generated",

    patientFlow: "Patient Journey",
    physicianFlow: "Physician View",
    legalFlow: "Legal Compliance",
    language: "AR",
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
function cls(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(" ");
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total, lang }: { current: number; total: number; lang: Lang }) {
  const t = T[lang];
  return (
    <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cls(
              "h-1.5 rounded-full transition-all",
              i < current ? "bg-primary w-6" : i === current - 1 ? "bg-primary w-8" : "bg-border w-4"
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground font-mono tabular-nums">
        {lang === "ar"
          ? `${current} ${t.of} ${total}`
          : `${t.step} ${current} ${t.of} ${total}`}
      </span>
    </div>
  );
}

// ─── Secure Notice Badge ──────────────────────────────────────────────────────
function SecureNoticeBadge({ lang }: { lang: Lang }) {
  return (
    <div className={cls(
      "flex items-center gap-2 px-3 py-2 rounded bg-[#E8EEF6] border border-[rgba(27,79,138,0.2)]",
      lang === "ar" ? "flex-row-reverse" : "flex-row"
    )}>
      <Lock size={13} className="text-primary shrink-0" />
      <span className="text-xs text-primary font-medium">{T[lang].secureNotice}</span>
    </div>
  );
}

// ─── Alert components ─────────────────────────────────────────────────────────
function Alert({ type, children, lang }: { type: "info" | "warning" | "success" | "error"; children: React.ReactNode; lang: Lang }) {
  const styles = {
    info: { bg: "bg-blue-50 border-blue-200", icon: <Info size={15} className="text-blue-600 shrink-0" /> },
    warning: { bg: "bg-amber-50 border-amber-200", icon: <AlertTriangle size={15} className="text-amber-600 shrink-0" /> },
    success: { bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle size={15} className="text-emerald-600 shrink-0" /> },
    error: { bg: "bg-red-50 border-red-200", icon: <XCircle size={15} className="text-red-600 shrink-0" /> },
  };
  return (
    <div className={cls("flex items-start gap-2 px-3 py-2.5 rounded border text-sm", lang === "ar" ? "flex-row-reverse text-right" : "flex-row", styles[type].bg)}>
      {styles[type].icon}
      <span className="text-foreground/80 leading-relaxed">{children}</span>
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cls("bg-card rounded-lg border border-border shadow-sm", className)}>
      {children}
    </div>
  );
}

// ─── Mobile Header ────────────────────────────────────────────────────────────
function MobileHeader({ lang, onLangToggle, onBack, step, totalSteps }: {
  lang: Lang; onLangToggle: () => void; onBack?: () => void; step?: number; totalSteps?: number;
}) {
  const t = T[lang];
  return (
    <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
      <div className={cls("flex items-center justify-between", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
        <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
          {onBack && (
            <button
              onClick={onBack}
              className={cls(
                "p-1.5 rounded hover:bg-muted transition-colors",
                lang === "ar" ? "rotate-180" : ""
              )}
            >
              <ArrowLeft size={18} className="text-foreground/70" />
            </button>
          )}
          <div className={cls("flex flex-col", lang === "ar" ? "items-end" : "items-start")}>
            <span className="text-sm font-bold text-primary leading-none">{t.platformName}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{t.hospitalName}</span>
          </div>
        </div>
        <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
          {step !== undefined && totalSteps !== undefined && (
            <StepIndicator current={step} total={totalSteps} lang={lang} />
          )}
          <button
            onClick={onLangToggle}
            className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            <Globe size={12} />
            {t.language}
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Patient Identity Card ─────────────────────────────────────────────────────
function PatientIdentityCard({ lang }: { lang: Lang }) {
  const t = T[lang];
  return (
    <Card className="p-4">
      <div className={cls("flex items-center gap-3", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User size={18} className="text-primary" />
        </div>
        <div className={cls("flex-1", lang === "ar" ? "text-right" : "text-left")}>
          <p className="text-sm font-semibold text-foreground">{t.patientName}</p>
          <p className="text-xs text-muted-foreground font-mono">{t.mrn}</p>
        </div>
        <Shield size={14} className="text-primary/50 shrink-0" />
      </div>
    </Card>
  );
}

// ─── Screen A: Secure Link Landing ───────────────────────────────────────────
function LandingScreen({ lang, onNext, onLangToggle }: { lang: Lang; onNext: () => void; onLangToggle: () => void }) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      <MobileHeader lang={lang} onLangToggle={onLangToggle} />
      <div className="flex-1 px-4 py-6 flex flex-col gap-5 max-w-md mx-auto w-full">
        {/* Trust header */}
        <div className={cls("flex flex-col gap-1", lang === "ar" ? "items-end text-right" : "items-start text-left")}>
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-1">
            <FileText size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground leading-tight">{t.landingTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.landingDesc}</p>
        </div>

        <PatientIdentityCard lang={lang} />

        {/* Consent info */}
        <Card className="p-4 flex flex-col gap-3">
          <div className={cls("flex flex-col gap-1", lang === "ar" ? "text-right" : "text-left")}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {lang === "ar" ? "نوع الموافقة" : "Consent Type"}
            </p>
            <p className="text-sm font-semibold text-foreground leading-snug">{t.consentType}</p>
          </div>
          <div className="h-px bg-border" />
          <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <Stethoscope size={14} className="text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">{t.physician}</p>
          </div>
          <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <Building2 size={14} className="text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">{t.hospitalName}</p>
          </div>
        </Card>

        <SecureNoticeBadge lang={lang} />

        <Alert type="info" lang={lang}>
          {lang === "ar"
            ? "هذا الطلب صادر رسمياً من الفريق الطبي. لا يُطلب منك أي دفع."
            : "This request is officially issued by your medical team. No payment is required."}
        </Alert>

        <button
          onClick={onNext}
          className={cls(
            "w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.99]",
            lang === "ar" ? "flex-row-reverse" : "flex-row"
          )}
        >
          {t.proceed}
          <ChevronRight size={16} className={lang === "ar" ? "rotate-180" : ""} />
        </button>
      </div>
    </div>
  );
}

// ─── Screen B: Education Materials ───────────────────────────────────────────
function EducationScreen({ lang, onNext, onBack, onLangToggle }: { lang: Lang; onNext: () => void; onBack: () => void; onLangToggle: () => void }) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      <MobileHeader lang={lang} onLangToggle={onLangToggle} onBack={onBack} step={2} totalSteps={7} />
      <div className="flex-1 px-4 py-5 flex flex-col gap-4 max-w-md mx-auto w-full">
        <div className={cls("flex flex-col gap-1", lang === "ar" ? "items-end text-right" : "items-start text-left")}>
          <h1 className="text-lg font-bold text-foreground">{t.eduTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.eduDesc}</p>
        </div>

        {/* What is section */}
        <Card className="p-4 flex flex-col gap-2">
          <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
              <Info size={13} className="text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{t.whatIs}</h2>
          </div>
          <p className={cls("text-sm text-muted-foreground leading-relaxed", lang === "ar" ? "text-right" : "text-left")}>{t.whatIsBody}</p>
        </Card>

        {/* Benefits */}
        <Card className="p-4 flex flex-col gap-2.5">
          <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
              <Check size={13} className="text-emerald-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{t.benefits}</h2>
          </div>
          {[t.benefit1, t.benefit2, t.benefit3].map((b, i) => (
            <div key={i} className={cls("flex items-start gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
              <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <span className={cls("text-sm text-foreground/80", lang === "ar" ? "text-right" : "text-left")}>{b}</span>
            </div>
          ))}
        </Card>

        {/* Risks */}
        <Card className="p-4 flex flex-col gap-2.5">
          <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={13} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{t.risks}</h2>
          </div>
          {[t.risk1, t.risk2, t.risk3].map((r, i) => (
            <div key={i} className={cls("flex items-start gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
              <AlertCircle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <span className={cls("text-sm text-foreground/80", lang === "ar" ? "text-right" : "text-left")}>{r}</span>
            </div>
          ))}
        </Card>

        {/* Alternatives */}
        <Card className="p-4 flex flex-col gap-2">
          <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
              <MoreVertical size={13} className="text-purple-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{t.alternatives}</h2>
          </div>
          <p className={cls("text-sm text-muted-foreground leading-relaxed", lang === "ar" ? "text-right" : "text-left")}>{t.altBody}</p>
        </Card>

        {/* FAQ accordion */}
        <Card className="overflow-hidden">
          <div className={cls("px-4 py-3 border-b border-border", lang === "ar" ? "text-right" : "text-left")}>
            <h2 className="text-sm font-semibold text-foreground">{t.faqTitle}</h2>
          </div>
          {[{ q: t.faq1Q, a: t.faq1A }, { q: t.faq2Q, a: t.faq2A }].map((item, i) => (
            <div key={i} className="border-b border-border last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className={cls(
                  "w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/50 transition-colors",
                  lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left"
                )}
              >
                <span className="flex-1 text-sm font-medium text-foreground">{item.q}</span>
                <ChevronRight size={14} className={cls("text-muted-foreground transition-transform shrink-0", openFaq === i ? "rotate-90" : "")} />
              </button>
              {openFaq === i && (
                <div className={cls("px-4 pb-3 text-sm text-muted-foreground leading-relaxed", lang === "ar" ? "text-right" : "text-left")}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </Card>

        <button
          onClick={onNext}
          className={cls(
            "w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors",
            lang === "ar" ? "flex-row-reverse" : "flex-row"
          )}
        >
          {t.continueReview}
          <ChevronRight size={16} className={lang === "ar" ? "rotate-180" : ""} />
        </button>
      </div>
    </div>
  );
}

// ─── Screen C: Consent Review ─────────────────────────────────────────────────
function ConsentReviewScreen({ lang, onNext, onBack, onLangToggle }: { lang: Lang; onNext: () => void; onBack: () => void; onLangToggle: () => void }) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [acked, setAcked] = useState(false);

  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      <MobileHeader lang={lang} onLangToggle={onLangToggle} onBack={onBack} step={3} totalSteps={7} />
      <div className="flex-1 px-4 py-5 flex flex-col gap-4 max-w-md mx-auto w-full">
        <div className={cls("flex flex-col gap-1", lang === "ar" ? "items-end text-right" : "items-start text-left")}>
          <h1 className="text-lg font-bold text-foreground">{t.reviewTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.reviewDesc}</p>
        </div>

        <Card className="p-4 flex flex-col gap-3">
          <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <FileText size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t.consentDoc}</h2>
          </div>
          <div className="h-px bg-border" />
          <div className="bg-muted/40 rounded p-3 max-h-52 overflow-y-auto space-y-3">
            <p className={cls("text-sm text-foreground/80 leading-relaxed", lang === "ar" ? "text-right" : "text-left")}>{t.consentBody}</p>
            <p className={cls("text-sm text-foreground/80 leading-relaxed", lang === "ar" ? "text-right" : "text-left")}>{t.consentBody2}</p>
          </div>
          <Alert type="info" lang={lang}>{t.legalNote}</Alert>
        </Card>

        {/* Legal hash display */}
        <Card className="p-3 flex flex-col gap-1">
          <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <Hash size={12} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {lang === "ar" ? "بصمة المستند" : "Document Hash"}
            </span>
          </div>
          <p className="font-mono text-[10px] text-muted-foreground break-all">
            a3f8c2d1e9b047a6f3c8d2e1b9a047c6f3d8a2e1b9c047d6
          </p>
        </Card>

        {/* Acknowledgement */}
        <button
          onClick={() => setAcked(!acked)}
          className={cls(
            "flex items-start gap-3 p-3 rounded-lg border transition-colors",
            lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left",
            acked ? "border-primary bg-primary/5" : "border-border bg-card"
          )}
        >
          <div className={cls(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
            acked ? "bg-primary border-primary" : "border-border bg-white"
          )}>
            {acked && <Check size={12} className="text-white" />}
          </div>
          <span className="text-sm text-foreground leading-relaxed">{t.ackLabel}</span>
        </button>

        <button
          onClick={onNext}
          disabled={!acked}
          className={cls(
            "w-full py-3.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors",
            lang === "ar" ? "flex-row-reverse" : "flex-row",
            acked
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {t.makeDecision}
          <ChevronRight size={16} className={lang === "ar" ? "rotate-180" : ""} />
        </button>
      </div>
    </div>
  );
}

// ─── Screen D: Decision ───────────────────────────────────────────────────────
function DecisionScreen({ lang, onAccept, onRefuse, onBack, onLangToggle }: {
  lang: Lang; onAccept: () => void; onRefuse: () => void; onBack: () => void; onLangToggle: () => void;
}) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      <MobileHeader lang={lang} onLangToggle={onLangToggle} onBack={onBack} step={4} totalSteps={7} />
      <div className="flex-1 px-4 py-6 flex flex-col gap-5 max-w-md mx-auto w-full">
        <div className={cls("flex flex-col gap-1", lang === "ar" ? "items-end text-right" : "items-start text-left")}>
          <h1 className="text-lg font-bold text-foreground">{t.decisionTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.decisionDesc}</p>
        </div>

        <PatientIdentityCard lang={lang} />

        <div className={cls("p-3 rounded-lg bg-muted/50 border border-border flex flex-col gap-1", lang === "ar" ? "text-right" : "text-left")}>
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "الإجراء المقترح" : "Proposed Procedure"}</p>
          <p className="text-sm font-semibold text-foreground">{t.consentType}</p>
        </div>

        <div className="flex flex-col gap-3 mt-2">
          {/* Accept */}
          <button
            onClick={onAccept}
            className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 flex flex-col items-center gap-1 hover:border-emerald-400 hover:bg-emerald-100 transition-colors active:scale-[0.99]"
          >
            <CheckCircle size={28} className="text-emerald-600" />
            <span className="text-base font-bold text-emerald-700">{t.acceptBtn}</span>
            <span className="text-xs text-emerald-600/70">{t.acceptNote}</span>
          </button>
          {/* Refuse */}
          <button
            onClick={onRefuse}
            className="w-full rounded-xl border-2 border-red-200 bg-red-50 p-4 flex flex-col items-center gap-1 hover:border-red-400 hover:bg-red-100 transition-colors active:scale-[0.99]"
          >
            <XCircle size={28} className="text-red-600" />
            <span className="text-base font-bold text-red-700">{t.refuseBtn}</span>
            <span className="text-xs text-red-600/70">{t.refuseNote}</span>
          </button>
        </div>

        <Alert type="info" lang={lang}>
          {lang === "ar"
            ? "كلا القرارين مُسجَّل قانونياً بسلسلة مراجعة كاملة. لا يوجد ضغط على أي خيار."
            : "Both decisions are legally recorded with a full audit chain. There is no pressure on either choice."}
        </Alert>
      </div>
    </div>
  );
}

// ─── Screen E: OTP ────────────────────────────────────────────────────────────
function OTPScreen({ lang, onNext, onBack, onLangToggle }: { lang: Lang; onNext: () => void; onBack: () => void; onLangToggle: () => void }) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resent, setResent] = useState(false);

  const handleOtp = (val: string, idx: number) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
  };

  const filled = otp.every(d => d !== "");

  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      <MobileHeader lang={lang} onLangToggle={onLangToggle} onBack={onBack} step={5} totalSteps={7} />
      <div className="flex-1 px-4 py-6 flex flex-col gap-5 max-w-md mx-auto w-full items-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Phone size={24} className="text-primary" />
        </div>
        <div className={cls("flex flex-col gap-1", lang === "ar" ? "items-end text-right" : "items-start text-left", "w-full")}>
          <h1 className="text-lg font-bold text-foreground">{t.otpTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.otpDesc}</p>
          <p className="text-sm font-mono font-semibold text-primary">{t.otpPhone}</p>
        </div>

        {/* OTP inputs */}
        <div className="flex gap-2 justify-center" dir="ltr">
          {otp.map((d, i) => (
            <input
              key={i}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleOtp(e.target.value, i)}
              className={cls(
                "w-11 h-13 text-center text-xl font-bold rounded-lg border-2 bg-card focus:outline-none transition-colors",
                d ? "border-primary text-primary" : "border-border text-foreground"
              )}
            />
          ))}
        </div>

        <div className={cls("flex items-center gap-1 text-xs text-muted-foreground", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
          <Clock size={12} />
          <span>{t.otpExpiry}</span>
        </div>

        {resent && (
          <Alert type="success" lang={lang}>
            {lang === "ar" ? "تم إعادة الإرسال بنجاح" : "Code resent successfully"}
          </Alert>
        )}

        <button
          onClick={() => setResent(true)}
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          {t.otpResend}
        </button>

        <button
          onClick={onNext}
          disabled={!filled}
          className={cls(
            "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors mt-auto",
            filled ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {t.otpVerify}
        </button>
      </div>
    </div>
  );
}

// ─── Screen F: Signature ──────────────────────────────────────────────────────
function SignatureScreen({ lang, onNext, onBack, onLangToggle }: { lang: Lang; onNext: () => void; onBack: () => void; onLangToggle: () => void }) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [signed, setSigned] = useState(false);
  const [drawing, setDrawing] = useState(false);

  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      <MobileHeader lang={lang} onLangToggle={onLangToggle} onBack={onBack} step={6} totalSteps={7} />
      <div className="flex-1 px-4 py-5 flex flex-col gap-4 max-w-md mx-auto w-full">
        <div className={cls("flex flex-col gap-1", lang === "ar" ? "items-end text-right" : "items-start text-left")}>
          <h1 className="text-lg font-bold text-foreground">{t.sigTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.sigDesc}</p>
        </div>

        <PatientIdentityCard lang={lang} />

        {/* Signature pad */}
        <div
          className={cls(
            "relative rounded-xl border-2 bg-white overflow-hidden cursor-crosshair select-none",
            signed ? "border-primary" : drawing ? "border-primary/50" : "border-dashed border-border",
          )}
          style={{ height: 180 }}
          onMouseDown={() => { setDrawing(true); setSigned(true); }}
          onMouseUp={() => setDrawing(false)}
          onTouchStart={() => { setDrawing(true); setSigned(true); }}
          onTouchEnd={() => setDrawing(false)}
        >
          {!signed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <div className="w-8 h-0.5 bg-muted-foreground/30 rounded" />
              <p className="text-xs text-muted-foreground">
                {lang === "ar" ? "ارسم توقيعك هنا" : "Draw your signature here"}
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <svg viewBox="0 0 300 120" className="w-full h-full opacity-70">
                <path
                  d="M 40 80 C 60 40, 80 90, 100 70 C 120 50, 130 85, 160 65 C 180 50, 195 80, 220 72 C 240 65, 250 75, 260 70"
                  stroke="#1B4F8A"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
          {/* baseline */}
          <div className="absolute bottom-8 left-8 right-8 h-px bg-muted-foreground/20" />
        </div>

        {signed && (
          <button
            onClick={() => setSigned(false)}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline self-center"
          >
            {t.sigClear}
          </button>
        )}

        <div className={cls("flex items-start gap-2 text-xs text-muted-foreground", lang === "ar" ? "flex-row-reverse text-right" : "flex-row")}>
          <Lock size={12} className="shrink-0 mt-0.5" />
          <span>{t.sigLegal}</span>
        </div>

        <button
          onClick={onNext}
          disabled={!signed}
          className={cls(
            "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors mt-auto",
            signed ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {t.sigConfirm}
        </button>
      </div>
    </div>
  );
}

// ─── Screen G: Confirmation ───────────────────────────────────────────────────
function ConfirmationScreen({ lang, onDone, onLangToggle }: { lang: Lang; onDone: () => void; onLangToggle: () => void }) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      <MobileHeader lang={lang} onLangToggle={onLangToggle} />
      <div className="flex-1 px-4 py-8 flex flex-col gap-5 max-w-md mx-auto w-full items-center text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle size={40} className="text-emerald-600" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-foreground">{t.confTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.confDesc}</p>
        </div>

        <Card className="p-4 w-full flex flex-col gap-3">
          <div className={cls("flex justify-between items-center", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <span className="text-xs text-muted-foreground">{t.refNum}</span>
            <span className="font-mono text-xs font-bold text-primary">WC-2024-118793</span>
          </div>
          <div className="h-px bg-border" />
          <div className={cls("flex justify-between items-center", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <span className="text-xs text-muted-foreground">{t.timestamp}</span>
            <span className="font-mono text-xs text-foreground/70">2024-11-18 14:32:07 AST</span>
          </div>
          <div className="h-px bg-border" />
          <div className={cls("flex justify-between items-center", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <span className="text-xs text-muted-foreground">{lang === "ar" ? "حالة التحقق" : "Verification"}</span>
            <div className="flex items-center gap-1">
              <Shield size={12} className="text-emerald-600" />
              <span className="text-xs text-emerald-600 font-semibold">OTP + Signature</span>
            </div>
          </div>
        </Card>

        <button
          className={cls(
            "w-full py-3 rounded-lg border border-primary text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors",
            lang === "ar" ? "flex-row-reverse" : "flex-row"
          )}
        >
          <Download size={15} />
          {t.downloadPdf}
        </button>

        <button onClick={onDone} className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
          {t.done}
        </button>
      </div>
    </div>
  );
}

// ─── Refusal Screens ──────────────────────────────────────────────────────────
function RefusalFlow({ lang, screen, onNext, onBack, onLangToggle }: {
  lang: Lang; screen: "refusal-decision" | "refusal-ack" | "refusal-confirmed";
  onNext: () => void; onBack: () => void; onLangToggle: () => void;
}) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [acked, setAcked] = useState(false);

  if (screen === "refusal-confirmed") {
    return (
      <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
        <MobileHeader lang={lang} onLangToggle={onLangToggle} />
        <div className="flex-1 px-4 py-10 flex flex-col gap-5 max-w-md mx-auto w-full items-center text-center">
          <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertCircle size={40} className="text-orange-600" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{t.refusalConfTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.refusalConfDesc}</p>
          <Card className="p-4 w-full">
            <div className={cls("flex justify-between items-center", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
              <span className="text-xs text-muted-foreground">{t.refNum}</span>
              <span className="font-mono text-xs font-bold text-orange-600">WC-REF-2024-4421</span>
            </div>
          </Card>
          <Alert type="warning" lang={lang}>
            {lang === "ar"
              ? "تم إبلاغ الفريق الطبي. سيتواصلون معك خلال 24 ساعة."
              : "The medical team has been notified. They will contact you within 24 hours."}
          </Alert>
          <button onClick={onBack} className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
            {t.done}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      <MobileHeader lang={lang} onLangToggle={onLangToggle} onBack={onBack} />
      <div className="flex-1 px-4 py-6 flex flex-col gap-5 max-w-md mx-auto w-full">
        <div className={cls("flex flex-col gap-2", lang === "ar" ? "items-end text-right" : "items-start text-left")}>
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle size={20} className="text-red-600" />
          </div>
          <h1 className="text-lg font-bold text-foreground">{t.refusalTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.refusalDesc}</p>
        </div>

        <PatientIdentityCard lang={lang} />

        <Alert type="warning" lang={lang}>{t.refusalNote}</Alert>

        <Alert type="info" lang={lang}>
          {lang === "ar"
            ? "رفضك مُسجَّل قانونياً وسيُحفظ في ملفك الطبي مع بصمة زمنية معتمدة."
            : "Your refusal is legally recorded and will be stored in your medical file with a certified timestamp."}
        </Alert>

        <button
          onClick={() => setAcked(!acked)}
          className={cls(
            "flex items-start gap-3 p-3 rounded-lg border transition-colors",
            lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left",
            acked ? "border-orange-400 bg-orange-50" : "border-border bg-card"
          )}
        >
          <div className={cls(
            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
            acked ? "bg-orange-500 border-orange-500" : "border-border bg-white"
          )}>
            {acked && <Check size={12} className="text-white" />}
          </div>
          <span className="text-sm text-foreground leading-relaxed">{t.refusalAck}</span>
        </button>

        <button
          onClick={onNext}
          disabled={!acked}
          className={cls(
            "w-full py-3.5 rounded-lg font-semibold text-sm transition-colors",
            acked ? "bg-red-600 text-white hover:bg-red-700" : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {t.confirmRefusal}
        </button>
      </div>
    </div>
  );
}

// ─── Physician Flow ───────────────────────────────────────────────────────────
function PhysicianFlow({ lang, screen, setScreen, onLangToggle }: {
  lang: Lang; screen: PhysicianScreen; setScreen: (s: PhysicianScreen) => void; onLangToggle: () => void;
}) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const [mrn, setMrn] = useState("");
  const [searched, setSearched] = useState(false);

  const navItems: { id: PhysicianScreen; label: string; icon: React.ReactNode }[] = [
    { id: "consent-types", label: t.selectConsentType, icon: <ClipboardList size={16} /> },
    { id: "patient-lookup", label: t.patientLookup, icon: <Search size={16} /> },
    { id: "dispatch", label: t.dispatchConsent, icon: <FileText size={16} /> },
    { id: "status-tracker", label: t.statusTracker, icon: <Activity size={16} /> },
  ];

  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      {/* Desktop header */}
      <header className="bg-card border-b border-border px-6 py-3 sticky top-0 z-10">
        <div className={cls("flex items-center justify-between max-w-5xl mx-auto", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
          <div className={cls("flex items-center gap-3", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Stethoscope size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary leading-none">{t.platformName}</p>
              <p className="text-[10px] text-muted-foreground">{t.physicianTitle}</p>
            </div>
          </div>
          <div className={cls("flex items-center gap-3", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={14} className="text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{lang === "ar" ? "د. سارة القحطاني" : "Dr. Sara Al-Qahtani"}</p>
                <p className="text-[10px] text-muted-foreground">{lang === "ar" ? "جراحة عامة" : "General Surgery"}</p>
              </div>
            </div>
            <button
              onClick={onLangToggle}
              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              <Globe size={12} />{t.language}
            </button>
            <button className="p-1.5 rounded hover:bg-muted text-muted-foreground">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full flex gap-0">
        {/* Sidebar nav */}
        <nav className={cls(
          "w-56 shrink-0 border-border bg-card p-3 flex flex-col gap-1 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto",
          lang === "ar" ? "border-l" : "border-r"
        )}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={cls(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
                lang === "ar" ? "flex-row-reverse text-right" : "flex-row text-left",
                screen === item.id ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted hover:text-foreground"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6">
          {screen === "consent-types" && (
            <div className="flex flex-col gap-5">
              <h2 className={cls("text-lg font-bold text-foreground", lang === "ar" ? "text-right" : "text-left")}>{t.selectConsentType}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: t.consentSurgery, desc: lang === "ar" ? "موافقة إجراءات جراحية معتمدة" : "Approved surgical procedure consent", active: true },
                  { label: t.consentAnesthesia, desc: lang === "ar" ? "موافقة بروتوكولات التخدير" : "Anesthesia protocol consent", active: true },
                  { label: t.consentInvasive, desc: lang === "ar" ? "إجراءات تداخلية تشخيصية" : "Diagnostic invasive procedures", active: false },
                  { label: lang === "ar" ? "موافقة نقل الدم" : "Blood Transfusion Consent", desc: lang === "ar" ? "بروتوكول نقل الدم" : "Blood transfusion protocol", active: false },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => item.active && setScreen("patient-lookup")}
                    className={cls(
                      "p-4 rounded-xl border-2 flex flex-col gap-2 transition-colors",
                      lang === "ar" ? "items-end text-right" : "items-start text-left",
                      item.active ? "border-border hover:border-primary/40 hover:bg-primary/3 cursor-pointer" : "border-dashed border-border/50 opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div className={cls("flex items-center gap-2 w-full", lang === "ar" ? "flex-row-reverse justify-between" : "flex-row justify-between")}>
                      <span className="text-sm font-semibold text-foreground">{item.label}</span>
                      {!item.active && (
                        <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground border border-border rounded px-1.5 py-0.5">
                          {t.comingSoon}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {screen === "patient-lookup" && (
            <div className="flex flex-col gap-5">
              <h2 className={cls("text-lg font-bold text-foreground", lang === "ar" ? "text-right" : "text-left")}>{t.patientLookup}</h2>
              <Card className="p-5">
                <div className="flex flex-col gap-3">
                  <label className={cls("text-sm font-semibold text-foreground", lang === "ar" ? "text-right" : "text-left")}>{t.mrnLabel}</label>
                  <div className={cls("flex gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                    <input
                      value={mrn}
                      onChange={e => setMrn(e.target.value)}
                      placeholder="MRN-XXXXXXXX"
                      dir="ltr"
                      className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-input-background font-mono text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    <button
                      onClick={() => setSearched(true)}
                      className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                      {t.searchBtn}
                    </button>
                  </div>
                </div>
              </Card>

              {searched && (
                <Card className="p-4 flex flex-col gap-3">
                  <div className={cls("flex items-center gap-3", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className={cls("flex-1", lang === "ar" ? "text-right" : "text-left")}>
                      <p className="text-sm font-semibold">{t.patientName}</p>
                      <p className="text-xs font-mono text-muted-foreground">MRN-20241187 · {lang === "ar" ? "ذكر · ٤٥ سنة" : "Male · 45 yrs"}</p>
                    </div>
                    <CheckCircle size={16} className="text-emerald-500" />
                  </div>
                  <button
                    onClick={() => setScreen("dispatch")}
                    className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {t.sendConsent}
                  </button>
                </Card>
              )}
            </div>
          )}

          {screen === "dispatch" && (
            <div className="flex flex-col gap-5">
              <h2 className={cls("text-lg font-bold text-foreground", lang === "ar" ? "text-right" : "text-left")}>{t.dispatchConsent}</h2>
              <Card className="p-5 flex flex-col gap-4">
                {[
                  { label: lang === "ar" ? "المريض" : "Patient", value: t.patientName },
                  { label: lang === "ar" ? "رقم الملف" : "MRN", value: "MRN-20241187", mono: true },
                  { label: lang === "ar" ? "نوع الموافقة" : "Consent Type", value: t.consentType },
                  { label: lang === "ar" ? "الطبيب المسؤول" : "Physician", value: t.physician },
                  { label: lang === "ar" ? "طريقة الإرسال" : "Delivery", value: lang === "ar" ? "رابط SMS آمن" : "Secure SMS Link" },
                ].map((row, i) => (
                  <div key={i} className={cls("flex justify-between items-start", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className={cls("text-sm font-medium text-foreground max-w-xs", lang === "ar" ? "text-right" : "text-left", row.mono ? "font-mono" : "")}>{row.value}</span>
                  </div>
                ))}
                <div className="h-px bg-border" />
                <Alert type="warning" lang={lang}>
                  {lang === "ar"
                    ? "بعد الإرسال، لا يمكن تعديل محتوى الموافقة. تأكد من صحة المعلومات."
                    : "After dispatch, consent content cannot be modified. Verify all information."}
                </Alert>
                <button
                  onClick={() => setScreen("status-tracker")}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  {t.sendConsent}
                </button>
              </Card>
            </div>
          )}

          {screen === "status-tracker" && (
            <div className="flex flex-col gap-5">
              <h2 className={cls("text-lg font-bold text-foreground", lang === "ar" ? "text-right" : "text-left")}>{t.statusTracker}</h2>
              {[
                { name: t.patientName, mrn: "MRN-20241187", status: "signed", time: "14:32" },
                { name: lang === "ar" ? "فاطمة علي المطيري" : "Fatima Ali Al-Mutairi", mrn: "MRN-20241156", status: "pending", time: "09:15" },
                { name: lang === "ar" ? "خالد إبراهيم السلمي" : "Khalid Ibrahim Al-Salmi", mrn: "MRN-20241201", status: "pending", time: "11:48" },
              ].map((p, i) => (
                <Card key={i} className="p-4">
                  <div className={cls("flex items-center gap-3", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={15} className="text-primary" />
                    </div>
                    <div className={cls("flex-1", lang === "ar" ? "text-right" : "text-left")}>
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{p.mrn}</p>
                    </div>
                    <div className={cls("flex flex-col items-end gap-1", lang === "ar" ? "items-start" : "items-end")}>
                      <span className={cls(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        p.status === "signed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {p.status === "signed" ? t.completedStatus : t.pendingStatus}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">{p.time}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Legal Compliance Flow ────────────────────────────────────────────────────
function LegalFlow({ lang, screen, setScreen, onLangToggle }: {
  lang: Lang; screen: LegalScreen; setScreen: (s: LegalScreen) => void; onLangToggle: () => void;
}) {
  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const navItems: { id: LegalScreen; label: string }[] = [
    { id: "evidence", label: t.evidenceTitle },
    { id: "audit-chain", label: t.auditChain },
    { id: "otp-log", label: t.otpLog },
    { id: "pdf-status", label: t.pdfStatus },
  ];

  const auditEvents = [
    { time: "2024-11-18 14:22:01", event: lang === "ar" ? "إرسال رابط الموافقة عبر SMS" : "Consent link dispatched via SMS", actor: "Dr. Al-Qahtani", type: "dispatch" },
    { time: "2024-11-18 14:24:15", event: lang === "ar" ? "فتح المريض للرابط" : "Patient opened consent link", actor: "Patient", type: "access" },
    { time: "2024-11-18 14:27:40", event: lang === "ar" ? "اطلع المريض على مواد التعليم" : "Patient viewed education materials", actor: "Patient", type: "view" },
    { time: "2024-11-18 14:30:05", event: lang === "ar" ? "قرأ المريض وثيقة الموافقة" : "Patient reviewed consent document", actor: "Patient", type: "view" },
    { time: "2024-11-18 14:31:12", event: lang === "ar" ? "طلب رمز OTP" : "OTP code requested", actor: "System", type: "otp" },
    { time: "2024-11-18 14:31:58", event: lang === "ar" ? "تم التحقق من OTP بنجاح" : "OTP verified successfully", actor: "Patient", type: "otp" },
    { time: "2024-11-18 14:32:07", event: lang === "ar" ? "تم رسم التوقيع وإرساله" : "Signature drawn and submitted", actor: "Patient", type: "sign" },
    { time: "2024-11-18 14:32:08", event: lang === "ar" ? "تم إصدار حزمة الأدلة" : "Evidence package generated", actor: "System", type: "complete" },
  ];

  const eventColors: Record<string, string> = {
    dispatch: "text-blue-600",
    access: "text-purple-600",
    view: "text-sky-600",
    otp: "text-amber-600",
    sign: "text-emerald-600",
    complete: "text-emerald-700",
  };

  return (
    <div dir={dir} className={cls("min-h-screen bg-background flex flex-col", lang === "ar" ? "font-[Noto_Sans_Arabic]" : "font-[Inter]")}>
      <header className="bg-card border-b border-border px-6 py-3 sticky top-0 z-10">
        <div className={cls("flex items-center justify-between max-w-5xl mx-auto", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
          <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
            <Shield size={18} className="text-primary" />
            <div>
              <p className="text-sm font-bold text-primary leading-none">{t.platformName}</p>
              <p className="text-[10px] text-muted-foreground">{t.legalTitle}</p>
            </div>
          </div>
          <button
            onClick={onLangToggle}
            className="flex items-center gap-1 px-2 py-1 rounded border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <Globe size={12} />{t.language}
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full flex gap-0">
        <nav className={cls(
          "w-52 shrink-0 border-border bg-card p-3 flex flex-col gap-1 sticky top-14 self-start",
          lang === "ar" ? "border-l" : "border-r"
        )}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={cls(
                "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
                lang === "ar" ? "text-right" : "text-left",
                screen === item.id ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6 flex flex-col gap-5">
          {screen === "evidence" && (
            <>
              <h2 className={cls("text-lg font-bold text-foreground", lang === "ar" ? "text-right" : "text-left")}>{t.evidenceTitle}</h2>
              <Card className="p-5 flex flex-col gap-4">
                {[
                  { label: t.refNum ?? "Ref", value: "WC-2024-118793" },
                  { label: t.consentHash, value: "a3f8c2d1e9b047a6f3c8d2e1b9a047c6" },
                  { label: t.version, value: "v2.4.1" },
                  { label: t.verified, value: "OTP + Biometric Signature" },
                  { label: t.generated, value: "2024-11-18 14:32:08 UTC+3" },
                ].map((row, i) => (
                  <div key={i} className={cls("flex justify-between items-start gap-4", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                    <span className={cls("font-mono text-xs text-foreground break-all", lang === "ar" ? "text-right" : "text-left")}>{row.value}</span>
                  </div>
                ))}
              </Card>
              <Card className="p-4 flex flex-col gap-3">
                <div className={cls("flex items-center gap-2", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                  <Shield size={15} className="text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">{lang === "ar" ? "شهادة صحة الأدلة" : "Evidence Integrity Certificate"}</h3>
                </div>
                <Alert type="success" lang={lang}>
                  {lang === "ar"
                    ? "تم التحقق من سلامة حزمة الأدلة. لم يطرأ أي تعديل على الوثيقة بعد التوقيع."
                    : "Evidence package integrity verified. No modifications detected after signing."}
                </Alert>
              </Card>
            </>
          )}

          {screen === "audit-chain" && (
            <>
              <h2 className={cls("text-lg font-bold text-foreground", lang === "ar" ? "text-right" : "text-left")}>{t.auditChain}</h2>
              <div className="flex flex-col gap-0">
                {auditEvents.map((ev, i) => (
                  <div key={i} className={cls("flex gap-3 pb-4 relative", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                    {i < auditEvents.length - 1 && (
                      <div className={cls(
                        "absolute top-5 bottom-0 w-px bg-border",
                        lang === "ar" ? "right-2.5" : "left-2.5"
                      )} />
                    )}
                    <div className={cls("w-5 h-5 rounded-full border-2 border-border bg-card shrink-0 mt-0.5 z-10", eventColors[ev.type].replace("text-", "border-"))} />
                    <div className={cls("flex-1 bg-card rounded-lg border border-border p-3 flex flex-col gap-1", lang === "ar" ? "text-right" : "text-left")}>
                      <p className="text-sm font-medium text-foreground">{ev.event}</p>
                      <div className={cls("flex gap-3 text-xs text-muted-foreground", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                        <span className="font-mono">{ev.time}</span>
                        <span>·</span>
                        <span>{ev.actor}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {screen === "otp-log" && (
            <>
              <h2 className={cls("text-lg font-bold text-foreground", lang === "ar" ? "text-right" : "text-left")}>{t.otpLog}</h2>
              <Card className="overflow-hidden">
                <div className={cls("grid grid-cols-4 px-4 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide", lang === "ar" ? "text-right" : "text-left")}>
                  {(lang === "ar" ? ["الوقت", "الرقم", "الحالة", "IP"] : ["Time", "Phone", "Status", "IP"]).map((h, i) => (
                    <span key={i}>{h}</span>
                  ))}
                </div>
                {[
                  { time: "14:31:12", phone: "+966 5X XXX X847", status: "sent", ip: "10.X.X.X" },
                  { time: "14:31:58", phone: "+966 5X XXX X847", status: "verified", ip: "10.X.X.X" },
                ].map((row, i) => (
                  <div key={i} className={cls("grid grid-cols-4 px-4 py-3 border-b border-border last:border-0 text-xs", lang === "ar" ? "text-right" : "text-left")}>
                    <span className="font-mono text-foreground">{row.time}</span>
                    <span className="font-mono text-muted-foreground">{row.phone}</span>
                    <span className={cls(
                      "font-semibold",
                      row.status === "verified" ? "text-emerald-600" : "text-amber-600"
                    )}>
                      {row.status === "verified"
                        ? (lang === "ar" ? "تم التحقق" : "Verified")
                        : (lang === "ar" ? "مُرسَل" : "Sent")}
                    </span>
                    <span className="font-mono text-muted-foreground">{row.ip}</span>
                  </div>
                ))}
              </Card>
            </>
          )}

          {screen === "pdf-status" && (
            <>
              <h2 className={cls("text-lg font-bold text-foreground", lang === "ar" ? "text-right" : "text-left")}>{t.pdfStatus}</h2>
              <Card className="p-5 flex flex-col gap-4">
                <div className={cls("flex items-center gap-3", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                  <div className="w-10 h-10 rounded bg-red-50 border border-red-200 flex items-center justify-center">
                    <FileText size={18} className="text-red-500" />
                  </div>
                  <div className={cls("flex-1", lang === "ar" ? "text-right" : "text-left")}>
                    <p className="text-sm font-semibold text-foreground">
                      {lang === "ar" ? "وثيقة الموافقة — WC-2024-118793.pdf" : "Consent Document — WC-2024-118793.pdf"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">2024-11-18 14:32:08 · 142 KB</p>
                  </div>
                </div>
                <div className="h-px bg-border" />
                {[
                  { label: lang === "ar" ? "الحالة" : "Status", value: lang === "ar" ? "تم الإنشاء" : "Generated", ok: true },
                  { label: lang === "ar" ? "الختم الزمني" : "Timestamp", value: "2024-11-18 14:32:08 UTC+3", ok: true },
                  { label: lang === "ar" ? "التوقيع الرقمي" : "Digital Signature", value: lang === "ar" ? "موقَّع ومُتحقَّق منه" : "Signed & Verified", ok: true },
                  { label: lang === "ar" ? "التشفير" : "Encryption", value: "AES-256-GCM", ok: true },
                  { label: lang === "ar" ? "نسخة الاحتفاظ" : "Retention Copy", value: lang === "ar" ? "مُرسَلة لنظام الأرشيف" : "Sent to Archive System", ok: true },
                ].map((row, i) => (
                  <div key={i} className={cls("flex justify-between items-center", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <div className={cls("flex items-center gap-1.5", lang === "ar" ? "flex-row-reverse" : "flex-row")}>
                      {row.ok && <CheckCircle size={12} className="text-emerald-500" />}
                      <span className="text-xs font-mono text-foreground/80">{row.value}</span>
                    </div>
                  </div>
                ))}
                <button className={cls(
                  "flex items-center gap-2 mt-1 py-2.5 px-4 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors",
                  lang === "ar" ? "flex-row-reverse self-end" : "flex-row self-start"
                )}>
                  <Download size={14} />
                  {lang === "ar" ? "تحميل PDF" : "Download PDF"}
                </button>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Flow Switcher ────────────────────────────────────────────────────────────
function FlowSwitcher({ flow, setFlow, lang }: { flow: Flow; setFlow: (f: Flow) => void; lang: Lang }) {
  const t = T[lang];
  const flows: { id: Flow; label: string; icon: React.ReactNode }[] = [
    { id: "patient", label: t.patientFlow, icon: <User size={14} /> },
    { id: "physician", label: t.physicianFlow, icon: <Stethoscope size={14} /> },
    { id: "legal", label: t.legalFlow, icon: <Shield size={14} /> },
  ];

  return (
    <div className={cls(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-foreground/90 backdrop-blur p-1 rounded-full shadow-xl",
      lang === "ar" ? "flex-row-reverse" : "flex-row"
    )}>
      {flows.map(f => (
        <button
          key={f.id}
          onClick={() => setFlow(f.id)}
          className={cls(
            "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all",
            lang === "ar" ? "flex-row-reverse" : "flex-row",
            flow === f.id ? "bg-white text-foreground shadow" : "text-white/70 hover:text-white"
          )}
        >
          {f.icon}
          <span className="hidden sm:inline">{f.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState<Lang>("ar");
  const [flow, setFlow] = useState<Flow>("patient");
  const [patientScreen, setPatientScreen] = useState<PatientScreen>("landing");
  const [physicianScreen, setPhysicianScreen] = useState<PhysicianScreen>("consent-types");
  const [legalScreen, setLegalScreen] = useState<LegalScreen>("evidence");

  const toggleLang = () => setLang(l => l === "ar" ? "en" : "ar");

  const handleFlowChange = (f: Flow) => {
    setFlow(f);
    if (f === "patient") setPatientScreen("landing");
    if (f === "physician") setPhysicianScreen("consent-types");
    if (f === "legal") setLegalScreen("evidence");
  };

  const patientNav = {
    landing: { next: () => setPatientScreen("education") },
    education: { next: () => setPatientScreen("review"), back: () => setPatientScreen("landing") },
    review: { next: () => setPatientScreen("decision"), back: () => setPatientScreen("education") },
    decision: {
      accept: () => setPatientScreen("otp"),
      refuse: () => setPatientScreen("refusal-decision"),
      back: () => setPatientScreen("review"),
    },
    otp: { next: () => setPatientScreen("signature"), back: () => setPatientScreen("decision") },
    signature: { next: () => setPatientScreen("confirmation"), back: () => setPatientScreen("otp") },
    confirmation: { done: () => setPatientScreen("landing") },
    "refusal-decision": { next: () => setPatientScreen("refusal-ack"), back: () => setPatientScreen("decision") },
    "refusal-ack": { next: () => setPatientScreen("refusal-confirmed"), back: () => setPatientScreen("refusal-decision") },
    "refusal-confirmed": { back: () => setPatientScreen("landing") },
  };

  return (
    <div className="min-h-screen bg-background">
      {flow === "patient" && (
        <>
          {patientScreen === "landing" && (
            <LandingScreen lang={lang} onNext={patientNav.landing.next} onLangToggle={toggleLang} />
          )}
          {patientScreen === "education" && (
            <EducationScreen lang={lang} onNext={patientNav.education.next} onBack={patientNav.education.back} onLangToggle={toggleLang} />
          )}
          {patientScreen === "review" && (
            <ConsentReviewScreen lang={lang} onNext={patientNav.review.next} onBack={patientNav.review.back} onLangToggle={toggleLang} />
          )}
          {patientScreen === "decision" && (
            <DecisionScreen
              lang={lang}
              onAccept={patientNav.decision.accept}
              onRefuse={patientNav.decision.refuse}
              onBack={patientNav.decision.back}
              onLangToggle={toggleLang}
            />
          )}
          {patientScreen === "otp" && (
            <OTPScreen lang={lang} onNext={patientNav.otp.next} onBack={patientNav.otp.back} onLangToggle={toggleLang} />
          )}
          {patientScreen === "signature" && (
            <SignatureScreen lang={lang} onNext={patientNav.signature.next} onBack={patientNav.signature.back} onLangToggle={toggleLang} />
          )}
          {patientScreen === "confirmation" && (
            <ConfirmationScreen lang={lang} onDone={patientNav.confirmation.done} onLangToggle={toggleLang} />
          )}
          {(patientScreen === "refusal-decision" || patientScreen === "refusal-ack" || patientScreen === "refusal-confirmed") && (
            <RefusalFlow
              lang={lang}
              screen={patientScreen}
              onNext={
                patientScreen === "refusal-decision" ? patientNav["refusal-decision"].next :
                patientScreen === "refusal-ack" ? patientNav["refusal-ack"].next :
                () => setPatientScreen("landing")
              }
              onBack={
                patientScreen === "refusal-decision" ? patientNav["refusal-decision"].back :
                patientScreen === "refusal-ack" ? patientNav["refusal-ack"].back :
                patientNav["refusal-confirmed"].back
              }
              onLangToggle={toggleLang}
            />
          )}
        </>
      )}

      {flow === "physician" && (
        <PhysicianFlow
          lang={lang}
          screen={physicianScreen}
          setScreen={setPhysicianScreen}
          onLangToggle={toggleLang}
        />
      )}

      {flow === "legal" && (
        <LegalFlow
          lang={lang}
          screen={legalScreen}
          setScreen={setLegalScreen}
          onLangToggle={toggleLang}
        />
      )}

      <FlowSwitcher flow={flow} setFlow={handleFlowChange} lang={lang} />
    </div>
  );
}
