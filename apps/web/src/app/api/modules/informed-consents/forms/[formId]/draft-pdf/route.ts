import path from "node:path";
import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getConsentFieldMappingByFormId } from "@/lib/server/consent-field-mappings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ formId: string }> | { formId: string };
};

const ALLOWED_PUBLIC_PREFIXES = [
  "/approved-consent-forms/",
  "/approved-consent-forms-patient-copy/",
  "/imc-consent-library/",
];

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(record: Record<string, unknown> | undefined, keys: string[], fallback = 0): number {
  if (!record) return fallback;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function collectMappingFields(mapping: unknown): Record<string, unknown>[] {
  const mappingRecord = readRecord(mapping);
  const fields = mappingRecord?.fields;
  if (Array.isArray(fields)) return fields.filter(isPlainObject);
  const fieldRecord = readRecord(fields);
  if (fieldRecord) {
    return Object.entries(fieldRecord)
      .filter(([, value]) => isPlainObject(value))
      .map(([key, value]) => ({ key, ...(value as Record<string, unknown>) }));
  }
  return [];
}

function getPlacement(field: Record<string, unknown>): Record<string, unknown> | undefined {
  return readRecord(field.pdf) || readRecord(field.position) || readRecord(field.coordinates) || readRecord(field.overlay) || readRecord(field.boundingBox) || readRecord(field.box) || field;
}

function resolvePublicPdfPath(publicUrl: string): string | undefined {
  const clean = publicUrl.trim();
  if (!clean || /^https?:\/\//i.test(clean) || !clean.startsWith("/")) return undefined;
  const pathname = clean.split("?")[0] || "";
  const allowed = ALLOWED_PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!allowed) return undefined;
  let decoded = "";
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const relative = decoded.replace(/^\/+/, "");
  if (relative.includes("..") || path.extname(relative).toLowerCase() !== ".pdf") return undefined;
  return relative;
}

async function readPublicPdf(publicUrl: string): Promise<Uint8Array | undefined> {
  const relative = resolvePublicPdfPath(publicUrl);
  if (!relative) return undefined;
  const candidates = [
    path.join(process.cwd(), "public", relative),
    path.join(process.cwd(), "apps", "web", "public", relative),
  ];
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // Try next candidate.
    }
  }
  return undefined;
}

function formatFieldValue(field: Record<string, unknown>, raw: unknown): string {
  const value = String(raw ?? "").trim();
  const type = readString(field.type).toUpperCase();
  if (type === "CHECKBOX") {
    if (value === "true") return "Yes";
    if (value === "false") return "No";
  }
  return value;
}

function toWinAnsiSafe(text: string): string {
  return text.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "?");
}


function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toNumber(value: unknown): number | null {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function getCoordinatePlacement(field: Record<string, unknown>): Record<string, unknown> | null {
  const candidates = [
    field.coordinates,
    field.position,
    field.pdf,
    field.overlay,
    field,
  ];

  for (const candidate of candidates) {
    const record = toRecord(candidate);
    if (!record) continue;

    const x = toNumber(record.x);
    const y = toNumber(record.y);

    if (x !== null && y !== null) {
      return record;
    }
  }

  return null;
}

function resolvePageIndex(rawPage: unknown, totalPages: number): number {
  const pageNumber = toNumber(rawPage);
  if (pageNumber === null) return 0;

  if (pageNumber >= 1 && pageNumber <= totalPages) {
    return Math.floor(pageNumber) - 1;
  }

  if (pageNumber >= 0 && pageNumber < totalPages) {
    return Math.floor(pageNumber);
  }

  return 0;
}

function resolveOverlayText(field: Record<string, unknown>, value: unknown): string {
  const fieldType = String(field.type || "").toUpperCase();
  const raw = String(value ?? "").trim();

  if (fieldType === "CHECKBOX") {
    if (raw === "true") return "Yes";
    if (raw === "false") return "No";
  }

  return raw;
}

function splitOverlayLines(text: string, maxChars = 90): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? current + " " + word : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 4);
}


