import type { PromissoryNoteData } from "@/components/modules/PromissoryNoteDocument";

export type PromissoryNoteApiRecord = {
  id: string;
  noteNumber: string;
  debtorName: string;
  debtorIdNumber: string | null;
  issuerName: string | null;
  amount: string | number;
  currency: string;
  dueDate: string;
  createdAt: string;
  status: string;
  metadata: Record<string, unknown> | null;
  case?: {
    id: string;
    caseNumber: string | null;
    patientName: string | null;
  } | null;
};

type BuildPromissoryNoteDataOptions = {
  language: "ar" | "en";
  qrDataUrl?: string;
  verificationBaseUrl?: string;
};

const DEFAULT_CREDITOR_NAME_AR = "شركة المركز الطبي الدولي مساهمة مقفلة";
const DEFAULT_CREDITOR_NAME_EN = "International Medical Center (IMC)";

function readMetaStr(meta: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!meta) return "";
  for (const key of keys) {
    const val = meta[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function resolveVerificationUrl(noteId: string, baseUrl?: string): string {
  const path = `/verify/pn/${noteId}`;
  if (!baseUrl) {
    return path;
  }

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}

export function buildPromissoryNoteDocumentData(
  note: PromissoryNoteApiRecord,
  options: BuildPromissoryNoteDataOptions,
): PromissoryNoteData {
  const meta = note.metadata ?? {};
  const issueCity = readMetaStr(meta, "issue_city", "issueCity")
    || (options.language === "ar" ? "الرياض" : "Riyadh");

  return {
    noteNumber: note.noteNumber,
    amount: Number(note.amount),
    currency: note.currency,
    dueDate: note.dueDate,
    issueDate: note.createdAt,
    issueCity,
    paymentCity: readMetaStr(meta, "payment_city", "paymentCity") || issueCity,
    debtorName: note.debtorName,
    debtorId: note.debtorIdNumber ?? undefined,
    creditorName: options.language === "ar" ? DEFAULT_CREDITOR_NAME_AR : DEFAULT_CREDITOR_NAME_EN,
    creditorCR: readMetaStr(meta, "creditor_cr", "creditorCR") || undefined,
    reason: readMetaStr(meta, "reason") || undefined,
    referenceNumber: note.case?.caseNumber ?? undefined,
    statusCode: note.status,
    qrDataUrl: options.qrDataUrl || undefined,
    verificationUrl: resolveVerificationUrl(note.id, options.verificationBaseUrl),
    language: options.language,
  };
}

export function buildPromissoryNoteQrPayload(data: PromissoryNoteData): string {
  const dueDatePart = (() => {
    const parsed = new Date(data.dueDate);
    if (Number.isNaN(parsed.getTime())) {
      return data.dueDate;
    }
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const day = String(parsed.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  })();

  return [
    `NOTE:${data.noteNumber}`,
    `CREDITOR:${data.creditorName ?? ""}`,
    `DEBTOR:${data.debtorName}`,
    `AMOUNT:${data.amount} ${data.currency}`,
    `DUE:${dueDatePart}`,
    `VERIFY:${data.verificationUrl || data.referenceNumber || data.noteNumber}`,
  ].join("|");
}

export function buildPromissoryPdfFilename(noteNumber: string, noteId: string, language: "ar" | "en"): string {
  const rawValue = (noteNumber || noteId).trim() || noteId;
  const sanitized = rawValue.replace(/[^a-zA-Z0-9_-]/g, "_");
  const normalizedPrefix = /^PN-/i.test(sanitized)
    ? sanitized.replace(/^pn-/i, "PN-")
    : `PN-${sanitized}`;
  return `${normalizedPrefix}-${language}.pdf`;
}
