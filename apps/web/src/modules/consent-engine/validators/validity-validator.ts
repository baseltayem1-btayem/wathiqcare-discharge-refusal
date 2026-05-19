import type { DynamicConsentPayload } from "@/modules/consent-engine/engine/types";

export interface ValidityValidation {
  isValid: boolean;
  errors: string[];
  expirationDate?: string;
  daysRemaining?: number;
}

export interface ValidityPeriod {
  validityDays: number;
  generatedAt?: string;
}

export function calculateExpirationDate(generatedAt: string, validityDays: number): string {
  const generated = new Date(generatedAt);
  const expiration = new Date(generated.getTime() + validityDays * 24 * 60 * 60 * 1000);
  return expiration.toISOString();
}

export function validateValidityPeriod(
  payload: DynamicConsentPayload,
  validityPeriod: ValidityPeriod,
): ValidityValidation {
  const errors: string[] = [];
  const generatedAt = payload.audit?.generatedAt || new Date().toISOString();
  const expirationDate = calculateExpirationDate(generatedAt, validityPeriod.validityDays);
  const now = new Date();
  const expiration = new Date(expirationDate);
  const daysRemaining = Math.ceil((expiration.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  if (daysRemaining <= 0) {
    errors.push(`Consent has expired. Validity period was ${validityPeriod.validityDays} days (until ${expirationDate})`);
  }

  if (daysRemaining < 3) {
    errors.push(`Consent expires in ${daysRemaining} days`);
  }

  return {
    isValid: daysRemaining > 0,
    errors,
    expirationDate,
    daysRemaining: Math.max(0, daysRemaining),
  };
}
