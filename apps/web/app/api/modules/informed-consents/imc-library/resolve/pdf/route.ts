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
  lengthBytes?: number;
};

type LibraryItem = Record<string, any>;

function slugify(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(value: string | null | undefined) {
  return slugify(value);
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

function identityValues(value: any) {
  return [
    value?.id,
    value?.code,
    value?.templateId,
    value?.templateVersionId,
    value?.slug,
    value?.title,
    value?.titleEn,
    value?.titleAr,
    value?.fileName,
    String(value?.fileName || "").replace(/\.pdf$/i, ""),
    String(value?.publicPath || "").split("/").pop()?.replace(/\.pdf$/i, ""),
  ]
    .filter(Boolean)
    .map((entry) => normalize(String(entry)));
}

function findByIdentity(items: any[], identifier: string, title: string) {
  const candidates = new Set(
    [identifier, title, decodeURIComponent(identifier || ""), decodeURIComponent(title || "")]
      .filter(Boolean)
      .map((value) => normalize(String(value))),
  );

  return items.find((item) => identityValues(item).some((value) => candidates.has(value))) || null;
}

async function loadLibraryItem(request: NextRequest, identifier: string, title: string) {
  const url = new URL("/api/modules/informed-consents/imc-library", request.nextUrl.origin);
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const items = unwrapLibraryPayload(payload);
  return findByIdentity(items, identifier, title);
}

function encodedPublicPath(pathOrFileName: string) {
  const clean = String(pathOrFileName || "")
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^public\//, "")
    .replace(/^\/+/, "");

  return "/" + clean.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

function isUnsafeOrSelfApiPath(request: NextRequest, raw: string) {
  const value = String(raw || "").trim();
  if (!value) return true;

  const absolute = value.startsWith("http")
    ? value
    : new URL(value.startsWith("/") ? value : `/${value}`, request.nextUrl.origin).toString();

  const current = request.nextUrl.toString();

  if (absolute === current) return true;
  if (absolute.includes("/api/modules/informed-consents/imc-library/resolve/pdf")) return true;
  if (absolute.includes("/api/")) return true;

  return false;
}

function candidatePathsFromLibraryItem(request: NextRequest, item: LibraryItem | null) {
  if (!item) return [];

  const candidates = [
    item.publicPath,
    item.pdfPath,
    item.staticPdfPath,
    item.approvedPdfPath,
    item.officialPdfPath,
    item.fileUrl,
    item.previewUrl,
    item.downloadUrl,
    item.fileName ? `/approved-consents/${item.fileName}` : "",
    item.fileName ? `/imc-approved-consents/${item.fileName}` : "",
    item.fileName ? `/consents/${item.fileName}` : "",
    item.fileName ? `/pdf/${item.fileName}` : "",
    item.fileName ? `/pdfs/${item.fileName}` : "",
  ].filter(Boolean);

  return Array.from(
    new Set(
      candidates
        .map((value) => String(value))
        .filter((value) => !isUnsafeOrSelfApiPath(request, value))
        .map((value) => encodedPublicPath(value)),
    ),
  );
}

async function isPdfAvailable(request: NextRequest, publicPath: string) {
  if (isUnsafeOrSelfApiPath(request, publicPath)) return false;

  const absolute = new URL(publicPath, request.nextUrl.origin);

  try {
    const response = await fetch(absolute, {
      method: "GET",
      cache: "no-store",
      headers: { range: "bytes=0-40" },
    });

    const contentType = response.headers.get("content-type") || "";

    return (
      response.ok &&
      (contentType.includes("application/pdf") || publicPath.toLowerCase().endsWith(".pdf"))
    );
  } catch {
    return false;
  }
}

function readBase64Pdf(item: LibraryItem | null) {
  if (!item) return null;

  const candidates = [
    item.pdfBase64,
    item.fileBase64,
    item.contentBase64,
    item.base64,
    item.pdfData,
    item.fileData,
    item.data,
    item.content,
    item.binary,
    item.rawPdf,
    item.approvedPdfBase64,
    item.officialPdfBase64,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;

    let value = candidate.trim();

    if (value.startsWith("data:application/pdf;base64,")) {
      value = value.replace(/^data:application\/pdf;base64,/i, "");
    }

    if (value.length < 1000) continue;

    try {
      const buffer = Buffer.from(value, "base64");
      if (buffer.length > 500 && buffer.slice(0, 4).toString("utf8") === "%PDF") {
        return buffer;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function buildMissingMappingJson(args: {
  id: string;
  title: string;
  expectedFileName: string;
  libraryItem: LibraryItem | null;
  checkedPaths: string[];
}) {
  return {
    success: false,
    error: "Official approved consent PDF is not linked",
    detail:
      "The system found the approved consent library record, but it did not find a reachable official PDF file or embedded PDF binary. The preview will not generate a substitute consent. Link the actual approved PDF file to this template.",
    id: args.id,
    title: args.title,
    expectedFileName: args.expectedFileName,
    libraryFileName: args.libraryItem?.fileName || null,
    librarySource: args.libraryItem?.source || null,
    libraryLengthBytes: args.libraryItem?.lengthBytes || null,
    checkedPaths: args.checkedPaths,
    requiredRecommendedPath: `/approved-consents/${args.expectedFileName}`,
  };
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

  const physicalPdf = findByIdentity(manifest as PdfManifestItem[], id, title) as PdfManifestItem | null;
  const checkedPaths: string[] = [];

  if (physicalPdf?.publicPath && !isUnsafeOrSelfApiPath(request, physicalPdf.publicPath)) {
    const path = encodedPublicPath(physicalPdf.publicPath);
    checkedPaths.push(path);

    if (await isPdfAvailable(request, path)) {
      return NextResponse.redirect(new URL(path, request.nextUrl.origin), 302);
    }
  }

  const libraryItem = await loadLibraryItem(request, id, title);

  const embeddedPdf = readBase64Pdf(libraryItem);
  if (embeddedPdf) {
    return new NextResponse(embeddedPdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${expectedFileName}"`,
        "Cache-Control": "no-store, max-age=0",
        "X-WathiqCare-PDF-Source": "approved-library-embedded-official-pdf",
      },
    });
  }

  const candidatePaths = candidatePathsFromLibraryItem(request, libraryItem);
  checkedPaths.push(...candidatePaths);

  for (const path of candidatePaths) {
    if (await isPdfAvailable(request, path)) {
      return NextResponse.redirect(new URL(path, request.nextUrl.origin), 302);
    }
  }

  return NextResponse.json(
    buildMissingMappingJson({
      id,
      title,
      expectedFileName,
      libraryItem,
      checkedPaths: Array.from(new Set(checkedPaths)),
    }),
    { status: 404 },
  );
}
