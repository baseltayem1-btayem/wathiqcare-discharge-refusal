"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  FileText,
  HeartPulse,
  Home,
  Languages,
  Laptop,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Syringe,
  Tablet,
  UserRound,
} from "lucide-react";

type Lang = "en" | "ar";
type StepKey = "patient" | "template" | "procedure" | "anesthesia" | "education" | "review" | "send";

type ConsentTemplate = {
  id: string;
  title: string;
  titleAr: string;
  department: string;
  departmentAr: string;
  type: string;
  typeAr: string;
};

const approvedTemplates: ConsentTemplate[] = [
  {
    id: "IMC-CONS-CABG-2025-001",
    title: "Coronary Artery Bypass Grafting Consent",
    titleAr: "موافقة جراحة تحويل مسار الشريان التاجي",
    department: "Cardiac Surgery",
    departmentAr: "جراحة القلب",
    type: "Surgical Consent",
    typeAr: "موافقة جراحية",
  },
  {
    id: "IMC-CONS-ANES-2025-006",
    title: "Anesthesia Consent",
    titleAr: "موافقة التخدير",
    department: "Anesthesia",
    departmentAr: "التخدير",
    type: "Anesthesia Consent",
    typeAr: "موافقة التخدير",
  },
  {
    id: "IMC-CONS-ENDO-2025-010",
    title: "Endoscopy Procedure Consent",
    titleAr: "موافقة إجراء المنظار",
    department: "Endoscopy",
    departmentAr: "المناظير",
    type: "Procedure Consent",
    typeAr: "موافقة إجراء",
  },
  {
    id: "IMC-CONS-ICU-2025-004",
    title: "Critical Care Treatment Consent",
    titleAr: "موافقة علاج العناية الحرجة",
    department: "ICU",
    departmentAr: "العناية الحرجة",
    type: "Treatment Consent",
    typeAr: "موافقة علاجية",
  },
];

