/**
 * Public signing patient-facing helpers.
 *
 * Pure, side-effect-free utilities used by the mobile patient journey.
 * These functions do NOT touch OTP, signing, audit, or evidence logic.
 */

export type PublicSigningLang = "ar" | "en" | "bilingual";

const RTL_LOCALES = new Set<string>(["ar", "bilingual"]);

export function isRtlLang(lang: PublicSigningLang): boolean {
  return RTL_LOCALES.has(lang);
}

export function resolveWorkflowLang(
  preferred: string | null | undefined,
  serverLocale: string | null | undefined,
): PublicSigningLang {
  const normalized = String(preferred || serverLocale || "bilingual").toLowerCase();
  if (normalized === "ar") return "ar";
  if (normalized === "en") return "en";
  return "bilingual";
}

export function getUiLang(lang: PublicSigningLang): "ar" | "en" {
  return lang === "ar" ? "ar" : "en";
}

type SignerLabels = {
  title: string;
  description: string;
  placeholder: string;
  ariaLabel: string;
};

export function getSignerLabels(role: string, lang: PublicSigningLang): SignerLabels {
  const isGuardian = String(role).trim().toUpperCase() === "GUARDIAN";
  if (isGuardian) {
    if (lang === "ar") {
      return {
        title: "توقيع ولي الأمر / مَن يتخذ القرار البديل",
        description: "يرجى توقيع الحقل أدناه بصفتك ولي الأمر أو مَن يتخذ القرار البديل للمريض.",
        placeholder: "أدخل الاسم الكامل لولي الأمر / مَن يتخذ القرار البديل",
        ariaLabel: "لوحة توقيع ولي الأمر",
      };
    }
    return {
      title: "Guardian / Substitute Decision-Maker Signature",
      description: "Please sign below as the patient's guardian or substitute decision-maker.",
      placeholder: "Enter guardian/substitute decision-maker full name",
      ariaLabel: "Guardian signature pad",
    };
  }

  if (lang === "ar") {
    return {
      title: "توقيع المريض",
      description: "يرجى توقيع الحقل أدناه بصفتك المريض.",
      placeholder: "أدخل الاسم الكامل للمريض",
      ariaLabel: "لوحة توقيع المريض",
    };
  }
  return {
    title: "Patient Signature",
    description: "Please sign below as the patient.",
    placeholder: "Enter patient full name",
    ariaLabel: "Patient signature pad",
  };
}

export function getSignaturePadLabel(role: string, lang: PublicSigningLang): string {
  const isGuardian = String(role).trim().toUpperCase() === "GUARDIAN";
  if (isGuardian) {
    return lang === "ar"
      ? "ارسم توقيع ولي الأمر / مَن يتخذ القرار البديل"
      : "Draw guardian/substitute decision-maker signature";
  }
  return lang === "ar" ? "ارسم توقيع المريض" : "Draw patient signature";
}

export function getStageLabels(
  educationRequired: boolean,
  isRefusalPath: boolean,
  lang: PublicSigningLang,
): string[] {
  const labelsEn = educationRequired
    ? ["Identity", "OTP Verification", "Education", "Consent Review", "Decision", "Signature", "Confirmation"]
    : ["Identity", "OTP Verification", "Consent Review", "Decision", "Signature", "Confirmation"];

  const labelsAr = educationRequired
    ? ["الهوية", "التحقق من OTP", "التثقيف", "مراجعة الموافقة", "القرار", "التوقيع", "التأكيد"]
    : ["الهوية", "التحقق من OTP", "مراجعة الموافقة", "القرار", "التوقيع", "التأكيد"];

  if (isRefusalPath) {
    const refusalLabelsEn = educationRequired
      ? ["Identity", "OTP Verification", "Education", "Consent Review", "Decision", "Refusal Acknowledgement", "Refusal Signature"]
      : ["Identity", "OTP Verification", "Consent Review", "Decision", "Refusal Acknowledgement", "Refusal Signature"];
    const refusalLabelsAr = educationRequired
      ? ["الهوية", "التحقق من OTP", "التثقيف", "مراجعة الموافقة", "القرار", "إقرار الرفض", "توقيع الرفض"]
      : ["الهوية", "التحقق من OTP", "مراجعة الموافقة", "القرار", "إقرار الرفض", "توقيع الرفض"];
    return lang === "ar" ? refusalLabelsAr : refusalLabelsEn;
  }

  return lang === "ar" ? labelsAr : labelsEn;
}

export function formatMaskedPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const visible = phone.slice(-4);
  return `****${visible}`;
}

export function getFinalPdfUrl(
  token: string,
  options: {
    copy?: "PATIENT_COPY" | "MEDICAL_RECORD_COPY" | "LEGAL_ARCHIVE_COPY";
    lang?: PublicSigningLang;
    disposition?: "inline" | "attachment";
  } = {},
): string {
  const { copy = "PATIENT_COPY", lang = "bilingual", disposition = "attachment" } = options;
  const uiLang = getUiLang(lang);
  const params = new URLSearchParams();
  params.set("copy", copy);
  params.set("lang", uiLang);
  params.set("disposition", disposition);
  return `/api/public/informed-consents/signing/${encodeURIComponent(token)}/final-pdf?${params.toString()}`;
}

export function getDeliveryEndpoint(token: string): string {
  return `/api/public-signing/document/${encodeURIComponent(token)}/deliver`;
}

export function computeStageIndex(
  stages: string[],
  {
    identityConfirmed,
    otpVerified,
    educationAcknowledged,
    decisionStatus,
    refusalAcknowledged,
    signatureCaptured,
    educationRequired,
    isRefusalPath,
  }: {
    identityConfirmed: boolean;
    otpVerified: boolean;
    educationAcknowledged: boolean;
    decisionStatus: "UNDECIDED" | "CONSENT_ACCEPTED" | "CONSENT_REFUSED";
    refusalAcknowledged: boolean;
    signatureCaptured: boolean;
    educationRequired: boolean;
    isRefusalPath: boolean;
  },
): number {
  if (signatureCaptured) return stages.length - 1;
  if (!identityConfirmed) return stages.indexOf("Identity");
  if (!otpVerified) return stages.indexOf("OTP Verification");
  if (educationRequired && !educationAcknowledged) return stages.indexOf("Education");
  if (isRefusalPath && !refusalAcknowledged) return stages.indexOf(isRefusalPath ? "Refusal Acknowledgement" : "Decision");
  if (decisionStatus === "UNDECIDED") return stages.indexOf("Decision");
  return stages.indexOf(isRefusalPath ? "Refusal Signature" : "Signature");
}
