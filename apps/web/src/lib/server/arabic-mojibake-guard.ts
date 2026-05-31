type ArabicMojibakeDiagnostic = {
  fieldPath: string;
  sample: string;
};

const ARABIC_LETTER_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const MOJIBAKE_MARKER_REGEX = /[ØÙ�ÃÂ]/;
const MAX_REPAIR_PASSES = 3;

function compactSample(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function decodeLatin1AsUtf8(value: string): string {
  return Buffer.from(value, "latin1").toString("utf8").trim();
}

export function containsArabicMojibake(value: string | null | undefined): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return MOJIBAKE_MARKER_REGEX.test(trimmed);
}

export function normalizeArabicForPatientFacingText(value: string | null | undefined): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed || !containsArabicMojibake(trimmed)) {
    return trimmed;
  }

  let candidate = trimmed;
  for (let pass = 0; pass < MAX_REPAIR_PASSES; pass += 1) {
    const repaired = decodeLatin1AsUtf8(candidate);
    if (!repaired || repaired === candidate) {
      break;
    }

    const repairedHasArabicLetters = ARABIC_LETTER_REGEX.test(repaired);
    const repairedHasMojibakeMarkers = containsArabicMojibake(repaired);
    if (repairedHasArabicLetters && !repairedHasMojibakeMarkers) {
      return repaired;
    }

    candidate = repaired;
  }

  return trimmed;
}

export function collectArabicMojibakeDiagnostics(entries: Array<{ fieldPath: string; value: string | null | undefined }>): ArabicMojibakeDiagnostic[] {
  const diagnostics: ArabicMojibakeDiagnostic[] = [];

  for (const entry of entries) {
    const normalized = normalizeArabicForPatientFacingText(entry.value);
    if (!containsArabicMojibake(normalized)) {
      continue;
    }

    diagnostics.push({
      fieldPath: entry.fieldPath,
      sample: compactSample(normalized),
    });
  }

  return diagnostics;
}