const copy = {
  en: {
    brand: "WathiqCare",
    brandSub: "Smart Consent Portal",
    doctorWorkspace: "Doctor Workspace",
    consentRecords: "Consent Records",
    approvedForms: "Approved Forms",
    anesthesiaQueue: "Anesthesia Queue",
    governance: "Governance",
    support: "Support",
    welcome: "Welcome to WathiqCare",
    welcomeSub: "Doctor journey inside the hospital. Patient journey through a secure public link.",
    alerts: "Alerts",
    heroTag: "Document understanding",
    heroTitle: "Doctor creates. Patient reviews and signs from any device.",
    heroText:
      "WathiqCare separates the clinical workflow from the patient experience: the physician prepares the consent, then the patient receives a secure public link by SMS to review, understand, verify by OTP, and sign.",
    startJourney: "Start doctor journey",
    previewPublic: "Preview patient public link",
    doctorServices: "Doctor services",
    patientPublicExperience: "Patient public-link experience",
    createConsent: "Create consent",
    createConsentSub: "Prepare and send a new consent",
    pendingConsents: "Pending consents",
    pendingConsentsSub: "Track unsigned and active records",
    formsSub: "Use hospital-approved templates",
    smsLink: "SMS link",
    smsLinkSub: "Secure public consent access",
    patientEducation: "Patient education",
    patientEducationSub: "Clear explanation before signing",
    otpSignature: "OTP + signature",
    otpSignatureSub: "Review and sign on any device",
    patient: "Patient",
    template: "Template",
    procedure: "Procedure",
    anesthesia: "Anesthesia",
    education: "Education",
    review: "Review",
    send: "Send",
    patientContext: "Patient Context",
    patientContextText: "The doctor starts here. Patient identity and encounter must be confirmed before creating the consent.",
    mrn: "MRN",
    encounter: "Encounter",
    physician: "Physician",
    patientName: "Mr. Ramesh Kumar",
    encounterValue: "OPD / Cardiac Surgery",
    physicianValue: "Dr. Arjun Mehta",
    approvedTemplate: "Approved Consent Template",
    approvedTemplateText: "The doctor selects the correct hospital-approved form before adding clinical details.",
    searchPlaceholder: "Search by template, Arabic title, department, or ID",
    procedureDetails: "Procedure Details",
    procedureText: "The doctor confirms the procedure and the clinical explanation that will appear to the patient.",
    procedureName: "Procedure Name",
    procedureDefault: "Coronary Artery Bypass Grafting (CABG)",
    clinicalNote: "Clinical Note",
    clinicalNoteDefault:
      "The patient was informed about the nature, benefits, material risks, alternatives, and possible complications of the proposed procedure.",
    anesthesiaDecision: "Anesthesia Decision",
    anesthesiaText: "If anesthesia applies, WathiqCare keeps it within the same consent record and triggers the anesthesia section.",
    anesthesiaRequired: "Anesthesia Required",
    anesthesiaRequiredSub: "Trigger anesthesiologist section",
    notApplicable: "Not Applicable",
    notApplicableSub: "No anesthesia workflow required",
    educationTitle: "Patient Education",
    educationText: "The patient will review the education material through the public link before OTP and signature.",
    educationItems: ["Procedure explanation", "Risks and benefits", "Alternatives", "Post-procedure care"],
    educationConfirm: "I confirm the patient education material is ready for the public link.",
    smartReview: "Smart Review",
    smartReviewText: "Before sending, the doctor confirms that the consent is ready for patient public-link access.",
    readiness: "Readiness Score",
    sendPublic: "Send Patient Public Link",
    sendPublicText: "The patient receives a secure public link by SMS and may open it from mobile, tablet, or personal computer.",
    mobile: "Mobile",
    mobileSub: "SMS public link",
    tablet: "Tablet",
    tabletSub: "Bedside or personal tablet",
    computer: "Computer",
    computerSub: "Home or office browser",
    sendSecure: "Send Secure Public Link",
    summary: "Consent Summary",
    summarySub: "Doctor-side operational context",
    patientAccess: "Patient access",
    publicSms: "Public SMS link",
    aiNote: "The patient journey is not inside this page. It starts from the secure public link sent by SMS.",
    back: "Back",
    continue: "Continue",
    required: "Required",
    pending: "Pending",
    confirmed: "Confirmed",
  },
  ar: {
    brand: "واثق كير",
    brandSub: "بوابة الموافقات الذكية",
    doctorWorkspace: "مساحة الطبيب",
    consentRecords: "سجلات الموافقات",
    approvedForms: "النماذج المعتمدة",
    anesthesiaQueue: "مسار التخدير",
    governance: "الحوكمة",
    support: "الدعم",
    welcome: "مرحبًا بك في واثق كير",
    welcomeSub: "رحلة الطبيب داخل المستشفى، ورحلة المريض عبر رابط عام آمن يُرسل له.",
    alerts: "التنبيهات",
    heroTag: "وثّق فهمه",
    heroTitle: "الطبيب يجهّز الموافقة، والمريض يراجع ويوقّع من أي جهاز.",
    heroText:
      "يفصل واثق كير بين رحلة الطبيب التشغيلية ورحلة المريض. يقوم الطبيب بإعداد الموافقة، ثم يستلم المريض رابطًا عامًا آمنًا عبر رسالة جوال للمراجعة والفهم والتحقق برمز OTP والتوقيع.",
    startJourney: "ابدأ رحلة الطبيب",
    previewPublic: "معاينة رابط المريض",
    doctorServices: "خدمات الطبيب",
    patientPublicExperience: "تجربة المريض عبر الرابط العام",
    createConsent: "إنشاء موافقة",
    createConsentSub: "إعداد وإرسال موافقة جديدة",
    pendingConsents: "الموافقات المعلقة",
    pendingConsentsSub: "متابعة السجلات غير الموقعة",
    formsSub: "استخدام النماذج المعتمدة",
    smsLink: "رابط رسالة الجوال",
    smsLinkSub: "دخول آمن للموافقة",
    patientEducation: "تثقيف المريض",
    patientEducationSub: "شرح واضح قبل التوقيع",
    otpSignature: "OTP + التوقيع",
    otpSignatureSub: "مراجعة وتوقيع من أي جهاز",
    patient: "المريض",
    template: "النموذج",
    procedure: "الإجراء",
    anesthesia: "التخدير",
    education: "التثقيف",
    review: "المراجعة",
    send: "الإرسال",
    patientContext: "بيانات المريض",
    patientContextText: "يبدأ الطبيب من هنا. يجب تأكيد هوية المريض والزيارة قبل إنشاء الموافقة.",
    mrn: "رقم الملف",
    encounter: "الزيارة",
    physician: "الطبيب",
    patientName: "السيد راميش كومار",
    encounterValue: "عيادة خارجية / جراحة القلب",
    physicianValue: "د. أرجون ميهتا",
    approvedTemplate: "نموذج الموافقة المعتمد",
    approvedTemplateText: "يختار الطبيب النموذج المعتمد المناسب قبل إضافة التفاصيل السريرية.",
    searchPlaceholder: "ابحث باسم النموذج أو العنوان العربي أو القسم أو رقم النموذج",
    procedureDetails: "تفاصيل الإجراء",
    procedureText: "يؤكد الطبيب اسم الإجراء والشرح السريري الذي سيظهر للمريض.",
    procedureName: "اسم الإجراء",
    procedureDefault: "جراحة تحويل مسار الشريان التاجي",
    clinicalNote: "الملاحظة السريرية",
    clinicalNoteDefault:
      "تم إبلاغ المريض بطبيعة الإجراء المقترح وفوائده ومخاطره الجوهرية والبدائل والمضاعفات المحتملة.",
    anesthesiaDecision: "قرار التخدير",
    anesthesiaText: "إذا كان التخدير مطلوبًا، يحتفظ واثق كير بالمسار ضمن نفس سجل الموافقة ويفعّل قسم التخدير.",
    anesthesiaRequired: "التخدير مطلوب",
    anesthesiaRequiredSub: "تفعيل قسم طبيب التخدير",
    notApplicable: "غير منطبق",
    notApplicableSub: "لا يلزم مسار تخدير",
    educationTitle: "تثقيف المريض",
    educationText: "سيستعرض المريض مواد التثقيف من خلال الرابط العام قبل رمز OTP والتوقيع.",
    educationItems: ["شرح الإجراء", "المخاطر والفوائد", "البدائل المتاحة", "الرعاية بعد الإجراء"],
    educationConfirm: "أؤكد أن مواد تثقيف المريض جاهزة للرابط العام.",
    smartReview: "المراجعة الذكية",
    smartReviewText: "قبل الإرسال، يؤكد الطبيب جاهزية الموافقة للدخول عبر رابط المريض العام.",
    readiness: "درجة الجاهزية",
    sendPublic: "إرسال رابط المريض العام",
    sendPublicText: "يستلم المريض رابطًا عامًا آمنًا عبر الجوال ويمكن فتحه من الجوال أو التابلت أو الكمبيوتر الشخصي.",
    mobile: "الجوال",
    mobileSub: "رابط عبر SMS",
    tablet: "التابلت",
    tabletSub: "تابلت شخصي أو بجانب السرير",
    computer: "الكمبيوتر",
    computerSub: "متصفح المنزل أو المكتب",
    sendSecure: "إرسال الرابط العام الآمن",
    summary: "ملخص الموافقة",
    summarySub: "سياق تشغيلي للطبيب",
    patientAccess: "دخول المريض",
    publicSms: "رابط عام عبر SMS",
    aiNote: "رحلة المريض ليست داخل هذه الصفحة. تبدأ من الرابط العام الآمن المرسل عبر الجوال.",
    back: "رجوع",
    continue: "متابعة",
    required: "مطلوب",
    pending: "معلق",
    confirmed: "مؤكد",
  },
};