function collectCoordinateFieldsDeep(value: unknown, seen = new Set<unknown>()): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  if (seen.has(value)) return [];
  seen.add(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectCoordinateFieldsDeep(item, seen));
  }

  const record = value as Record<string, unknown>;
  const hasKey = typeof record.key === "string" && record.key.length > 0;
  const hasPlacement = Boolean(getCoordinatePlacement(record));

  const nested = Object.values(record).flatMap((item) => collectCoordinateFieldsDeep(item, seen));

  if (hasKey && hasPlacement) {
    return [record, ...nested];
  }

  return nested;
}

async function drawDoctorValuesFromCoordinates(args: {
  pdfDoc: PDFDocument;
  mapping: Record<string, unknown>;
  values: Record<string, unknown>;
}) {
  const { pdfDoc, mapping, values } = args;
  const effectiveMapping = toRecord(mapping.mapping) ?? mapping;
  const fieldsRaw = collectCoordinateFieldsDeep(effectiveMapping);

  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const coordinateMode = String(effectiveMapping.coordinateMode || "").toUpperCase();

  let drawn = 0;

  for (const rawField of fieldsRaw) {
    const field = toRecord(rawField);
    if (!field) continue;

    const key = String(field.key || "");
    if (!key || !(key in values)) continue;

    const text = toWinAnsiSafe(resolveOverlayText(field, values[key]));
    if (!text.trim()) continue;

    const placement = getCoordinatePlacement(field);
    if (!placement) continue;

    const xRaw = toNumber(placement.x);
    const yRaw = toNumber(placement.y);
    if (xRaw === null || yRaw === null) continue;

    const pageIndex = resolvePageIndex(placement.page ?? placement.pageNumber ?? 1, pages.length);
    const page = pages[pageIndex] ?? pages[0];
    if (!page) continue;

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    const normalized =
      coordinateMode === "NORMALIZED" ||
      (xRaw >= 0 && xRaw <= 1 && yRaw >= 0 && yRaw <= 1);

    const x = normalized ? xRaw * pageWidth : xRaw;
    const y = normalized ? pageHeight * (1 - yRaw) : yRaw;

    const size = toNumber(placement.size) ?? 8;
    const maxWidthRaw = toNumber(placement.maxWidth) ?? 0.35;
    const maxWidth = maxWidthRaw > 0 && maxWidthRaw <= 1 ? maxWidthRaw * pageWidth : maxWidthRaw;

    const lines = splitOverlayLines(text, Math.max(24, Math.floor(maxWidth / Math.max(size * 0.48, 3.5))));
    let lineY = y;

    for (const line of lines) {
      page.drawText(line, {
        x,
        y: lineY,
        size,
        font,
        color: rgb(0.05, 0.09, 0.16),
        maxWidth,
      });
      lineY -= size + 2;
    }

    drawn += 1;
  }

  return drawn;
}

async function drawFallbackDoctorValues(args: {
  pdfDoc: PDFDocument;
  values: Record<string, unknown>;
}) {
  const { pdfDoc, values } = args;
  const pages = pdfDoc.getPages();
  const page = pages[0];
  if (!page) return 0;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const height = page.getHeight();
  const entries = Object.entries(values)
    .filter(([, value]) => String(value ?? '').trim().length > 0)
    .slice(0, 12);

  if (entries.length === 0) return 0;

  const boxX = 28;
  const boxY = Math.max(40, height - 190);
  const boxW = Math.min(width - 56, 520);
  const boxH = Math.min(150, 34 + entries.length * 13);

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: rgb(0.08, 0.38, 0.75),
    color: rgb(0.93, 0.97, 1),
    borderWidth: 1,
  });

  page.drawText('Doctor-completed draft values', {
    x: boxX + 10,
    y: boxY + boxH - 18,
    size: 9,
    font: boldFont,
    color: rgb(0.05, 0.09, 0.16),
  });

  let currentY = boxY + boxH - 34;
  for (const [key, value] of entries) {
    const line = toWinAnsiSafe(`${key}: ${String(value ?? '').trim()}`).slice(0, 105);
    page.drawText(line, {
      x: boxX + 10,
      y: currentY,
      size: 7.5,
      font,
      color: rgb(0.05, 0.09, 0.16),
      maxWidth: boxW - 20,
    });
    currentY -= 12;
  }

  return entries.length;
}

