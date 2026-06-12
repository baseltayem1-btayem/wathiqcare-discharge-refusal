type SanitizerLanguage = "ar" | "en" | "bilingual";

type SanitizeTextOptions = {
  lang?: SanitizerLanguage;
  preserveNewlines?: boolean;
  medicalContext?: boolean;
};

function normalizeWhitespace(value: string, preserveNewlines: boolean): string {
  const normalized = value.replace(/\r\n?/g, "\n");

  if (preserveNewlines) {
    return normalized
      .split("\n")
      .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return normalized.replace(/\s+/g, " ").trim();
}

function looksLikeArabic(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

function repairMojibake(value: string): string {
  if (!/[ØÙÃÂâï]/.test(value)) {
    return value;
  }

  try {
    const decoded = Buffer.from(value, "latin1").toString("utf8");
    if (decoded && !decoded.includes("�") && looksLikeArabic(decoded)) {
      return decoded;
    }
  } catch {
    // Keep the original string if re-decoding fails.
  }

  return value;
}

function stripCorruption(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uFFFE\uFFFF\uFFFD]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u00AD]+/g, "")
    .replace(/￾+/g, "")
    .replace(/�+/g, "")
    .replace(/[ÃÂ]+/g, "")
    .replace(/[ØÙâï]{3,}/g, " ");
}

function applyArabicRepairs(value: string, medicalContext: boolean): string {
  let output = value
    .replace(/المركز\s+الطيب\s+الدويل/g, "المركز الطبي الدولي")
    .replace(/المركز\s+الطيب\s+الدولي/g, "المركز الطبي الدولي")
    .replace(/موافقة\s+مستنرية/g, "موافقة مستنيرة")
    .replace(/نموذج\s+الموافقة\s+المستنرية/g, "نموذج الموافقة المستنيرة")
    .replace(/رقم\s+الملف\s+الطيب/g, "رقم الملف الطبي")
    .replace(/المحتوى\s+الطيب/g, "المحتوى الطبي")
    .replace(/السجل\s+الطيب/g, "السجل الطبي")
    .replace(/التوثيق\s+الطيب/g, "التوثيق الطبي")
    .replace(/الفيديو\s+الطيب/g, "الفيديو الطبي")
    .replace(/تشخييص/g, "تشخيصي")
    .replace(/الجنيب/g, "الجنبي")
    .replace(/الزنيف/g, "النزيف")
    .replace(/رفّمع/g, "معرّف")
    .replace(/وقد\s+الطبيب/g, "وقد شرح الطبيب")
    .replace(/لقد\s+تم\s+جميع\s+البنود/g, "لقد تم شرح جميع البنود")
    .replace(/(?<![\u0600-\u06FF])لط\s+جميع\s+أسئلتي/g, "لطرح جميع أسئلتي")
    .replace(/\bلط\s+جميع\s+أسئلتي/g, "لطرح جميع أسئلتي")
    .replace(/تم\s+البدائل\s+العلاجية/g, "تم شرح البدائل العلاجية")
    .replace(/لطرح\s+جميع\s+أسئلتي\s+واستفساراتي\s+والإجابة\s+عنها/g, "لطرح جميع أسئلتي واستفساراتي والإجابة عنها");

  if (medicalContext) {
    output = output.replace(
      /الطيب(?=\s+(?:الدولي|الدويل|القانوني|الملف|المحتوى|السجل|التوثيق|الفيديو|الشرح|الرعاية|البيانات|الموافقة|المركز))/g,
      "الطبي",
    );
  }

  return output;
}

export function deepSanitizeArabicText(
  value: unknown,
  options: Omit<SanitizeTextOptions, "lang"> = {},
): string {
  if (value == null) {
    return "";
  }

  let output = String(value);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const repaired = repairMojibake(output);
    if (repaired === output) {
      break;
    }
    output = repaired;
  }

  output = stripCorruption(output);
  output = applyArabicRepairs(output, options.medicalContext ?? true);

  return normalizeWhitespace(output, options.preserveNewlines ?? false);
}

export function sanitizePdfDisplayText(
  value: unknown,
  options: SanitizeTextOptions = {},
): string {
  if (value == null) {
    return "";
  }

  const lang = options.lang ?? "bilingual";
  const preserveNewlines = options.preserveNewlines ?? false;
  const raw = String(value);
  const stripped = stripCorruption(raw);
  const hasArabic = looksLikeArabic(stripped);

  if (lang === "ar" || hasArabic || lang === "bilingual") {
    return deepSanitizeArabicText(stripped, {
      preserveNewlines,
      medicalContext: options.medicalContext ?? hasArabic,
    });
  }

  return normalizeWhitespace(stripped, preserveNewlines);
}