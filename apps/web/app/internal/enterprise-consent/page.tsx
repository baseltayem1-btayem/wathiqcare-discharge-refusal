"use client";

/**
 * Phase 12.2 — Internal preview route for the complete enterprise
 * informed-consent experience.
 *
 * Composes:
 *   - Phase 12.1 EnterpriseShell (sidebar / header / ribbon / main)
 *   - ConsentReadingPanel: bilingual EN+AR template body
 *   - WitnessSignaturePanel + PhysicianAcknowledgmentCard
 *   - Production PatientSigningPanel (controlled via local state, no
 *     server action invoked)
 *   - MockOtpVerification (preview-only OTP UI shell)
 *   - EvidencePanel (5 evidence cards from Phase 12.1)
 *
 * Scope guardrails:
 *   - Sandbox route under /internal — never linked from production nav.
 *   - Reads template content from the consent-engine module.
 *   - Does not import any server action, does not write to DB.
 *   - Does not modify any existing production component.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  EnterpriseShell,
  EnterpriseSidebar,
  EnterpriseHeader,
  EnterpriseRibbon,
  EnterpriseCard,
  EnterpriseStatusPill,
} from "@/components/enterprise";
import {
  ConsentReadingPanel,
  ConsentSignersBar,
  PhysicianAcknowledgmentCard,
  WitnessSignaturePanel,
  MockOtpVerification,
  type ConsentSectionViewModel,
  type ConsentSignerProgressItem,
  type WitnessSignatureState,
} from "@/components/enterprise/consent";
import PatientSigningPanel from "@/components/modules/informed-consent-signing/PatientSigningPanel";
import type { SignatureState } from "@/components/modules/informed-consent-issuance/types";
import { EvidencePanel } from "@/components/evidence";
import { SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE } from "@/modules/consent-engine/templates/surgery-medical-procedure-consent";
import type { EvidencePanelData } from "@/components/evidence/types";

/* ------------------------------------------------------------------ */
/* Content view-models                                                 */
/* ------------------------------------------------------------------ */

/**
 * Build the reading-panel view-model from the production template.
 * We re-shape the template (which is field/label-oriented) into a
 * paragraph/bullet/risk/declaration structure that is optimal for
 * READING (vs editing). Adds the legally-required Refusal Consequences
 * and PDPL/Privacy disclosure sections that production composes from
 * runtime field input + global compliance text.
 */
