import { NextRequest, NextResponse } from "next/server";
import manifest from "@/data/informed-consents/approved-consent-pdf-manifest.json";

type PdfManifestItem = {
  id?: string;
  code?: string;
  templateId?: string;
  title?: string;
  fileName?: string;
  publicPath?: string;
  contentType?: string;
};

function slugify(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value: string | null | undefined) {
  return slugify(value);
}

function findPdf(identifier: string | null, title: string | null) {
  const items = manifest as PdfManifestItem[];
  const candidates = new Set(
    [
      identifier,
      title,
      decodeURIComponent(identifier || ""),
      decodeURIComponent(title || ""),
    ]
      .filter(Boolean)
      .map((value) => normalize(value)),
  );

  return (
    items.find((item) =>
      [
        item.id,
        item.code,
        item.templateId,
        item.title,
        item.fileName?.replace(/\.pdf$/i, ""),
      ]
        .filter(Boolean)
        .map((value) => normalize(value))
        .some((value) => candidates.has(value)),
    ) || null
  );
}

function pdfEscape(value: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function buildFallbackPdf(args: {
  id: string;
  title: string;
  expectedFileName: string;
}) {
  const now = new Date().toISOString();

  const lines = [
    "WathiqCare - Approved Consent PDF Preview",
    "",
    `Title: ${args.title}`,
    `Template ID: ${args.id}`,
    `Expected Physical File: ${args.expectedFileName}`,
    "",
    "Status:",
    "No physical approved PDF has been uploaded yet for this library item.",
    "This generated preview confirms that the library item is resolved and ready for mapping.",
    "",
    "Next Required Operational Step:",
    `Upload the official PDF file to public/approved-consents/${args.expectedFileName}`,
    "then regenerate the approved consent PDF manifest.",
    "",
    `Generated: ${now}`,
  ];

  const textCommands = lines
    .map((line, index) => `BT /F1 10 Tf 50 ${760 - index * 22} Td (${pdfEscape(line)}) Tj ET`)
    .join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
  );
  objects.push("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n");

  const stream = `${textCommands}\n`;
  objects.push(`5 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream\nendobj\n`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");

  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id =
    searchParams.get("id") ||
    searchParams.get("templateId") ||
    searchParams.get("code") ||
    "approved-consent-template";

  const title =
    searchParams.get("title") ||
    searchParams.get("titleEn") ||
    searchParams.get("titleAr") ||
    id;

  const expectedFileName = `${normalize(title || id)}.pdf`;
  const pdf = findPdf(id, title);

  if (pdf?.publicPath) {
    const absoluteUrl = new URL(pdf.publicPath, request.nextUrl.origin);
    return NextResponse.redirect(absoluteUrl, 302);
  }

  const generated = buildFallbackPdf({
    id,
    title,
    expectedFileName,
  });

  return new NextResponse(generated, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${expectedFileName}"`,
      "Cache-Control": "no-store, max-age=0",
      "X-WathiqCare-PDF-Source": "generated-fallback-unmapped-approved-consent",
      "X-WathiqCare-Expected-Physical-File": expectedFileName,
    },
  });
}
