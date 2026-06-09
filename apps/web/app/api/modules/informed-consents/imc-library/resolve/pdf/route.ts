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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id") || searchParams.get("templateId") || searchParams.get("code");
  const title = searchParams.get("title") || searchParams.get("titleEn") || searchParams.get("titleAr");

  const pdf = findPdf(id, title);

  if (!pdf?.publicPath) {
    return NextResponse.json(
      {
        success: false,
        error: "Approved consent PDF file is not mapped",
        detail:
          "The library item was resolved, but no physical PDF file was found in public/approved-consents or the approved PDF manifest.",
        id,
        title,
        expectedFileName: `${normalize(title || id)}.pdf`,
      },
      { status: 404 },
    );
  }

  const absoluteUrl = new URL(pdf.publicPath, request.nextUrl.origin);
  return NextResponse.redirect(absoluteUrl, 302);
}
