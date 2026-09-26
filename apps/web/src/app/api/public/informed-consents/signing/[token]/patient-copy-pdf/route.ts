import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { getSigningTokenContext } from "@/lib/server/signing-token-context-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Public pre-signature patient-copy PDF endpoint for AcroForm-backed consents.
 *
 * Returns the exact governed PDF bytes that were generated and bound to the
 * signing session at dispatch. Fail-closed: any mismatch or missing binding
 * results in a 409/422 rather than falling back to the blank approved source.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const context = await getSigningTokenContext(token);

    const session = await getPrisma().signingSession.findFirst({
      where: {
        id: context.sessionId,
        tenantId: context.tenantId,
        documentId: context.documentId,
      },
      select: { metadata: true },
    });

    if (!session) {
      throw new ApiError(404, "Signing session not found");
    }

    const metadata = asRecord(session.metadata) ?? {};
    const governed = asRecord(metadata.governedPatientCopy);
    if (!governed) {
      throw new ApiError(422, "No governed patient copy is bound to this signing session.");
    }

    const pdfBytesBase64 = readString(governed.pdfBytesBase64);
    const boundPdfHash = readString(governed.pdfHash);
    if (!pdfBytesBase64 || !boundPdfHash) {
      throw new ApiError(422, "Governed patient copy binding is incomplete.");
    }

    let pdfBytes: Buffer;
    try {
      pdfBytes = Buffer.from(pdfBytesBase64, "base64");
    } catch {
      throw new ApiError(422, "Governed patient copy bytes are corrupted.");
    }

    const actualHash = crypto.createHash("sha256").update(pdfBytes).digest("hex");
    if (actualHash !== boundPdfHash) {
      throw new ApiError(409, "Governed patient copy hash mismatch.");
    }

    const searchParams = request.nextUrl.searchParams;
    const disposition = searchParams.get("disposition") === "attachment" ? "attachment" : "inline";

    return new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="CONSENT-${context.documentId}-PATIENT_COPY-bilingual.pdf"`,
        "Cache-Control": "no-store",
        "X-Wathiq-Pdf-Engine": "acroform-field-addressed",
        "X-Wathiq-Pdf-Copy-Type": "PATIENT_COPY",
        "X-Wathiq-Audit-Checksum": boundPdfHash,
        "X-Wathiq-Pdf-Checksum": boundPdfHash,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return new Response(error.message, { status: error.status });
    }
    console.error("GET /api/public/informed-consents/signing/[token]/patient-copy-pdf", error);
    return new Response("Failed to serve patient copy PDF", { status: 500 });
  }
}
