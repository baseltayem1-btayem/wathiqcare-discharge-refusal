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

type LibraryItem = Record<string, any>;

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

function findPhysicalPdf(identifier: string | null, title: string | null) {
  const items = manifest as PdfManifestItem[];
  const candidates = new Set(
    [identifier, title, decodeURIComponent(identifier || ""), decodeURIComponent(title || "")]
      .filter(Boolean)
      .map((value) => normalize(value)),
  );

  return (
    items.find((item) =>
      [item.id, item.code, item.templateId, item.title, item.fileName?.replace(/\.pdf$/i, "")]
        .filter(Boolean)
        .map((value) => normalize(value))
        .some((value) => candidates.has(value)),
    ) || null
  );
}

function unwrapLibraryPayload(payload: any): LibraryItem[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.templates)) return payload.templates;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.templates)) return payload.data.templates;
  return [];
}

function itemIdentity(item: LibraryItem) {
  return [
    item.id,
    item.code,
    item.templateId,
    item.templateVersionId,
    item.slug,
    item.title,
    item.titleEn,
    item.titleAr,
  ]
    .filter(Boolean)
    .map((value) => normalize(String(value)));
}

function findLibraryItem(items: LibraryItem[], identifier: string, title: string) {
  const candidates = new Set(
    [identifier, title, decodeURIComponent(identifier || ""), decodeURIComponent(title || "")]
      .filter(Boolean)
      .map((value) => normalize(String(value))),
  );

  return items.find((item) => itemIdentity(item).some((value) => candidates.has(value))) || null;
}

async function loadLibraryItem(request: NextRequest, identifier: string, title: string) {
  const url = new URL("/api/modules/informed-consents/imc-library", request.nextUrl.origin);
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const items = unwrapLibraryPayload(payload);
  return findLibraryItem(items, identifier, title);
}

function clean(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function collectText(value: any, label = "", depth = 0): string[] {
  if (value === null || value === undefined) return [];
  if (depth > 4) return [];

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = clean(value);
    return text ? [`${label ? `${label}: ` : ""}${text}`] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectText(entry, label ? `${label} ${index + 1}` : `${index + 1}`, depth + 1));
  }

  if (typeof value === "object") {
    const excluded = new Set([
      "id",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "tenantId",
      "templateId",
      "templateVersionId",
      "status",
      "language",
      "fileUrl",
      "pdfUrl",
      "previewUrl",
      "publicPath",
      "metadata",
      "raw",
    ]);

    const priority = [
      "titleEn",
      "titleAr",
      "title",
      "summaryEn",
      "summaryAr",
      "summary",
      "descriptionEn",
      "descriptionAr",
      "description",
      "procedureEn",
      "procedureAr",
      "procedure",
      "indicationsEn",
      "indicationsAr",
      "indications",
      "risksEn",
      "risksAr",
      "risks",
      "benefitsEn",
      "benefitsAr",
      "benefits",
      "alternativesEn",
      "alternativesAr",
      "alternatives",
      "anesthesiaEn",
      "anesthesiaAr",
      "anesthesia",
      "patientInstructionsEn",
      "patientInstructionsAr",
      "patientInstructions",
      "consentTextEn",
      "consentTextAr",
      "consentText",
      "bodyEn",
      "bodyAr",
      "body",
      "contentEn",
      "contentAr",
      "content",
      "sections",
      "clauses",
      "questions",
      "acknowledgments",
    ];

    const keys = [
      ...priority.filter((key) => Object.prototype.hasOwnProperty.call(value, key)),
      ...Object.keys(value).filter((key) => !priority.includes(key)),
    ];

    return keys.flatMap((key) => {
      if (excluded.has(key)) return [];
      const readable = key
        .replace(/([A-Z])/g, " $1")
        .replace(/\b(en|ar)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();

      return collectText(value[key], readable, depth + 1);
    });
  }

  return [];
}

function wrapLine(line: string, max = 92) {
  const words = line.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if ((current + " " + word).trim().length > max) {
      if (current.trim()) lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current.trim()) lines.push(current.trim());
  return lines;
}

