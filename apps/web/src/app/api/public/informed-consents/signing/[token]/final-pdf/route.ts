import crypto from "node:crypto";

import {
  type NextRequest,
} from "next/server";

import {
  ApiError,
} from "@/lib/server/http";

import {
  getPrisma,
} from "@/lib/server/prisma";

import {
  getSigningTokenContext,
} from "@/lib/server/signing-token-context-service";

import {
  generateGovernedPatientCopy,
  isAcroFormBackedPatientCopy,
  type ConsentDocumentForPatientCopy,
} from "@/lib/server/acroform/patient-copy-dispatch-service";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function parseDisposition(
  value: string | null,
): "inline" | "attachment" {
  return value === "inline"
    ? "inline"
    : "attachment";
}

function parseCopyType(
  value: string | null,
):
  | "PATIENT_COPY"
  | "MEDICAL_RECORD_COPY"
  | "LEGAL_ARCHIVE_COPY" {
  if (
    value === "MEDICAL_RECORD_COPY"
  ) {
    return "MEDICAL_RECORD_COPY";
  }

  if (
    value === "LEGAL_ARCHIVE_COPY"
  ) {
    return "LEGAL_ARCHIVE_COPY";
  }

  return "PATIENT_COPY";
}

function parseLang(
  value: string | null,
): "ar" | "en" | "bilingual" {
  if (value === "ar") {
    return "ar";
  }

  if (value === "en") {
    return "en";
  }

  return "bilingual";
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    !value
    || typeof value !== "object"
    || Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<
    string,
    unknown
  >;
}

function readString(
  value: unknown,
): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readSignatureDataUrlFromMetadata(
  metadata: unknown,
): string | undefined {
  const root =
    asRecord(
      metadata,
    );

  const signatureCapture =
    asRecord(
      root.signatureCapture,
    );

  const patientSignature =
    asRecord(
      root.patientSignature,
    );

  const signature =
    asRecord(
      root.signature,
    );

  const capture =
    asRecord(
      root.capture,
    );

  const candidates: unknown[] = [
    signatureCapture.signatureImageDataUrl,
    signatureCapture.signatureDataUrl,
    signatureCapture.imageDataUrl,

    patientSignature.signatureImageDataUrl,
    patientSignature.signatureDataUrl,
    patientSignature.imageDataUrl,

    signature.signatureImageDataUrl,
    signature.signatureDataUrl,
    signature.imageDataUrl,

    capture.signatureImageDataUrl,
    capture.signatureDataUrl,
    capture.imageDataUrl,

    root.signatureImageDataUrl,
    root.signatureDataUrl,
    root.imageDataUrl,
  ];

  for (
    const candidate of candidates
  ) {
    const dataUrl =
      readString(
        candidate,
      );

    if (
      dataUrl?.startsWith(
        "data:image/",
      )
    ) {
      return dataUrl;
    }
  }

  return undefined;
}

function hasObjectValue(
  value: unknown,
): boolean {
  return Boolean(
    value
      && typeof value === "object"
      && !Array.isArray(value),
  );
}

async function resolvePatientSignatureForAcroForm(args: {
  documentId: string;
  tenantId: string;
}): Promise<
  | {
      dataUrl: string;
      signerName: string;
      signedAt: Date;
    }
  | undefined
> {
  const signatures =
    await getPrisma()
      .consentDocumentSignature
      .findMany({
        where: {
          consentDocumentId:
            args.documentId,

          tenantId:
            args.tenantId,

          role: {
            in: [
              "PATIENT",
              "GUARDIAN",
            ],
          },
        },

        select: {
          signedAt:
            true,

          signerName:
            true,

          metadata:
            true,
        },

        orderBy: {
          signedAt:
            "desc",
        },
      });

  for (
    const signature of signatures
  ) {
    if (
      !signature.signedAt
    ) {
      continue;
    }

    const dataUrl =
      readSignatureDataUrlFromMetadata(
        signature.metadata,
      );

    if (
      dataUrl
    ) {
      return {
        dataUrl,

        signerName:
          typeof signature.signerName === "string"
            && signature.signerName.trim().length > 0
            ? signature.signerName.trim()
            : "Patient",

        signedAt:
          signature.signedAt,
      };
    }
  }

  return undefined;
}

function resolveApprovedConsentFormId(
  metadata: unknown,
): string {
  const root =
    asRecord(
      metadata,
    );

  const template =
    asRecord(
      root.imcApprovedTemplate,
    );

  if (
    typeof root.approvedConsentFormId
      === "string"
  ) {
    return root
      .approvedConsentFormId
      .trim();
  }

  if (
    typeof template.id
      === "string"
  ) {
    return template.id.trim();
  }

  return "";
}