async function drawDoctorValues(args: {
  pdfDoc: PDFDocument;
  mapping: unknown;
  values: Record<string, unknown>;
}) {
  const { pdfDoc, mapping, values } = args;
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const mappingRecord = readRecord(mapping);
  const coordinateMode = readString(mappingRecord?.coordinateMode).toUpperCase();
  const fields = collectMappingFields(mapping);
  let drawn = 0;

  for (const field of fields) {
    const key = readString(field.key) || readString(field.name) || readString(field.id);
    if (!key || !(key in values)) continue;

    const formatted = formatFieldValue(field, values[key]);
    if (!formatted) continue;

    const placement = getPlacement(field);
    if (!placement) continue;

    const rawX = readNumber(placement, ["x", "left"], Number.NaN);
    const rawY = readNumber(placement, ["y", "top"], Number.NaN);
    if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) continue;

    const rawPage = readNumber(placement, ["page", "pageNumber"], 1);
    const pageIndex = Math.max(0, Math.min(pages.length - 1, rawPage > 0 ? rawPage - 1 : rawPage));
    const page = pages[pageIndex];
    if (!page) continue;

    const width = page.getWidth();
    const height = page.getHeight();
    const normalized = coordinateMode === "NORMALIZED" || readString(placement.coordinateMode).toUpperCase() === "NORMALIZED" || (rawX >= 0 && rawX <= 1 && rawY >= 0 && rawY <= 1);
    const size = readNumber(placement, ["size", "fontSize"], 9);
    const x = normalized ? rawX * width : rawX;
    const yFromTop = normalized ? rawY * height : rawY;
    const y = normalized ? height - yFromTop - size : yFromTop;
    const rawMaxWidth = readNumber(placement, ["maxWidth", "width", "w"], 220);
    const maxWidth = normalized && rawMaxWidth > 0 && rawMaxWidth <= 1 ? rawMaxWidth * width : rawMaxWidth;
    const lines = toWinAnsiSafe(formatted).split(/\r?\n/).slice(0, 6);
    let currentY = y;

    for (const line of lines) {
      page.drawText(line || " ", {
        x,
        y: currentY,
        size,
        font,
        color: rgb(0.05, 0.09, 0.16),
        maxWidth,
        lineHeight: size + 3,
      });
      currentY -= size + 3;
    }

    drawn += 1;
  }

  if (pages[0]) {
    pages[0].drawText("WathiqCare draft preview - physician values overlay", {
      x: 24,
      y: 18,
      size: 7,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  return drawn;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { formId } = await Promise.resolve(params);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const approvedPdfUrl = readString(body.approvedPdfUrl) || readString(body.pdfUrl);
  const values = readRecord(body.doctorCompletionValues) || readRecord(body.values) || {};

  if (!approvedPdfUrl) {
    return NextResponse.json({ ok: false, error: "approvedPdfUrl is required" }, { status: 400 });
  }

  const pdfBytes = await readPublicPdf(approvedPdfUrl);
  if (!pdfBytes) {
    return NextResponse.json({ ok: false, error: "Approved PDF source could not be loaded for draft overlay" }, { status: 404 });
  }

  const mapping = getConsentFieldMappingByFormId(formId);
  if (!mapping) {
    return NextResponse.json({ ok: false, error: "Consent field mapping not found for draft overlay" }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const coordinateDrawnFields = await drawDoctorValuesFromCoordinates({
    pdfDoc,
    mapping: mapping as unknown as Record<string, unknown>,
    values,
  });
  const drawnFields = coordinateDrawnFields > 0 ? 0 : await drawDoctorValues({ pdfDoc, mapping, values });
  const totalDrawnFields = drawnFields + coordinateDrawnFields;
  const fallbackDrawnFields = totalDrawnFields > 0 ? 0 : await drawFallbackDoctorValues({ pdfDoc, values });
  const output = await pdfDoc.save();

  return new NextResponse(Buffer.from(output), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "X-WathiqCare-Draft-Overlay": "true",
      "X-WathiqCare-Drawn-Fields": String(drawnFields),
      "X-WathiqCare-Coordinate-Drawn-Fields": String(coordinateDrawnFields),
      "X-WathiqCare-Total-Drawn-Fields": String(totalDrawnFields),
      "X-WathiqCare-Fallback-Drawn-Fields": String(fallbackDrawnFields),
      "Content-Disposition": "inline; filename=\"" + formId + "-doctor-draft-preview.pdf\"",
    },
  });
}
