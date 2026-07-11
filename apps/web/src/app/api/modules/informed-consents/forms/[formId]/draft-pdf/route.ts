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
  const drawnFields = await drawDoctorValues({ pdfDoc, mapping, values });
  const output = await pdfDoc.save();

  return new NextResponse(Buffer.from(output), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "X-WathiqCare-Draft-Overlay": "true",
      "X-WathiqCare-Drawn-Fields": String(drawnFields),
      "Content-Disposition": "inline; filename=\"" + formId + "-doctor-draft-preview.pdf\"",
    },
  });
}
