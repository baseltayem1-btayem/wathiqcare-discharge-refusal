import { NextRequest, NextResponse } from "next/server";

function buildPdfUrl(identifier: string | null) {
  if (!identifier) return null;
  return `/api/modules/informed-consents/documents/${encodeURIComponent(identifier)}/pdf`;
}

function resolvePayload(payload: any) {
  const identifier =
    payload?.documentId ||
    payload?.id ||
    payload?.templateId ||
    payload?.templateVersionId ||
    payload?.code ||
    payload?.consentCode ||
    null;

  return {
    ok: true,
    action: payload?.action || "preview-pdf",
    id: identifier,
    documentId: identifier,
    templateId: payload?.templateId || payload?.id || null,
    templateVersionId: payload?.templateVersionId || null,
    code: payload?.code || payload?.consentCode || null,
    pdfUrl: buildPdfUrl(identifier),
    previewUrl: buildPdfUrl(identifier),
    source: "production-imc-library-resolve",
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const payload = {
    action: searchParams.get("action") || "preview-pdf",
    documentId: searchParams.get("documentId"),
    id: searchParams.get("id"),
    templateId: searchParams.get("templateId"),
    templateVersionId: searchParams.get("templateVersionId"),
    code: searchParams.get("code"),
    consentCode: searchParams.get("consentCode"),
  };

  return NextResponse.json(resolvePayload(payload));
}

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  return NextResponse.json(resolvePayload(payload));
}
