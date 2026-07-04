import { type NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getSigningTokenContext } from "@/lib/server/public-signing-service";
import { renderFinalConsentPdfResponse } from "@/lib/server/informed-consents-final-pdf-payload";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDisposition(value: string | null): "inline" | "attachment" {
  return value === "inline" ? "inline" : "attachment";
}

function parseCopyType(value: string | null): "PATIENT_COPY" | "MEDICAL_RECORD_COPY" | "LEGAL_ARCHIVE_COPY" {
  if (value === "MEDICAL_RECORD_COPY") return "MEDICAL_RECORD_COPY";
  if (value === "LEGAL_ARCHIVE_COPY") return "LEGAL_ARCHIVE_COPY";
  return "PATIENT_COPY";
}

function parseLang(value: string | null): "ar" | "en" | "bilingual" {
  if (value === "ar") return "ar";
  if (value === "en") return "en";
  return "bilingual";
}

/**
 * Public final-PDF download for a patient-facing signing session.
 *
 * Validates the public signing token, then renders the finalized consent
 * PDF. This is the endpoint referenced by getPublicFinalPdfUrls() in
 * public-signing-service.ts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const context = await getSigningTokenContext(token);

    const searchParams = request.nextUrl.searchParams;
    const disposition = parseDisposition(searchParams.get("disposition"));
    const copyType = parseCopyType(searchParams.get("copy"));
    const lang = parseLang(searchParams.get("lang"));

    return await renderFinalConsentPdfResponse({
      request,
      documentId: context.documentId,
      tenantId: context.tenantId,
      lang,
      copyType,
      disposition,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return new Response(error.message, { status: error.status });
    }

    console.error("GET /api/public/informed-consents/signing/[token]/final-pdf", error);
    return new Response("Failed to generate final consent PDF", { status: 500 });
  }
}