/**
 * Public final-PDF download for a patient-facing signing session.
 *
 * AcroForm-backed governed patient copies must fail closed if:
 * - the governed patient copy is not bound to the signing session; or
 * - the patient / guardian signature image cannot be resolved.
 *
 * Legacy approved-overlay and non-AcroForm flows remain delegated to their
 * existing renderers.
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
    const {
      token,
    } = await params;

    const context =
      await getSigningTokenContext(
        token,
      );

    const searchParams =
      request.nextUrl.searchParams;

    const disposition =
      parseDisposition(
        searchParams.get(
          "disposition",
        ),
      );

    const copyType =
      parseCopyType(
        searchParams.get(
          "copy",
        ),
      );

    const lang =
      parseLang(
        searchParams.get(
          "lang",
        ),
      );

    const consentDocument =
      await getPrisma()
        .consentDocument
        .findFirst({
          where: {
            id:
              context.documentId,

            tenantId:
              context.tenantId,
          },

          select: {
            metadata:
              true,
          },
        });

    const session =
      await getPrisma()
        .signingSession
        .findFirst({
          where: {
            id:
              context.sessionId,

            tenantId:
              context.tenantId,

            documentId:
              context.documentId,
          },

          select: {
            metadata:
              true,
          },
        });

    const sessionMetadata =
      asRecord(
        session?.metadata,
      );

    const governedPatientCopyRaw =
      sessionMetadata
        .governedPatientCopy;

    const hasGovernedPatientCopy =
      hasObjectValue(
        governedPatientCopyRaw,
      );

    const approvedConsentFormId =
      resolveApprovedConsentFormId(
        consentDocument
          ?.metadata,
      );

    const acroFormDocument:
      | ConsentDocumentForPatientCopy
      | null =
      consentDocument
        ? {
            id:
              context.documentId,

            patientName:
              "",

            metadata:
              consentDocument.metadata,
          }
        : null;

    const isAcroFormBacked =
      Boolean(
        acroFormDocument
          && isAcroFormBackedPatientCopy(
            acroFormDocument,
          ),
      );

    if (
      isAcroFormBacked
      && !hasGovernedPatientCopy
    ) {
      throw new ApiError(
        422,
        "Governed patient copy is not bound to this signing session.",
      );
    }

    if (
      isAcroFormBacked
      && acroFormDocument
    ) {
      const patientSignature =
        await resolvePatientSignatureForAcroForm({
          documentId:
            context.documentId,

          tenantId:
            context.tenantId,
        });

      if (
        !patientSignature
      ) {
        throw new ApiError(
          409,
          "Patient signature has not been captured for this AcroForm-backed final PDF.",
        );
      }

      const rendered =
        await generateGovernedPatientCopy({
          document:
            acroFormDocument,

          patientSignature,
        });

      return new Response(
        rendered.bytes as unknown as BodyInit,
        {
          status:
            200,

          headers: {
            "Content-Type":
              "application/pdf",

            "Content-Disposition":
              `${disposition}; filename="CONSENT-${context.documentId}-${copyType}-${lang}.pdf"`,

            "Cache-Control":
              "no-store",

            "X-Wathiq-Pdf-Engine":
              "acroform-field-addressed",

            "X-Wathiq-Pdf-Copy-Type":
              copyType,

            "X-Wathiq-Audit-Checksum":
              rendered.pdfHash,

            "X-Wathiq-Pdf-Checksum":
              rendered.pdfHash,

            "X-Wathiq-Draft-Fingerprint":
              rendered.fingerprint,
          },
        },
      );
    }

    const usesApprovedImcOverlay =
      approvedConsentFormId ===
      "imc-approved-adenotonsillectomy";

    if (
      usesApprovedImcOverlay
    ) {
      const {
        renderImcApprovedConsentPdf,
      } = await import(
        "@/lib/server/imc-approved-pdf-template-engine"
      );

      const rendered =
        await renderImcApprovedConsentPdf({
          documentId:
            context.documentId,

          tenantId:
            context.tenantId,

          origin:
            request.nextUrl.origin,
        });

      const checksum =
        crypto
          .createHash(
            "sha256",
          )
          .update(
            rendered.bytes,
          )
          .digest(
            "hex",
          );

      return new Response(
        rendered.bytes as unknown as BodyInit,
        {
          status:
            200,

          headers: {
            "Content-Type":
              "application/pdf",

            "Content-Disposition":
              `${disposition}; filename="CONSENT-${context.documentId}-${copyType}-${lang}.pdf"`,

            "Cache-Control":
              "no-store",

            "X-Wathiq-Pdf-Engine":
              "approved-imc-overlay",

            "X-Wathiq-Pdf-Copy-Type":
              copyType,

            "X-Wathiq-Audit-Checksum":
              checksum,

            "X-Wathiq-Pdf-Checksum":
              checksum,
          },
        },
      );
    }

    const {
      renderFinalConsentPdfResponse,
    } = await import(
      "@/lib/server/informed-consents-final-pdf-payload"
    );

    return await renderFinalConsentPdfResponse({
      request,

      documentId:
        context.documentId,

      tenantId:
        context.tenantId,

      lang,
      copyType,
      disposition,
    });
  }
  catch (error) {
    if (
      error instanceof ApiError
    ) {
      return new Response(
        error.message,
        {
          status:
            error.status,
        },
      );
    }

    console.error(
      "GET /api/public/informed-consents/signing/[token]/final-pdf",
      error,
    );

    return new Response(
      "Failed to generate final consent PDF",
      {
        status:
          500,
      },
    );
  }
}