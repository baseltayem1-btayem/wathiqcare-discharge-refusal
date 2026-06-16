export type SigningOtpTemplateInput = {
  otpCode: string;
  linkUrl: string;
  expiresMinutes: number;
  locale?: "ar" | "en";
};

export type SecureSigningLinkTemplateInput = {
  signingUrl: string;
  expiresMinutes: number;
  locale?: "ar" | "en";
};

export function buildSigningOtpSms(input: SigningOtpTemplateInput): string {
  const locale = input.locale ?? "ar";

  if (locale === "en") {
    return [
      `Your WathiqCare signing OTP is ${input.otpCode}.`,
      `This code expires in ${input.expiresMinutes} minutes.`,
      `Secure signing link: ${input.linkUrl}`,
      "If you did not request this, ignore this message.",
    ].join(" ");
  }

  return [
    `رمز التحقق لتوقيع وثائق وثيق كير هو: ${input.otpCode}.`,
    `تنتهي صلاحية الرمز خلال ${input.expiresMinutes} دقيقة.`,
    `رابط التوقيع الآمن: ${input.linkUrl}`,
    "إذا لم تطلب هذا الرمز، يرجى تجاهل الرسالة.",
  ].join(" ");
}

export function buildSecureSigningLinkSms(input: SecureSigningLinkTemplateInput): string {
  const locale = input.locale ?? "ar";

  if (locale === "en") {
    return [
      "WathiqCare secure signing link:",
      input.signingUrl,
      `Link expires in ${input.expiresMinutes} minutes.`,
      "If you did not request this, ignore this message.",
    ].join(" ");
  }

  return [
    "رابط التوقيع الآمن من وثيق كير:",
    input.signingUrl,
    `تنتهي صلاحية الرابط خلال ${input.expiresMinutes} دقيقة.`,
    "إذا لم تطلب هذا الرابط، يرجى تجاهل الرسالة.",
  ].join(" ");
}


export type PromissoryNoteSigningLinkTemplateInput = {
  signingUrl: string;
  noteNumber: string;
  expiresMinutes: number;
  locale?: "ar" | "en";
};

export type PromissoryNoteSigningOtpTemplateInput = {
  otpCode: string;
  noteNumber: string;
  expiresMinutes: number;
  locale?: "ar" | "en";
};

export function buildPromissoryNoteSigningLinkSms(input: PromissoryNoteSigningLinkTemplateInput): string {
  const locale = input.locale ?? "ar";

  if (locale === "en") {
    return [
      "WathiqCare Promissory Note signing link.",
      `Note No.: ${input.noteNumber}.`,
      input.signingUrl,
      `This link expires in ${input.expiresMinutes} minutes.`,
      "If you did not request this, ignore this message.",
    ].join(" ");
  }

  return [
    "رابط توقيع السند لأمر من واثق كير.",
    `رقم السند: ${input.noteNumber}.`,
    input.signingUrl,
    `تنتهي صلاحية الرابط خلال ${input.expiresMinutes} دقيقة.`,
    "إذا لم تطلب ذلك، يرجى تجاهل هذه الرسالة.",
  ].join(" ");
}

export function buildPromissoryNoteSigningOtpSms(input: PromissoryNoteSigningOtpTemplateInput): string {
  const locale = input.locale ?? "ar";

  if (locale === "en") {
    return [
      `Your WathiqCare OTP for Promissory Note ${input.noteNumber} is: ${input.otpCode}.`,
      `This code expires in ${input.expiresMinutes} minutes.`,
      "Do not share this code with anyone.",
    ].join(" ");
  }

  return [
    `رمز التحقق لتوقيع السند لأمر رقم ${input.noteNumber} هو: ${input.otpCode}.`,
    `تنتهي صلاحية الرمز خلال ${input.expiresMinutes} دقيقة.`,
    "لا تشارك هذا الرمز مع أي شخص.",
  ].join(" ");
}
