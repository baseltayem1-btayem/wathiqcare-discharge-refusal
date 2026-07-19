const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const GB_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})/;

/**
 * Normalize a raw patient date-of-birth value into ISO-8601 calendar date form
 * (YYYY-MM-DD). Accepts Date instances, ISO strings, DD/MM/YYYY strings, and
 * generic timestamps. Returns undefined when the value is missing or cannot be
 * safely interpreted as a calendar date, so the governance layer can fail closed.
 */
export function normalizePatientDob(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString().slice(0, 10);
  }

  const str = String(value).trim();
  if (!str) return undefined;

  const isoMatch = str.match(ISO_DATE_RE);
  if (isoMatch) {
    return isoMatch[0];
  }

  const gbMatch = str.match(GB_DATE_RE);
  if (gbMatch) {
    return `${gbMatch[3]}-${gbMatch[2]}-${gbMatch[1]}`;
  }

  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}
