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
    `رمز التحقق لتوقيع وثائق واثق كير هو: ${input.otpCode}.`,
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
    "رابط التوقيع الآمن من واثق كير:",
    input.signingUrl,
    `تنتهي صلاحية الرابط خلال ${input.expiresMinutes} دقيقة.`,
    "إذا لم تطلب هذا الرابط، يرجى تجاهل الرسالة.",
  ].join(" ");
}
