


import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { getSigningTokenContext } from "@/lib/server/signing-token-context-service";
import { IMC_APPROVED_CONSENT_FORMS_MANIFEST } from "@/lib/server/imc-approved-consent-forms.manifest";
import { ApiError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDisposition(value: string | null): "inline" | "attachment" {
  return value === "inline" ? "inline" : "attachment";
}

function parseCopyType(
  value: string | null,
): "PATIENT_COPY" | "MEDICAL_RECORD_COPY" | "LEGAL_ARCHIVE_COPY" {
  if (value === "MEDICAL_RECORD_COPY") {
    return "MEDICAL_RECORD_COPY";
  }

  if (value === "LEGAL_ARCHIVE_COPY") {
    return "LEGAL_ARCHIVE_COPY";
  }

  return "PATIENT_COPY";
}

function parseLang(value: string | null): "ar" | "en" | "bilingual" {
  if (value === "ar") {
    return "ar";
  }

  if (value === "en") {
    return "en";
  }

  return "bilingual";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function resolveApprovedConsentFormId(metadata: unknown): string {
  const root = asRecord(metadata);
  const template = asRecord(root.imcApprovedTemplate);

  if (typeof root.approvedConsentFormId === "string") {
    return root.approvedConsentFormId.trim();
  }

  if (typeof template.id === "string") {
    return template.id.trim();
  }

  return "";
}

function isImcApprovedForm(formId: string): boolean {
  if (formId.startsWith("imc-approved-")) {
    return true;
  }

  return IMC_APPROVED_CONSENT_FORMS_MANIFEST.some(
    (item) => item.id === formId || item.slug === formId,
  );
}

function getFilledPreviewMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const filledPreview = asRecord(metadata.filledPreviewSnapshot);
  return {
    filledPreviewGeneratedAt: filledPreview.filledPreviewGeneratedAt || null,
    filledPreviewFormId: filledPreview.filledPreviewFormId || null,
    hasDoctorCompletionValues: Object.keys(asRecord(filledPreview.doctorCompletionValues)).length > 0,
  };
}

/**
 * Public final-PDF download for a patient-facing signing session.
 *
 * For IMC approved consent forms the final PDF is rendered directly from the
 * approved source PDF using the production field mapping registry. The patient
 * copy omits internal IDs, tokens and provider debug overlays. Other copies
 * include the legal evidence appendix.
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      token: string;
    }>;
  },
) {
  try {
    const { token } = await params;
    const context = await getSigningTokenContext(token);

    const searchParams = request.nextUrl.searchParams;
    const disposition = parseDisposition(searchParams.get("disposition"));
    const copyType = parseCopyType(searchParams.get("copy"));
    const lang = parseLang(searchParams.get("lang"));

    const consentDocument = await getPrisma().consentDocument.findFirst({
      where: {
        id: context.documentId,
        tenantId: context.tenantId,
      },
      select: {
        metadata: true,
      },
    });

    const approvedConsentFormId = resolveApprovedConsentFormId(consentDocument?.metadata);
    const usesApprovedImcOverlay = isImcApprovedForm(approvedConsentFormId);

    if (usesApprovedImcOverlay) {
      const { renderImcApprovedConsentPdf } = await import(
        "@/lib/server/imc-approved-pdf-template-engine"
      );

      const rendered = await renderImcApprovedConsentPdf({
        documentId: context.documentId,
        tenantId: context.tenantId,
        origin: request.nextUrl.origin,
        copyType,
      });

      const checksum = rendered.checksum;

      const existingMetadata = asRecord(consentDocument?.metadata);
      const filledPreviewMetadata = getFilledPreviewMetadata(existingMetadata);

      await getPrisma().consentDocument.update({
        where: { id: context.documentId },
        data: {
          immutablePdfHash: checksum,
          metadata: {
            ...existingMetadata,
            finalPdf: {
              hash: checksum,
              generatedAt: new Date().toISOString(),
              copyType,
              signingSessionToken: token,
              encounterId: (context as { encounterId?: string }).encounterId || null,
            },
          },
        },
      });

      return new Response(rendered.bytes as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${disposition}; filename="CONSENT-${context.documentId}-${copyType}-${lang}.pdf"`,
          "Cache-Control": "no-store",
          "X-Wathiq-Pdf-Engine": "approved-imc-overlay",
          "X-Wathiq-Pdf-Copy-Type": copyType,
          "X-Wathiq-Audit-Checksum": checksum,
          "X-Wathiq-Pdf-Checksum": checksum,
          "X-Wathiq-Filled-Preview-Generated-At":
            String(filledPreviewMetadata.filledPreviewGeneratedAt || ""),
          "X-Wathiq-Filled-Preview-Form-Id":
            String(filledPreviewMetadata.filledPreviewFormId || ""),
        },
      });
    }

    const { renderFinalConsentPdfResponse } = await import(
      "@/lib/server/informed-consents-final-pdf-payload"
    );

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
      return new Response(error.message, {
        status: error.status,
      });
    }

    console.error("GET /api/public/informed-consents/signing/[token]/final-pdf", error);

    return new Response("Failed to generate final consent PDF", {
      status: 500,
    });
  }
}
