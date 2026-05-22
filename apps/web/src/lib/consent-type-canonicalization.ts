const CONSENT_TYPE_ALIASES: Record<string, string> = {
  SURGICAL_CONSENT: "SURGERY_CONSENT",
  SURGERY_CONSENT: "SURGERY_CONSENT",
  GENERAL_SURGERY: "SURGERY_CONSENT",
  BLOOD_TRANSFUSION: "BLOOD_TRANSFUSION_CONSENT",
  BLOOD_TRANSFUSION_CONSENT: "BLOOD_TRANSFUSION_CONSENT",
};

function normalizeToken(value: string | null | undefined): string {
  return (value || "").trim().replace(/[\s-]+/g, "_").toUpperCase();
}

export function normalizeConsentType(value: string | null | undefined): string {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return "";
  }

  return CONSENT_TYPE_ALIASES[normalized] || normalized;
}

export type ConsentMappingValidationRow = {
  originalValue: string;
  normalizedValue: string;
  templateFound: boolean;
};

export function buildConsentMappingValidationRows(
  inputs: string[],
  availableConsentTypes: Iterable<string>,
): ConsentMappingValidationRow[] {
  const available = new Set(
    Array.from(availableConsentTypes, (value) => normalizeConsentType(value)).filter(Boolean),
  );

  return inputs.map((originalValue) => {
    const normalizedValue = normalizeConsentType(originalValue);

    return {
      originalValue,
      normalizedValue,
      templateFound: Boolean(normalizedValue) && available.has(normalizedValue),
    };
  });
}
