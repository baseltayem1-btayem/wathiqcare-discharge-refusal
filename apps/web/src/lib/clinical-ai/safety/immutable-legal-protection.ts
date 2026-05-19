export const IMMUTABLE_LEGAL_FIELDS = [
  "legalClauses",
  "pdplClauses",
  "signatureBlocks",
  "disclaimerText",
  "otpEvidence",
  "auditMetadata",
  "evidenceFooter",
  "verificationWording",
] as const;

export function protectImmutableLegalBlocks(fields: Record<string, unknown>): { allowed: boolean; blockedFields: string[] } {
  const blockedFields = IMMUTABLE_LEGAL_FIELDS.filter((field) => field in fields);
  return {
    allowed: blockedFields.length === 0,
    blockedFields,
  };
}