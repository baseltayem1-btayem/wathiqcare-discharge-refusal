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
    `╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é ┘ä╪¬┘ê┘é┘è╪╣ ┘ê╪½╪º╪ª┘é ┘ê╪½┘è┘é ┘â┘è╪▒ ┘ç┘ê: ${input.otpCode}.`,
    `╪¬┘å╪¬┘ç┘è ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä╪▒┘à╪▓ ╪«┘ä╪º┘ä ${input.expiresMinutes} ╪»┘é┘è┘é╪⌐.`,
    `╪▒╪º╪¿╪╖ ╪º┘ä╪¬┘ê┘é┘è╪╣ ╪º┘ä╪ó┘à┘å: ${input.linkUrl}`,
    "╪Ñ╪░╪º ┘ä┘à ╪¬╪╖┘ä╪¿ ┘ç╪░╪º ╪º┘ä╪▒┘à╪▓╪î ┘è╪▒╪¼┘ë ╪¬╪¼╪º┘ç┘ä ╪º┘ä╪▒╪│╪º┘ä╪⌐.",
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
    "╪▒╪º╪¿╪╖ ╪º┘ä╪¬┘ê┘é┘è╪╣ ╪º┘ä╪ó┘à┘å ┘à┘å ┘ê╪½┘è┘é ┘â┘è╪▒:",
    input.signingUrl,
    `╪¬┘å╪¬┘ç┘è ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä╪▒╪º╪¿╪╖ ╪«┘ä╪º┘ä ${input.expiresMinutes} ╪»┘é┘è┘é╪⌐.`,
    "╪Ñ╪░╪º ┘ä┘à ╪¬╪╖┘ä╪¿ ┘ç╪░╪º ╪º┘ä╪▒╪º╪¿╪╖╪î ┘è╪▒╪¼┘ë ╪¬╪¼╪º┘ç┘ä ╪º┘ä╪▒╪│╪º┘ä╪⌐.",
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
    "╪▒╪º╪¿╪╖ ╪¬┘ê┘é┘è╪╣ ╪º┘ä╪│┘å╪» ┘ä╪ú┘à╪▒ ┘à┘å ┘ê╪º╪½┘é ┘â┘è╪▒.",
    `╪▒┘é┘à ╪º┘ä╪│┘å╪»: ${input.noteNumber}.`,
    input.signingUrl,
    `╪¬┘å╪¬┘ç┘è ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä╪▒╪º╪¿╪╖ ╪«┘ä╪º┘ä ${input.expiresMinutes} ╪»┘é┘è┘é╪⌐.`,
    "╪Ñ╪░╪º ┘ä┘à ╪¬╪╖┘ä╪¿ ╪░┘ä┘â╪î ┘è╪▒╪¼┘ë ╪¬╪¼╪º┘ç┘ä ┘ç╪░┘ç ╪º┘ä╪▒╪│╪º┘ä╪⌐.",
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
    `╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é ┘ä╪¬┘ê┘é┘è╪╣ ╪º┘ä╪│┘å╪» ┘ä╪ú┘à╪▒ ╪▒┘é┘à ${input.noteNumber} ┘ç┘ê: ${input.otpCode}.`,
    `╪¬┘å╪¬┘ç┘è ╪╡┘ä╪º╪¡┘è╪⌐ ╪º┘ä╪▒┘à╪▓ ╪«┘ä╪º┘ä ${input.expiresMinutes} ╪»┘é┘è┘é╪⌐.`,
    "┘ä╪º ╪¬╪┤╪º╪▒┘â ┘ç╪░╪º ╪º┘ä╪▒┘à╪▓ ┘à╪╣ ╪ú┘è ╪┤╪«╪╡.",
  ].join(" ");
}