function pdfEscape(value: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function buildApprovedConsentPdf(args: {
  id: string;
  title: string;
  item: LibraryItem;
}) {
  const officialTitle = clean(args.item.titleEn || args.item.title || args.title || args.id);
  const titleAr = clean(args.item.titleAr || "");
  const code = clean(args.item.code || args.item.consentType || args.id);
  const specialty = clean(args.item.specialty || args.item.department || "");
  const version = clean(args.item.version || args.item.versionNo || args.item.templateVersion || "");

  const collected = collectText(args.item)
    .map((line) => clean(line))
    .filter(Boolean);

  const uniqueLines = Array.from(new Set(collected));

  const headerLines = [
    "WathiqCare - IMC Approved Informed Consent",
    "",
    `Consent Title: ${officialTitle}`,
    titleAr ? `Arabic Title: ${titleAr}` : "",
    `Template ID: ${args.id}`,
    code ? `Consent Code / Type: ${code}` : "",
    specialty ? `Specialty / Department: ${specialty}` : "",
    version ? `Version: ${version}` : "",
    "",
    "Approved Consent Content:",
    "",
  ].filter(Boolean);

  const contentLines = uniqueLines.length > 0
    ? uniqueLines
    : [
        "The approved library item was found, but no structured consent text fields were available in the current library payload.",
        "Please enrich the approved template record with consentText/content/sections/risks/benefits/alternatives fields, or upload the official PDF file.",
      ];

  const footerLines = [
    "",
    "Physician Verification:",
    "This preview is generated from the approved consent library data currently available to the production system.",
    "For official hospital use, this record must be reviewed against the approved IMC consent wording and mapped to the signed patient workflow.",
    "",
    `Generated: ${new Date().toISOString()}`,
  ];

  const allWrapped = [...headerLines, ...contentLines, ...footerLines].flatMap((line) =>
    wrapLine(line, 92),
  );

  const pages: string[][] = [];
  let current: string[] = [];

  for (const line of allWrapped) {
    current.push(line);
    if (current.length >= 34) {
      pages.push(current);
      current = [];
    }
  }

  if (current.length) pages.push(current);

  const objects: string[] = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];

  let nextObject = 3;

  for (let i = 0; i < pages.length; i += 1) {
    pageObjectNumbers.push(nextObject++);
    contentObjectNumbers.push(nextObject++);
  }

  const fontObjectNumber = nextObject++;

  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>\nendobj\n`,
  );

  for (let i = 0; i < pages.length; i += 1) {
    const pageNo = i + 1;
    const pageObj = pageObjectNumbers[i];
    const contentObj = contentObjectNumbers[i];

    objects.push(
      `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj\n`,
    );

    const body = pages[i]
      .map((line, index) => {
        const fontSize = index === 0 && pageNo === 1 ? 13 : 9;
        const y = 790 - index * 21;
        return `BT /F1 ${fontSize} Tf 45 ${y} Td (${pdfEscape(line)}) Tj ET`;
      })
      .join("\n");

    const footer = `BT /F1 8 Tf 45 30 Td (Page ${pageNo} of ${pages.length}) Tj ET`;
    const stream = `${body}\n${footer}\n`;

    objects.push(
      `${contentObj} 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}endstream\nendobj\n`,
    );
  }

  objects.push(`${fontObjectNumber} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

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
    "";

  const title =
    searchParams.get("title") ||
    searchParams.get("titleEn") ||
    searchParams.get("titleAr") ||
    id;

  const expectedFileName = `${normalize(title || id)}.pdf`;
  const physicalPdf = findPhysicalPdf(id, title);

  if (physicalPdf?.publicPath) {
    const absoluteUrl = new URL(physicalPdf.publicPath, request.nextUrl.origin);
    return NextResponse.redirect(absoluteUrl, 302);
  }

  const libraryItem = await loadLibraryItem(request, id, title);

  if (!libraryItem) {
    return NextResponse.json(
      {
        success: false,
        error: "Approved consent template was not found",
        detail:
          "The selected item could not be found in the approved consent library and no official PDF file is mapped.",
        id,
        title,
        expectedFileName,
      },
      { status: 404 },
    );
  }

  const generated = buildApprovedConsentPdf({
    id,
    title,
    item: libraryItem,
  });

  return new NextResponse(generated, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${expectedFileName}"`,
      "Cache-Control": "no-store, max-age=0",
      "X-WathiqCare-PDF-Source": "approved-library-template-data",
      "X-WathiqCare-Expected-Physical-File": expectedFileName,
    },
  });
}