function buildConsentReadingSections(): ConsentSectionViewModel[] {
  const tpl = SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE;
  const risks = tpl.sections.find((s) => s.id === "risks");
  const patientConsent = tpl.sections.find((s) => s.id === "patient-consent");

  return [
    {
      id: "before-signing",
      title: { en: "Before You Sign", ar: "قبل التوقيع" },
      paragraphs: [
        {
          en: "If you have any questions or concerns about the diagnosis, the proposed procedure, its risks, benefits, or alternatives, please ask your treating physician before signing this document. You have the right to decline or change your mind at any time.",
          ar: "إذا كان لديك أي تساؤل أو استفسار حول التشخيص أو الإجراء المقترح أو مخاطره أو فوائده أو البدائل، يُرجى سؤال الطبيب المعالج قبل التوقيع على هذه الوثيقة. ولك الحق في الرفض أو تغيير قرارك في أي وقت.",
        },
      ],
    },
    {
      id: "procedure-explanation",
      title: {
        en: "Procedure Explanation",
        ar: "شرح الإجراء",
      },
      paragraphs: [
        {
          en: "My doctor has explained the diagnosis, the procedure I require, what will be performed during the procedure, and the expected duration. I confirm I have had the opportunity to clarify any aspect I did not understand.",
          ar: "أوضح طبيبي التشخيص والإجراء الذي أحتاجه، وما الذي سيتم تنفيذه خلال الإجراء، والمدة المتوقعة. وأؤكد أنه قد أُتيحت لي الفرصة لاستيضاح أي جانب لم أفهمه.",
        },
      ],
      bullets: [
        {
          id: "diagnosis",
          label: { en: "Diagnosis", ar: "التشخيص" },
          text: {
            en: "Coronary artery disease requiring diagnostic catheterization to assess myocardial perfusion and vessel anatomy.",
            ar: "مرض الشريان التاجي يتطلب قسطرة تشخيصية لتقييم تروية عضلة القلب وتشريح الأوعية.",
          },
        },
        {
          id: "procedure-name",
          label: { en: "Procedure", ar: "الإجراء" },
          text: {
            en: "Diagnostic cardiac catheterization via right radial access under conscious sedation.",
            ar: "قسطرة قلبية تشخيصية عبر الشريان الكعبري الأيمن تحت تخدير واعٍ.",
          },
        },
        {
          id: "duration",
          label: { en: "Estimated duration", ar: "المدة المتوقعة" },
          text: {
            en: "45 to 60 minutes, followed by 2 hours of post-procedure observation.",
            ar: "من 45 إلى 60 دقيقة، يليها ساعتان من الملاحظة بعد الإجراء.",
          },
        },
      ],
    },
    {
      id: "benefits",
      title: { en: "Benefits and Expected Results", ar: "الفوائد والنتائج المتوقعة" },
      paragraphs: [
        {
          en: "The procedure aims to provide a definitive diagnostic assessment of coronary artery disease and guide subsequent treatment planning. Outcomes may include direct visualization of arterial blockages, accurate severity grading, and a tailored therapeutic strategy.",
          ar: "يهدف الإجراء إلى تقديم تقييم تشخيصي دقيق لمرض الشرايين التاجية وتوجيه خطة العلاج التالية. وقد تشمل النتائج رؤية مباشرة لانسدادات الشرايين، وتصنيف دقيق لشدتها، واستراتيجية علاجية مخصصة.",
        },
      ],
    },
    {
      id: "risks",
      title: { en: "Risks Associated with the Procedure", ar: "المخاطر المرتبطة بالإجراء" },
      paragraphs: [
        {
          en: "Like any invasive procedure, this carries risks. Your physician has explained the following material risks. Risks are categorized by severity below.",
          ar: "كأي إجراء تداخلي، ينطوي هذا الإجراء على مخاطر. وقد شرح لك طبيبك المخاطر الجوهرية التالية. والمخاطر مصنفة حسب الشدة أدناه.",
        },
      ],
      riskBlocks: risks?.riskBlocks ?? [],
    },
    {
      id: "alternatives",
      title: {
        en: "Alternatives and Consequences of Not Treating",
        ar: "البدائل وعواقب عدم العلاج",
      },
      bullets: [
        {
          id: "alt-medical",
          label: { en: "Alternative — medical therapy", ar: "البديل — العلاج الدوائي" },
          text: {
            en: "Continued optimal medical therapy without imaging. May fail to identify the cause of recurrent chest pain or delay revascularization when needed.",
            ar: "الاستمرار في العلاج الدوائي الأمثل دون تصوير. وقد لا يتم تحديد سبب آلام الصدر المتكررة أو يتأخر إعادة التروية عند الحاجة.",
          },
        },
        {
          id: "alt-ct",
          label: {
            en: "Alternative — CT coronary angiogram",
            ar: "البديل — تصوير الشرايين بالأشعة المقطعية",
          },
          text: {
            en: "Non-invasive alternative with lower spatial resolution. Not suitable for therapeutic intervention if obstructive disease is found.",
            ar: "بديل غير تداخلي بدقة مكانية أقل. وغير مناسب للتداخل العلاجي في حال وجود انسداد.",
          },
        },
      ],
    },
    {
      id: "refusal-consequences",
      title: {
        en: "Consequences of Refusal",
        ar: "عواقب الرفض",
      },
      paragraphs: [
        {
          en: "If I decline this procedure, my physician has explained that the underlying coronary condition may progress undetected, that recurrent chest pain may continue without targeted treatment, and that acute coronary events (including myocardial infarction) may occur. I acknowledge that refusing this procedure does not affect my right to alternative care, and I retain the right to revisit this decision at any time.",
          ar: "إذا رفضت هذا الإجراء، فقد شرح لي طبيبي أن حالة الشريان التاجي قد تتطور دون اكتشافها، وأن آلام الصدر المتكررة قد تستمر دون علاج موجّه، وأن أحداث الشريان التاجي الحادة (بما في ذلك احتشاء عضلة القلب) قد تحدث. وأقر بأن رفضي لهذا الإجراء لا يؤثر على حقي في الرعاية البديلة، وأحتفظ بحقي في إعادة النظر في هذا القرار في أي وقت.",
        },
      ],
    },
    {
      id: "pdpl-privacy",
      title: {
        en: "Privacy Notice (PDPL & Digital Consent)",
        ar: "إشعار الخصوصية (نظام حماية البيانات الشخصية والموافقة الرقمية)",
      },
      paragraphs: [
        {
          en: "I acknowledge and consent to the lawful processing of my personal and health information in accordance with the Personal Data Protection Law (PDPL) and healthcare regulations in the Kingdom of Saudi Arabia. I understand that this consent is captured digitally, that the resulting document carries the same legal weight as a wet signature, and that an evidence bundle (including signature artifacts, audit trail, device fingerprints, and a verification QR code) will be retained for the legally required retention period.",
          ar: "أقر وأوافق على المعالجة النظامية لبياناتي الشخصية والصحية وفقًا لنظام حماية البيانات الشخصية (PDPL) والأنظمة الصحية المعمول بها في المملكة العربية السعودية. وأفهم أن هذه الموافقة يتم التقاطها رقمياً، وأن الوثيقة الناتجة لها نفس الوزن القانوني للتوقيع الورقي، وأن حزمة الأدلة (بما في ذلك مكونات التوقيع وسجل التدقيق وبصمات الجهاز ورمز التحقق QR) سيتم حفظها للمدة النظامية المطلوبة.",
        },
      ],
    },
    {
      id: "patient-acknowledgment",
      title: {
        en: "Patient Acknowledgment",
        ar: "إقرار المريض",
      },
      paragraphs: [
        {
          en: "By signing below I declare the following:",
          ar: "بالتوقيع أدناه فإنني أقر بما يلي:",
        },
      ],
      declarations: (patientConsent?.declarations ?? []) as ConsentSectionViewModel["declarations"],
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Mock data                                                            */
/* ------------------------------------------------------------------ */

/* Preview-only TEST MODE defaults — no real patient data, no real contact details. */
const TEST_MODE = {
  patientName: "Test Patient",
  patientNameAr: "مريض تجريبي",
  mrn: "MRN-TEST-1001",
  mobile: "+966500000001",
  email: "admin@wathiqcare.med.sa",
  nationalId: "1029384756",
  physicianName: "Dr. Demo Physician",
  physicianNameAr: "د. الطبيب التجريبي",
  witnessName: "Demo Witness",
  otpCode: "123456",
  signingToken: "test-patient-signing",
} as const;

const PATIENT = {
  nameEn: TEST_MODE.patientName,
  nameAr: TEST_MODE.patientNameAr,
  mrn: TEST_MODE.mrn,
  nationalId: TEST_MODE.nationalId,
  departmentEn: "Cardiology",
  departmentAr: "قسم القلب",
  maskedPhone: TEST_MODE.mobile,
  email: TEST_MODE.email,
};

const PHYSICIAN = {
  nameEn: TEST_MODE.physicianName,
  nameAr: TEST_MODE.physicianNameAr,
  license: "MOH-PHY-DEMO-0001",
  departmentEn: "Interventional Cardiology",
  departmentAr: "قسم قسطرة القلب",
};

const INITIAL_SIGNATURE_STATE: SignatureState = {
  selectedMethod: "otp",
  acknowledgmentAccepted: false,
  patientSigned: false,
  physicianSigned: false,
  witnessSigned: false,
  interpreterSigned: false,
  otpVerified: false,
  signatureEvidenceReady: false,
  signatureEvidenceReference: "",
  signatureDataUrl: "",
  deviceLabel: "",
  staffWitnessName: "",
  biometricVerified: false,
  biometricDeviceReference: "",
  biometricTransactionId: "",
  biometricVerificationHash: "",
  biometricTimestamp: "",
  biometricSdkProvider: "",
  biometricDeviceModel: "",
  biometricLocalAgentStatus: "idle",
  biometricLocalAgentMessage: "",
};

const INITIAL_WITNESS_STATE: WitnessSignatureState = {
  witnessName: TEST_MODE.witnessName,
  witnessRole: "Charge Nurse",
  witnessIdNumber: "STF-DEMO-0001",
  signed: false,
};

const MOCK_EVIDENCE: EvidencePanelData = {
  signers: [
    {
      role: "patient",
      displayName: TEST_MODE.patientName,
      method: "combined-tablet-and-otp",
      acknowledged: false,
    },
    {
      role: "physician",
      displayName: TEST_MODE.physicianName,
      method: "biometric-fingerprint",
      acknowledged: false,
    },
    {
      role: "witness",
      displayName: TEST_MODE.witnessName,
      method: "otp",
    },
  ],
  otp: [
    {
      id: "otp-preview-1",
      timestamp: "2026-05-19 10:14:02",
      channel: "sms",
      destinationMasked: PATIENT.maskedPhone,
      status: "sent",
      ip: "10.20.4.18",
    },
  ],
  audit: [
    {
      id: "a-preview-1",
      timestamp: "2026-05-19 10:12:00",
      actor: TEST_MODE.physicianName,
      action: "Consent draft created",
      detail: "Template: Surgery / Medical Procedure v1.0.0",
      severity: "info",
    },
    {
      id: "a-preview-2",
      timestamp: "2026-05-19 10:13:32",
      actor: "Patient (tablet)",
      action: "Opened consent reading view",
      severity: "info",
    },
  ],
  qr: {
    verificationUrl: "https://wathiqcare.online/verify/EVB-2026-0519-PRV1",
    documentHash: "sha256:preview-do-not-trust-1234567890abcdef",
    shortCode: "PRV1-12AB",
  },
  forensic: {
    capturedAt: "2026-05-19T10:14:00+03:00",
    ip: "10.20.4.18",
    userAgent: "Mozilla/5.0 (iPad; tablet) WathiqCarePreview/12.2",
    geo: { latitude: 24.7136, longitude: 46.6753, accuracyM: 12 },
    signatureManifestHash: "sha256:preview-manifest-placeholder",
    pdfBinaryHash: "sha256:preview-pdf-placeholder",
    evidenceBundleId: "EVB-2026-0519-PRV1",
    legalSealReference: "PREVIEW-NOT-SEALED",
  },
};

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function EnterpriseConsentPreviewPage() {
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [bilingual, setBilingual] = useState<boolean>(true);
  const [signatureState, setSignatureState] = useState<SignatureState>(
    INITIAL_SIGNATURE_STATE,
  );
  const [witnessState, setWitnessState] = useState<WitnessSignatureState>(
    INITIAL_WITNESS_STATE,
  );
  const [physicianConfirmed, setPhysicianConfirmed] = useState<boolean>(false);
  const [otpVerifiedPreview, setOtpVerifiedPreview] = useState<boolean>(false);

  /* ---- Preview-only TEST MODE signing-link simulator ---- */
  const searchParams = useSearchParams();
  const signingToken = searchParams?.get("token") ?? null;
  const isSigningLinkMode = signingToken === TEST_MODE.signingToken;
  const [signingLinkUrl, setSigningLinkUrl] = useState<string>("");
  const [signingLinkSent, setSigningLinkSent] = useState<boolean>(false);
  const [signingLinkCopied, setSigningLinkCopied] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const base = `${window.location.origin}/internal/enterprise-consent`;
      setSigningLinkUrl(`${base}?token=${TEST_MODE.signingToken}`);
    }
  }, []);

  const handleSendSigningLink = () => {
    /* No real email — preview-only simulation. */
    setSigningLinkSent(true);
  };

  const handleCopySigningLink = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && signingLinkUrl) {
      try {
        await navigator.clipboard.writeText(signingLinkUrl);
        setSigningLinkCopied(true);
        setTimeout(() => setSigningLinkCopied(false), 2000);
      } catch {
        /* ignore — preview only */
      }
    }
  };

  const isAr = direction === "rtl";
  const language: "en" | "ar" = isAr ? "ar" : "en";

  const sections = useMemo(() => buildConsentReadingSections(), []);

  const signerProgress: ConsentSignerProgressItem[] = [
    {
      step: "patient",
      label: { en: "Patient", ar: "المريض" },
      status: signatureState.acknowledgmentAccepted ? "complete" : "in-progress",
      actorName: isAr ? PATIENT.nameAr : PATIENT.nameEn,
    },
    {
      step: "witness",
      label: { en: "Witness", ar: "الشاهد" },
      status: witnessState.signed
        ? "complete"
        : signatureState.acknowledgmentAccepted
          ? "in-progress"
          : "pending",
      actorName: witnessState.witnessName,
    },
    {
      step: "physician",
      label: { en: "Physician", ar: "الطبيب" },
      status: physicianConfirmed
        ? "complete"
        : witnessState.signed
          ? "in-progress"
          : "pending",
      actorName: isAr ? PHYSICIAN.nameAr : PHYSICIAN.nameEn,
    },
    {
      step: "otp",
      label: { en: "OTP Verification", ar: "التحقق برمز OTP" },
      status: otpVerifiedPreview
        ? "complete"
        : physicianConfirmed
          ? "in-progress"
          : "pending",
    },
  ];

  const overallComplete =
    signatureState.acknowledgmentAccepted &&
    witnessState.signed &&
    physicianConfirmed &&
    otpVerifiedPreview;

  const brand = isAr
    ? { primary: "وثيق كير", secondary: "الموافقة المستنيرة — المعاينة المؤسسية" }
    : { primary: "WathiqCare", secondary: "Informed Consent — Enterprise Preview" };

  return (
    <EnterpriseShell
      direction={direction}
      sidebar={
        <EnterpriseSidebar
          brand={brand}
          sections={[
            {
              id: "consent",
              label: isAr ? "أقسام الموافقة" : "Consent Sections",
              items: [
                {
                  id: "before-signing",
                  label: isAr ? "قبل التوقيع" : "Before You Sign",
                  active: true,
                },
                {
                  id: "procedure-explanation",
                  label: isAr ? "شرح الإجراء" : "Procedure Explanation",
                },
                { id: "benefits", label: isAr ? "الفوائد" : "Benefits" },
                { id: "risks", label: isAr ? "المخاطر" : "Risks", badge: "6" },
                { id: "alternatives", label: isAr ? "البدائل" : "Alternatives" },
                {
                  id: "refusal-consequences",
                  label: isAr ? "عواقب الرفض" : "Refusal Consequences",
                },
                { id: "pdpl-privacy", label: isAr ? "الخصوصية / PDPL" : "Privacy / PDPL" },
                {
                  id: "patient-acknowledgment",
                  label: isAr ? "إقرار المريض" : "Patient Acknowledgment",
                },
              ],
            },
            {
              id: "signing",
              label: isAr ? "خطوات التوقيع" : "Signing Workflow",
              items: [
                { id: "patient-sig", label: isAr ? "توقيع المريض" : "Patient Signature" },
                { id: "witness-sig", label: isAr ? "توقيع الشاهد" : "Witness Signature" },
                {
                  id: "physician-ack",
                  label: isAr ? "إقرار الطبيب" : "Physician Acknowledgment",
                },
                { id: "otp", label: isAr ? "التحقق برمز OTP" : "OTP Verification" },
              ],
            },
            {
              id: "evidence",
              label: isAr ? "الأدلة" : "Evidence",
              items: [
                { id: "signers", label: isAr ? "الموقعون" : "Signers" },
                { id: "audit", label: isAr ? "سجل التدقيق" : "Audit Trail" },
                { id: "qr", label: isAr ? "التحقق QR" : "QR Verification" },
                { id: "forensic", label: isAr ? "البيانات الجنائية" : "Forensic Metadata" },
              ],
            },
          ]}
          footer={
            <div className="space-y-1 text-[10px]" style={{ color: "var(--wc-ent-fg-on-dark-muted)" }}>
              <div>{isAr ? "نسخة المعاينة 12.2" : "Phase 12.2 preview"}</div>
              <div>{isAr ? "بيئة معزولة — لا تؤثر على الإنتاج" : "Sandbox — no production impact"}</div>
            </div>
          }
        />
      }
      header={
        <EnterpriseHeader
          title={
            isAr
              ? "موافقة مستنيرة — إجراء جراحي / طبي"
              : "Informed Consent — Surgery / Medical Procedure"
          }
          subtitle={
            isAr
              ? `النموذج: ${SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE.id} · الإصدار ${SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE.version}`
              : `Template: ${SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE.id} · v${SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE.version}`
          }
          patient={{
            name: isAr ? PATIENT.nameAr : PATIENT.nameEn,
            mrn: PATIENT.mrn,
            nationalId: PATIENT.nationalId,
            department: isAr ? PATIENT.departmentAr : PATIENT.departmentEn,
          }}
          actions={
            <>
              <EnterpriseStatusPill
                status={overallComplete ? "ok" : "warn"}
                label={
                  isAr
                    ? overallComplete
                      ? "مكتمل"
                      : "قيد التوقيع"
                    : overallComplete
                      ? "Complete"
                      : "In progress"
                }
              />
              <button
                type="button"
                onClick={() => setBilingual((b) => !b)}
                className="rounded border px-2 py-1 text-xs"
                style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
                data-testid="enterprise-consent-toggle-bilingual"
              >
                {bilingual
                  ? isAr
                    ? "عرض لغة واحدة"
                    : "Single language"
                  : isAr
                    ? "عرض ثنائي اللغة"
                    : "Bilingual view"}
              </button>
              <button
                type="button"
                onClick={() => setDirection(direction === "ltr" ? "rtl" : "ltr")}
                className="rounded border px-2 py-1 text-xs"
                style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
                data-testid="enterprise-consent-toggle-direction"
              >
                {direction === "ltr" ? "Switch to AR / RTL" : "Switch to EN / LTR"}
              </button>
            </>
          }
        />
      }
      ribbon={
        <EnterpriseRibbon
          groups={[
            {
              id: "reading",
              label: isAr ? "القراءة" : "Reading",
              actions: [
                { id: "view-en", label: "EN", variant: "secondary" },
                { id: "view-ar", label: "AR", variant: "secondary" },
                {
                  id: "view-bi",
                  label: isAr ? "ثنائي" : "Bilingual",
                  variant: "primary",
                },
              ],
            },
            {
              id: "signing",
              label: isAr ? "التوقيع" : "Signing",
              actions: [
                { id: "patient", label: isAr ? "المريض" : "Patient", variant: "secondary" },
                { id: "witness", label: isAr ? "الشاهد" : "Witness", variant: "secondary" },
                { id: "physician", label: isAr ? "الطبيب" : "Physician", variant: "secondary" },
                { id: "otp", label: "OTP", variant: "secondary" },
              ],
            },
            {
              id: "actions",
              label: isAr ? "الإجراءات" : "Actions",
              actions: [
                {
                  id: "save",
                  label: isAr ? "حفظ المسودة" : "Save draft",
                  variant: "secondary",
                  disabled: true,
                },
                {
                  id: "finalize",
                  label: isAr ? "ختم وإصدار PDF" : "Seal & PDF",
                  variant: "primary",
                  disabled: !overallComplete,
                },
              ],
            },
          ]}
          trailing={
            <span className="text-[11px]" style={{ color: "var(--wc-ent-fg-muted)" }}>
              {isAr ? "معاينة فقط — بدون استدعاء خادم" : "Preview only — no server calls"}
            </span>
          }
        />
      }
    >
      <div className="grid gap-4" data-testid="enterprise-consent-main">
        {/* PREVIEW TEST MODE banner */}
        <div
          data-testid="test-mode-banner"
          className="rounded border px-3 py-2 text-sm font-semibold"
          style={{
            background: "#fff4cc",
            borderColor: "#e0b800",
            color: "#5a4500",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {isAr
                ? "وضع المعاينة التجريبي — لا يتم إرسال رسائل SMS أو بريد إلكتروني فعلية"
                : "PREVIEW TEST MODE — NO REAL SMS OR EMAIL SENT"}
            </span>
            <span
              className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
              style={{ background: "#e0b800", color: "#3a2e00" }}
            >
              {isAr ? "بيانات تجريبية" : "Test data"}
            </span>
          </div>
          {isSigningLinkMode ? (
            <div
              className="mt-1 text-[11px] font-normal"
              data-testid="test-mode-signing-link-active"
              style={{ color: "#5a4500" }}
            >
              {isAr
                ? "تم فتح الجلسة عبر رابط توقيع المريض التجريبي."
                : "Session opened via test patient signing link."}
            </div>
          ) : null}
        </div>

        {/* Test patient defaults summary (preview-only) */}
        <EnterpriseCard
          header={{
            title: isAr ? "بيانات المريض التجريبية" : "Test Patient Defaults",
            subtitle: isAr
              ? "قيم افتراضية مهيأة مسبقًا للاختبار الداخلي"
              : "Pre-filled default values for internal testing",
            status: { label: "Preview", tone: "info" },
          }}
        >
          <dl
            data-testid="test-patient-defaults"
            className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] md:grid-cols-3"
          >
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--wc-ent-fg-muted)" }}>
                {isAr ? "اسم المريض" : "Patient Name"}
              </dt>
              <dd className="font-mono" data-testid="default-patient-name">{TEST_MODE.patientName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--wc-ent-fg-muted)" }}>MRN</dt>
              <dd className="font-mono" data-testid="default-mrn">{TEST_MODE.mrn}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--wc-ent-fg-muted)" }}>
                {isAr ? "الجوال" : "Mobile"}
              </dt>
              <dd className="font-mono" data-testid="default-mobile"><bdi dir="ltr">{TEST_MODE.mobile}</bdi></dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--wc-ent-fg-muted)" }}>
                {isAr ? "البريد الإلكتروني" : "Email"}
              </dt>
              <dd className="font-mono" data-testid="default-email">{TEST_MODE.email}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--wc-ent-fg-muted)" }}>
                {isAr ? "رقم الهوية" : "National ID"}
              </dt>
              <dd className="font-mono" data-testid="default-national-id">{TEST_MODE.nationalId}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--wc-ent-fg-muted)" }}>
                {isAr ? "الطبيب" : "Physician"}
              </dt>
              <dd className="font-mono" data-testid="default-physician">{TEST_MODE.physicianName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--wc-ent-fg-muted)" }}>
                {isAr ? "الشاهد" : "Witness"}
              </dt>
              <dd className="font-mono" data-testid="default-witness">{TEST_MODE.witnessName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--wc-ent-fg-muted)" }}>
                {isAr ? "رمز OTP التجريبي" : "Test OTP"}
              </dt>
              <dd className="font-mono font-bold" data-testid="default-otp-code">{TEST_MODE.otpCode}</dd>
            </div>
          </dl>
        </EnterpriseCard>

        {/* Send Patient Signing Link (preview-only simulation) */}
        <EnterpriseCard
          header={{
            title: isAr ? "إرسال رابط التوقيع للمريض" : "Send Patient Signing Link",
            subtitle: isAr
              ? "محاكاة إرسال دعوة التوقيع — لا يتم إرسال بريد إلكتروني فعلي"
              : "Simulated signing invitation — no real email sent",
            status: {
              label: signingLinkSent ? (isAr ? "تم الإرسال" : "Sent") : "Preview",
              tone: signingLinkSent ? "ok" : "info",
            },
          }}
        >
          <div className="space-y-2 text-sm" data-testid="signing-link-panel">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSendSigningLink}
                data-testid="send-signing-link-button"
                className="rounded px-3 py-1.5 text-sm font-semibold"
                style={{
                  background: "var(--wc-ent-state-info-bg)",
                  color: "var(--wc-ent-state-info-fg)",
                  border: "var(--wc-ent-border)",
                }}
              >
                {isAr ? "إرسال رابط توقيع المريض" : "Send Patient Signing Link"}
              </button>
              {signingLinkSent ? (
                <button
                  type="button"
                  onClick={handleCopySigningLink}
                  data-testid="copy-signing-link-button"
                  className="rounded px-3 py-1.5 text-xs"
                  style={{ border: "var(--wc-ent-border)" }}
                >
                  {signingLinkCopied
                    ? isAr
                      ? "تم النسخ"
                      : "Copied"
                    : isAr
                      ? "نسخ الرابط"
                      : "Copy link"}
                </button>
              ) : null}
            </div>

            {signingLinkSent ? (
              <div
                data-testid="signing-link-sent-message"
                className="rounded border px-3 py-2 text-[12px]"
                style={{
                  background: "var(--wc-ent-state-ok-bg, #ecfdf5)",
                  borderColor: "var(--wc-ent-state-ok-border, #10b981)",
                  color: "var(--wc-ent-state-ok-fg, #065f46)",
                }}
              >
                <div className="font-semibold">
                  {isAr
                    ? `تم إرسال دعوة التوقيع بنجاح إلى ${TEST_MODE.email}`
                    : `Signing invitation sent successfully to ${TEST_MODE.email}`}
                </div>
                {signingLinkUrl ? (
                  <div className="mt-1 break-all font-mono text-[11px]" data-testid="signing-link-url">
                    {signingLinkUrl}
                  </div>
                ) : null}
                <div
                  className="mt-1 text-[10px]"
                  style={{ color: "var(--wc-ent-fg-muted)" }}
                >
                  {isAr
                    ? "محاكاة فقط — لم يتم استدعاء أي خادم بريد إلكتروني خارجي."
                    : "Simulation only — no external SMTP provider was called."}
                </div>
              </div>
            ) : (
              <div className="text-[11px]" style={{ color: "var(--wc-ent-fg-muted)" }}>
                {isAr
                  ? "اضغط الزر لمحاكاة إنشاء وإرسال رابط توقيع المريض."
                  : "Click the button to simulate generating and sending the patient signing link."}
              </div>
            )}
          </div>
        </EnterpriseCard>

        {/* Step progress */}
        <EnterpriseCard
          header={{
            title: isAr ? "حالة الموقعين" : "Signer Status",
            subtitle: isAr
              ? "تدفق التوقيع المرحلي للموافقة المستنيرة"
              : "Staged signing flow for this consent",
          }}
        >
          <ConsentSignersBar items={signerProgress} language={language} />
        </EnterpriseCard>

        {/* Reading panel */}
        <EnterpriseCard
          header={{
            title: isAr ? "نص الموافقة المستنيرة" : "Informed Consent Body",
            subtitle: isAr
              ? "تخطيط القراءة المُحسَّن للجهاز اللوحي ومراجعة الطبيب"
              : "Reading layout optimized for tablet and physician review",
            status: { label: bilingual ? "EN + AR" : isAr ? "AR" : "EN", tone: "info" },
          }}
          padded={false}
        >
          <ConsentReadingPanel
            sections={sections}
            language={language}
            bilingual={bilingual}
            caption={{
              en: SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE.title.en,
              ar: SURGERY_MEDICAL_PROCEDURE_CONSENT_TEMPLATE.title.ar,
            }}
          />
        </EnterpriseCard>

        {/* Patient signature — reuses the production PatientSigningPanel */}
        <EnterpriseCard
          header={{
            title: isAr ? "توقيع المريض" : "Patient Signature",
            subtitle: isAr
              ? "إعادة استخدام مكوّن الإنتاج بحالة محلية ومعاينة فقط"
              : "Reuses the production component with local controlled state",
            status: {
              label: signatureState.acknowledgmentAccepted
                ? isAr
                  ? "إقرار"
                  : "Acknowledged"
                : isAr
                  ? "بانتظار"
                  : "Pending",
              tone: signatureState.acknowledgmentAccepted ? "ok" : "warn",
            },
          }}
        >
          <div className="space-y-3">
            <label className="block">
              <span
                className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {isAr ? "طريقة التوقيع" : "Signature method"}
              </span>
              <select
                value={signatureState.selectedMethod}
                onChange={(e) =>
                  setSignatureState((prev) => ({
                    ...prev,
                    selectedMethod: e.target.value as SignatureState["selectedMethod"],
                  }))
                }
                className="rounded border px-2 py-1.5 text-sm"
                style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
                data-testid="patient-signature-method"
              >
                <option value="otp">OTP only</option>
                <option value="tablet-drawn-signature">Tablet drawn signature</option>
                <option value="combined-tablet-and-otp">Tablet + OTP</option>
                <option value="biometric-fingerprint">Biometric fingerprint</option>
                <option value="combined-biometric-and-otp">Biometric + OTP</option>
              </select>
            </label>
            <PatientSigningPanel
              value={signatureState}
              onChange={(next) => setSignatureState(next)}
            />
          </div>
        </EnterpriseCard>

        {/* Witness + Physician side-by-side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <WitnessSignaturePanel
            language={language}
            value={witnessState}
            onChange={(next) => setWitnessState(next)}
          />
          <PhysicianAcknowledgmentCard
            language={language}
            physicianName={isAr ? PHYSICIAN.nameAr : PHYSICIAN.nameEn}
            licenseNumber={PHYSICIAN.license}
            department={isAr ? PHYSICIAN.departmentAr : PHYSICIAN.departmentEn}
            confirmed={physicianConfirmed}
            onConfirmedChange={setPhysicianConfirmed}
          />
        </div>

        {/* OTP verification — TEST MODE uses fixed code 123456 */}
        <MockOtpVerification
          language={language}
          maskedPhone={PATIENT.maskedPhone}
          expectedCode={TEST_MODE.otpCode}
          onVerified={() => setOtpVerifiedPreview(true)}
        />

        {/* Evidence */}
        <EnterpriseCard
          header={{
            title: isAr ? "حزمة الأدلة" : "Evidence Bundle",
            subtitle: isAr
              ? "بيانات تظهر بعد الختم النهائي في الإنتاج"
              : "Generated after the legal seal in production",
            status: { label: "Preview", tone: "info" },
          }}
          padded={false}
        >
          <div className="p-3">
            <EvidencePanel data={MOCK_EVIDENCE} layout="two-column" />
          </div>
        </EnterpriseCard>

        {/* TEST MODE success summary — visible after all signing steps complete */}
        {overallComplete ? (
          <EnterpriseCard
            header={{
              title: isAr ? "اكتمل التوقيع — ملخص النجاح" : "Signing Complete — Success Summary",
              subtitle: isAr
                ? "حزمة الأدلة جاهزة في وضع المعاينة"
                : "Evidence package ready in preview mode",
              status: { label: isAr ? "مكتمل" : "Complete", tone: "ok" },
            }}
          >
            <ul
              data-testid="signing-success-summary"
              className="grid gap-1 text-sm md:grid-cols-2"
            >
              <li data-testid="success-patient-signed">
                ✓ {isAr ? "تم توقيع المريض" : "Patient signed"}
              </li>
              <li data-testid="success-otp-verified">
                ✓ {isAr ? "تم التحقق من رمز OTP" : "OTP verified"}
              </li>
              <li data-testid="success-witness-completed">
                ✓ {isAr ? "اكتمل توقيع الشاهد" : "Witness completed"}
              </li>
              <li data-testid="success-physician-ack">
                ✓ {isAr ? "اكتمل إقرار الطبيب" : "Physician acknowledgment completed"}
              </li>
              <li data-testid="success-evidence-ready" className="md:col-span-2">
                ✓ {isAr ? "حزمة الأدلة جاهزة" : "Evidence package ready"}
              </li>
            </ul>
            <div
              className="mt-2 text-[11px]"
              style={{ color: "var(--wc-ent-fg-muted)" }}
            >
              {isAr
                ? "وضع المعاينة فقط — لم يتم ختم وثيقة PDF حقيقية."
                : "Preview mode only — no real PDF was sealed."}
            </div>
          </EnterpriseCard>
        ) : null}
      </div>
    </EnterpriseShell>
  );
}