function getSteps(lang: Lang) {
  const t = copy[lang];
  return [
    { key: "patient" as const, label: t.patient },
    { key: "template" as const, label: t.template },
    { key: "procedure" as const, label: t.procedure },
    { key: "anesthesia" as const, label: t.anesthesia },
    { key: "education" as const, label: t.education },
    { key: "review" as const, label: t.review },
    { key: "send" as const, label: t.send },
  ];
}

function openRoute(route: string) {
  window.location.assign(route);
}

export default function WathiqSmartConsentExperience() {
  const [lang, setLang] = useState<Lang>("en");
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<ConsentTemplate>(approvedTemplates[0]);
  const [query, setQuery] = useState("");
  const [procedure, setProcedure] = useState(copy.en.procedureDefault);
  const [anesthesiaRequired, setAnesthesiaRequired] = useState(true);
  const [educationConfirmed, setEducationConfirmed] = useState(false);
  const [mobile, setMobile] = useState("+966 5X XXX XXXX");
  const [email, setEmail] = useState("patient@example.com");

  const t = copy[lang];
  const isAr = lang === "ar";
  const steps = getSteps(lang);
  const currentStep = steps[activeStep]?.key ?? "patient";

  function switchLang(nextLang: Lang) {
    setLang(nextLang);
    setProcedure(nextLang === "ar" ? copy.ar.procedureDefault : copy.en.procedureDefault);
  }

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();

    return approvedTemplates.filter((template) => {
      return (
        !q ||
        template.title.toLowerCase().includes(q) ||
        template.titleAr.toLowerCase().includes(q) ||
        template.department.toLowerCase().includes(q) ||
        template.departmentAr.toLowerCase().includes(q) ||
        template.type.toLowerCase().includes(q) ||
        template.typeAr.toLowerCase().includes(q) ||
        template.id.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const readiness = useMemo(() => {
    let score = 50;
    if (selectedTemplate?.id) score += 15;
    if (procedure.trim().length > 8) score += 10;
    if (anesthesiaRequired === true || anesthesiaRequired === false) score += 10;
    if (educationConfirmed) score += 10;
    if (mobile || email) score += 5;
    return Math.min(score, 100);
  }, [selectedTemplate, procedure, anesthesiaRequired, educationConfirmed, mobile, email]);

  function goNext() {
    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goBack() {
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  function sendConsent() {
    const params = new URLSearchParams({
      templateId: selectedTemplate.id,
      procedure,
      anesthesiaRequired: String(anesthesiaRequired),
      educationConfirmed: String(educationConfirmed),
      mobile,
      email,
      publicLink: "true",
      lang,
    });

    openRoute(`/modules/informed-consents/consent-creation-workflow?${params.toString()}`);
  }

  return (
    <main className="wcp-shell" dir={isAr ? "rtl" : "ltr"} lang={lang} data-testid="wathiq-doctor-public-link-care-portal">
      <aside className="wcp-sidebar">
        <div className="wcp-brand">
          <ShieldCheck size={34} />
          <div>
            <strong>{t.brand}</strong>
            <span>{t.brandSub}</span>
          </div>
        </div>

        <button className="active" type="button" onClick={() => openRoute("/modules/informed-consents")}>
          <ClipboardCheck size={19} />
          <span>{t.doctorWorkspace}</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/list")}>
          <FileText size={19} />
          <span>{t.consentRecords}</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/template-registry")}>
          <BookOpen size={19} />
          <span>{t.approvedForms}</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/physician-workflow?step=anesthesia")}>
          <Syringe size={19} />
          <span>{t.anesthesiaQueue}</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/governance")}>
          <ShieldCheck size={19} />
          <span>{t.governance}</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/settings-support")}>
          <MessageCircle size={19} />
          <span>{t.support}</span>
        </button>
      </aside>

      <section className="wcp-main">
        <header className="wcp-topbar">
          <div className="wcp-top-left">
            <button type="button" onClick={() => openRoute("/modules")}>
              <Home size={19} />
            </button>
            <div>
              <strong>{t.welcome}</strong>
              <span>{t.welcomeSub}</span>
            </div>
          </div>

          <div className="wcp-top-actions">
            <div className="wcp-lang-toggle" aria-label="Language switcher">
              <button type="button" className={lang === "en" ? "active" : ""} onClick={() => switchLang("en")}>
                EN
              </button>
              <button type="button" className={lang === "ar" ? "active" : ""} onClick={() => switchLang("ar")}>
                عربي
              </button>
            </div>

            <button type="button" onClick={() => openRoute("/alerts")}>
              <Bell size={16} />
              {t.alerts}
            </button>
          </div>
        </header>

        <section className="wcp-hero">
          <div className="wcp-hero-copy">
            <span>{t.heroTag}</span>
            <h1>{t.heroTitle}</h1>
            <p>{t.heroText}</p>

            <div className="wcp-hero-actions">
              <button type="button" onClick={() => setActiveStep(0)}>
                {t.startJourney}
                <ChevronRight size={17} />
              </button>
              <button type="button" onClick={() => openRoute(`/sign/demo-wathiq-public-link?lang=${lang}`)}>
                {t.previewPublic}
                <ExternalLink size={17} />
              </button>
            </div>
          </div>

          <div className="wcp-hero-visual" aria-hidden="true">
            <div className="wcp-device phone">
              <Smartphone size={30} />
              <strong>{t.mobile}</strong>
              <span>{t.mobileSub}</span>
            </div>
            <div className="wcp-device tablet">
              <Tablet size={34} />
              <strong>{t.tablet}</strong>
              <span>{t.tabletSub}</span>
            </div>
            <div className="wcp-device desktop">
              <Laptop size={38} />
              <strong>{t.computer}</strong>
              <span>{t.computerSub}</span>
            </div>
            <div className="wcp-floating-score">
              <Sparkles size={18} />
              <strong>{readiness}%</strong>
              <span>{t.readiness}</span>
            </div>
          </div>
        </section>

        <section className="wcp-services">
          <article>
            <h2>{t.doctorServices}</h2>

            <div className="wcp-service-grid three">
              <button type="button" onClick={() => setActiveStep(0)}>
                <FileCheck2 size={31} />
                <span>
                  <strong>{t.createConsent}</strong>
                  <small>{t.createConsentSub}</small>
                </span>
              </button>

              <button type="button" onClick={() => openRoute("/modules/informed-consents/list")}>
                <CalendarDays size={31} />
                <span>
                  <strong>{t.pendingConsents}</strong>
                  <small>{t.pendingConsentsSub}</small>
                </span>
              </button>

              <button type="button" onClick={() => setActiveStep(1)}>
                <BookOpen size={31} />
                <span>
                  <strong>{t.approvedForms}</strong>
                  <small>{t.formsSub}</small>
                </span>
              </button>
            </div>
          </article>

          <article>
            <h2>{t.patientPublicExperience}</h2>

            <div className="wcp-service-grid three patient">
              <button type="button" onClick={() => setActiveStep(6)}>
                <Phone size={31} />
                <span>
                  <strong>{t.smsLink}</strong>
                  <small>{t.smsLinkSub}</small>
                </span>
              </button>

              <button type="button" onClick={() => setActiveStep(4)}>
                <HeartPulse size={31} />
                <span>
                  <strong>{t.patientEducation}</strong>
                  <small>{t.patientEducationSub}</small>
                </span>
              </button>

              <button type="button" onClick={() => openRoute(`/sign/demo-wathiq-public-link?lang=${lang}`)}>
                <BadgeCheck size={31} />
                <span>
                  <strong>{t.otpSignature}</strong>
                  <small>{t.otpSignatureSub}</small>
                </span>
              </button>
            </div>
          </article>
        </section>

        <section className="wcp-journey">
          <div className="wcp-left">
            <nav className="wcp-stepper" aria-label="Doctor consent journey">
              {steps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  className={index < activeStep ? "done" : index === activeStep ? "active" : ""}
                  onClick={() => setActiveStep(index)}
                >
                  <b>{index < activeStep ? <CheckCircle2 size={15} /> : index + 1}</b>
                  <span>{step.label}</span>
                </button>
              ))}
            </nav>

            <section className="wcp-panel">
              {currentStep === "patient" && (
                <>
                  <div className="wcp-panel-title">
                    <h2>{t.patientContext}</h2>
                    <p>{t.patientContextText}</p>
                  </div>

                  <div className="wcp-info-grid">
                    <article>
                      <UserRound size={24} />
                      <small>{t.patient}</small>
                      <strong>{t.patientName}</strong>
                    </article>
                    <article>
                      <ClipboardCheck size={24} />
                      <small>{t.mrn}</small>
                      <strong>WC-2025-001123</strong>
                    </article>
                    <article>
                      <CalendarDays size={24} />
                      <small>{t.encounter}</small>
                      <strong>{t.encounterValue}</strong>
                    </article>
                    <article>
                      <Stethoscope size={24} />
                      <small>{t.physician}</small>
                      <strong>{t.physicianValue}</strong>
                    </article>
                  </div>
                </>
              )}

              {currentStep === "template" && (
                <>
                  <div className="wcp-panel-title">
                    <h2>{t.approvedTemplate}</h2>
                    <p>{t.approvedTemplateText}</p>
                  </div>

                  <label className="wcp-search">
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t.searchPlaceholder}
                    />
                  </label>

                  <div className="wcp-template-list">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className={template.id === selectedTemplate.id ? "active" : ""}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <FileText size={23} />
                        <span>
                          <strong>{isAr ? template.titleAr : template.title}</strong>
                          <em>{isAr ? template.title : template.titleAr}</em>
                          <small>{template.id}</small>
                        </span>
                        <i>{isAr ? template.departmentAr : template.department}</i>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {currentStep === "procedure" && (
                <>
                  <div className="wcp-panel-title">
                    <h2>{t.procedureDetails}</h2>
                    <p>{t.procedureText}</p>
                  </div>

                  <label className="wcp-input">
                    <span>{t.procedureName}</span>
                    <input value={procedure} onChange={(event) => setProcedure(event.target.value)} />
                  </label>

                  <label className="wcp-input">
                    <span>{t.clinicalNote}</span>
                    <textarea defaultValue={t.clinicalNoteDefault} />
                  </label>
                </>
              )}

              {currentStep === "anesthesia" && (
                <>
                  <div className="wcp-panel-title">
                    <h2>{t.anesthesiaDecision}</h2>
                    <p>{t.anesthesiaText}</p>
                  </div>

                  <div className="wcp-choice">
                    <button type="button" className={anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(true)}>
                      <Syringe size={28} />
                      <strong>{t.anesthesiaRequired}</strong>
                      <span>{t.anesthesiaRequiredSub}</span>
                    </button>

                    <button type="button" className={!anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(false)}>
                      <BadgeCheck size={28} />
                      <strong>{t.notApplicable}</strong>
                      <span>{t.notApplicableSub}</span>
                    </button>
                  </div>
                </>
              )}

              {currentStep === "education" && (
                <>
                  <div className="wcp-panel-title">
                    <h2>{t.educationTitle}</h2>
                    <p>{t.educationText}</p>
                  </div>

                  <div className="wcp-education">
                    {t.educationItems.map((item) => (
                      <article key={item}>
                        <CheckCircle2 size={20} />
                        <span>{item}</span>
                      </article>
                    ))}
                  </div>

                  <label className="wcp-confirm">
                    <input
                      type="checkbox"
                      checked={educationConfirmed}
                      onChange={(event) => setEducationConfirmed(event.target.checked)}
                    />
                    <span>{t.educationConfirm}</span>
                  </label>
                </>
              )}

              {currentStep === "review" && (
                <>
                  <div className="wcp-panel-title">
                    <h2>{t.smartReview}</h2>
                    <p>{t.smartReviewText}</p>
                  </div>

                  <div className="wcp-review">
                    <div>
                      <Sparkles size={24} />
                      <strong>{readiness}%</strong>
                      <span>{t.readiness}</span>
                    </div>
                    <ul>
                      <li>{t.patient}: {t.patientName}</li>
                      <li>{t.template}: {isAr ? selectedTemplate.titleAr : selectedTemplate.title}</li>
                      <li>{t.procedure}: {procedure}</li>
                      <li>{t.anesthesia}: {anesthesiaRequired ? t.required : t.notApplicable}</li>
                      <li>{t.education}: {educationConfirmed ? t.confirmed : t.pending}</li>
                    </ul>
                  </div>
                </>
              )}

              {currentStep === "send" && (
                <>
                  <div className="wcp-panel-title">
                    <h2>{t.sendPublic}</h2>
                    <p>{t.sendPublicText}</p>
                  </div>

                  <div className="wcp-send-grid">
                    <label>
                      <Phone size={18} />
                      <input value={mobile} onChange={(event) => setMobile(event.target.value)} />
                    </label>

                    <label>
                      <Mail size={18} />
                      <input value={email} onChange={(event) => setEmail(event.target.value)} />
                    </label>
                  </div>

                  <div className="wcp-device-row">
                    <article>
                      <Smartphone size={24} />
                      <strong>{t.mobile}</strong>
                      <span>{t.mobileSub}</span>
                    </article>
                    <article>
                      <Tablet size={24} />
                      <strong>{t.tablet}</strong>
                      <span>{t.tabletSub}</span>
                    </article>
                    <article>
                      <Laptop size={24} />
                      <strong>{t.computer}</strong>
                      <span>{t.computerSub}</span>
                    </article>
                  </div>

                  <button type="button" className="wcp-primary wide" onClick={sendConsent}>
                    <Send size={18} />
                    {t.sendSecure}
                  </button>
                </>
              )}
            </section>
          </div>

          <aside className="wcp-summary">
            <div className="wcp-summary-head">
              <HeartPulse size={25} />
              <div>
                <strong>{t.summary}</strong>
                <span>{t.summarySub}</span>
              </div>
            </div>

            <dl>
              <div>
                <dt>{t.patient}</dt>
                <dd>{t.patientName}</dd>
              </div>
              <div>
                <dt>{t.template}</dt>
                <dd>{isAr ? selectedTemplate.titleAr : selectedTemplate.title}</dd>
              </div>
              <div>
                <dt>{t.procedure}</dt>
                <dd>{procedure}</dd>
              </div>
              <div>
                <dt>{t.anesthesia}</dt>
                <dd>{anesthesiaRequired ? t.required : t.notApplicable}</dd>
              </div>
              <div>
                <dt>{t.patientAccess}</dt>
                <dd>{t.publicSms}</dd>
              </div>
            </dl>

            <div className="wcp-ai-note">
              <Sparkles size={18} />
              <span>{t.aiNote}</span>
            </div>

            <div className="wcp-actions">
              <button type="button" onClick={goBack} disabled={activeStep === 0}>
                {t.back}
              </button>

              {activeStep < steps.length - 1 ? (
                <button type="button" className="wcp-primary" onClick={goNext}>
                  {t.continue}
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button type="button" className="wcp-primary" onClick={sendConsent}>
                  {t.send}
                  <Send size={16} />
                </button>
              )}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
