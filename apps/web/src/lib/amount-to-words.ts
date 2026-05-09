/**
 * Amount to words conversion for Arabic and English.
 * Supports SAR (Saudi Riyals) and other currencies up to trillions.
 */

// ─── English ──────────────────────────────────────────────────────────────────

const EN_ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const EN_TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function enHundreds(n: number): string {
  if (n === 0) return "";
  if (n < 20) return EN_ONES[n];
  if (n < 100) {
    const t = EN_TENS[Math.floor(n / 10)];
    const o = EN_ONES[n % 10];
    return o ? `${t} ${o}` : t;
  }
  const h = EN_ONES[Math.floor(n / 100)];
  const rem = n % 100;
  return rem === 0 ? `${h} Hundred` : `${h} Hundred and ${enHundreds(rem)}`;
}

function enChunks(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const scales = [
    { value: 1_000_000_000_000, label: "Trillion" },
    { value: 1_000_000_000, label: "Billion" },
    { value: 1_000_000, label: "Million" },
    { value: 1_000, label: "Thousand" },
    { value: 1, label: "" },
  ];
  for (const { value, label } of scales) {
    const chunk = Math.floor(n / value);
    if (chunk > 0) {
      const text = enHundreds(chunk);
      parts.push(label ? `${text} ${label}` : text);
      n -= chunk * value;
    }
  }
  return parts.join(" ");
}

/**
 * Converts a numeric amount to English words with currency denomination.
 * @example toEnglishWords(1525.50, "SAR") → "One Thousand Five Hundred Twenty Five Saudi Riyals and Fifty Halalas"
 */
export function toEnglishWords(amount: number, currency = "SAR"): string {
  const fixed = Math.round(amount * 100);
  const riyals = Math.floor(fixed / 100);
  const halalas = fixed % 100;

  const { mainUnit, subUnit } = currencyLabelsEn(currency);
  const main = `${enChunks(riyals)} ${riyals === 1 ? mainUnit.singular : mainUnit.plural}`;
  if (halalas === 0) return main + " Only";
  const sub = `${enChunks(halalas)} ${halalas === 1 ? subUnit.singular : subUnit.plural}`;
  return `${main} and ${sub} Only`;
}

function currencyLabelsEn(currency: string): {
  mainUnit: { singular: string; plural: string };
  subUnit: { singular: string; plural: string };
} {
  switch (currency.toUpperCase()) {
    case "SAR":
      return { mainUnit: { singular: "Saudi Riyal", plural: "Saudi Riyals" }, subUnit: { singular: "Halala", plural: "Halalas" } };
    case "USD":
      return { mainUnit: { singular: "Dollar", plural: "Dollars" }, subUnit: { singular: "Cent", plural: "Cents" } };
    case "EUR":
      return { mainUnit: { singular: "Euro", plural: "Euros" }, subUnit: { singular: "Cent", plural: "Cents" } };
    case "GBP":
      return { mainUnit: { singular: "Pound", plural: "Pounds" }, subUnit: { singular: "Penny", plural: "Pence" } };
    default:
      return { mainUnit: { singular: currency, plural: currency }, subUnit: { singular: "Cent", plural: "Cents" } };
  }
}

// ─── Arabic ───────────────────────────────────────────────────────────────────

const AR_ONES = [
  "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
  "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر",
  "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر",
];
const AR_TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const AR_HUNDREDS = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];

function arHundreds(n: number): string {
  if (n === 0) return "";
  if (n < 20) return AR_ONES[n];
  if (n < 100) {
    const t = AR_TENS[Math.floor(n / 10)];
    const o = AR_ONES[n % 10];
    return o ? `${o} و${t}` : t;
  }
  const h = AR_HUNDREDS[Math.floor(n / 100)];
  const rem = n % 100;
  if (rem === 0) return h;
  return `${h} و${arHundreds(rem)}`;
}

function arChunks(n: number): string {
  if (n === 0) return "صفر";
  const parts: string[] = [];
  const scales = [
    { value: 1_000_000_000_000, singular: "تريليون", plural: "تريليون" },
    { value: 1_000_000_000, singular: "مليار", plural: "مليار" },
    { value: 1_000_000, singular: "مليون", plural: "مليون" },
    { value: 1_000, singular: "ألف", plural: "ألف" },
    { value: 1, singular: "", plural: "" },
  ];
  for (const { value, singular, plural } of scales) {
    const chunk = Math.floor(n / value);
    if (chunk > 0) {
      const text = arHundreds(chunk);
      const label = chunk === 1 && singular ? singular : plural;
      parts.push(singular ? `${text} ${label}` : text);
      n -= chunk * value;
    }
  }
  return parts.join(" و");
}

/**
 * Converts a numeric amount to Arabic words with currency denomination.
 * @example toArabicWords(1525.50, "SAR") → "ألف وخمسمئة وخمسة وعشرون ريالاً سعودياً وخمسون هللة فقط لا غير"
 */
export function toArabicWords(amount: number, currency = "SAR"): string {
  const fixed = Math.round(amount * 100);
  const riyals = Math.floor(fixed / 100);
  const halalas = fixed % 100;

  const { mainUnit, subUnit } = currencyLabelsAr(currency);
  const main = `${arChunks(riyals)} ${riyals === 1 ? mainUnit.singular : mainUnit.plural}`;
  if (halalas === 0) return main + " فقط لا غير";
  const sub = `${arChunks(halalas)} ${halalas === 1 ? subUnit.singular : subUnit.plural}`;
  return `${main} و${sub} فقط لا غير`;
}

function currencyLabelsAr(currency: string): {
  mainUnit: { singular: string; plural: string };
  subUnit: { singular: string; plural: string };
} {
  switch (currency.toUpperCase()) {
    case "SAR":
      return { mainUnit: { singular: "ريال سعودي", plural: "ريال سعودي" }, subUnit: { singular: "هللة", plural: "هللة" } };
    case "USD":
      return { mainUnit: { singular: "دولار أمريكي", plural: "دولار أمريكي" }, subUnit: { singular: "سنت", plural: "سنت" } };
    case "EUR":
      return { mainUnit: { singular: "يورو", plural: "يورو" }, subUnit: { singular: "سنت", plural: "سنت" } };
    case "GBP":
      return { mainUnit: { singular: "جنيه إسترليني", plural: "جنيه إسترليني" }, subUnit: { singular: "بنس", plural: "بنس" } };
    default:
      return { mainUnit: { singular: currency, plural: currency }, subUnit: { singular: "سنت", plural: "سنت" } };
  }
}

/**
 * Format a numeric amount with thousands separator and 2 decimal places.
 */
export function formatAmountNumeric(amount: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}
