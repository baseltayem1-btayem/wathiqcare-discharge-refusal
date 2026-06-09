import { NextRequest, NextResponse } from "next/server";

function slugify(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function pickIdentifier(payload: any) {
  return (
    payload?.documentId ||
    payload?.id ||
    payload?.templateId ||
    payload?.templateVersionId ||
    payload?.code ||
    payload?.consentCode ||
    slugify(payload?.titleEn || payload?.title || payload?.titleAr)
  );
}

function resolvePayload(payload: any) {
  const identifier = pickIdentifier(payload);

  return {
    ok: true,
    action: payload?.action || "preview-pdf",
    id: identifier,
    documentId: identifier,
    templateId: payload?.templateId || payload?.id || identifier,
    templateVersionId: payload?.templateVersionId || null,
    code: payload?.code || payload?.consentCode || identifier,
    title: payload?.title || payload?.titleEn || payload?.titleAr || identifier,
    pdfUrl: `/api/modules/informed-consents/imc-library/resolve/pdf?id=${encodeURIComponent(identifier)}&title=${encodeURIComponent(payload?.title || payload?.titleEn || payload?.titleAr || identifier)}`,
    previewUrl: `/api/modules/informed-consents/imc-library/resolve/pdf?id=${encodeURIComponent(identifier)}&title=${encodeURIComponent(payload?.title || payload?.titleEn || payload?.titleAr || identifier)}`,
    source: "production-imc-library-resolve",
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  return NextResponse.json(
    resolvePayload({
      action: searchParams.get("action") || "preview-pdf",
      documentId: searchParams.get("documentId"),
      id: searchParams.get("id"),
      templateId: searchParams.get("templateId"),
      templateVersionId: searchParams.get("templateVersionId"),
      code: searchParams.get("code"),
      consentCode: searchParams.get("consentCode"),
      title: searchParams.get("title"),
      titleEn: searchParams.get("titleEn"),
      titleAr: searchParams.get("titleAr"),
    }),
  );
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  return NextResponse.json(resolvePayload(payload));
}
