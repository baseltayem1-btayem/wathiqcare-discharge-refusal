import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireModuleOperationalAccess,
} from "@/lib/server/auth";

import {
  addConsentSignature,
} from "@/lib/server/consent-library-service";

import {
  ApiError,
} from "@/lib/server/http";

import {
  getPrisma,
} from "@/lib/server/prisma";

import {
  buildConsentSignaturePersistencePayload,
  buildTabletSignatureEvidence,
} from "@/lib/signature/signature-evidence";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export const runtime =
  "nodejs";

const MAX_SIGNATURE_DATA_URL_LENGTH =
  2_000_000;

const MAX_SIGNATURE_IMAGE_BYTES =
  1_500_000;

function asMetadataRecord(
  value: unknown,
): Record<string, unknown> | null {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
}

function readMetadataString(
  metadata: unknown,
  keys: string[],
): string {
  const record =
    asMetadataRecord(
      metadata,
    );

  if (!record) {
    return "";
  }

  for (const key of keys) {
    const value =
      record[key];

    if (
      typeof value === "string"
      && value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function readSignatureImageDataUrl(
  metadata: unknown,
): string {
  const record =
    asMetadataRecord(
      metadata,
    );

  if (!record) {
    return "";
  }

  const direct =
    readMetadataString(
      record,
      [
        "signatureImageDataUrl",
        "signatureDataUrl",
      ],
    );

  if (direct) {
    return direct;
  }

  return readMetadataString(
    record.signatureCapture,
    [
      "signatureImageDataUrl",
      "signatureDataUrl",
    ],
  );
}

function decodeSupportedSignatureDataUrl(
  value: string,
): Buffer | null {
  if (
    !value
    || value.length >
      MAX_SIGNATURE_DATA_URL_LENGTH
  ) {
    return null;
  }

  const match =
    value.match(
      /^data:image\/(png|jpeg);base64,([a-z0-9+/=\s]+)$/i,
    );

  if (!match) {
    return null;
  }

  const declaredType =
    match[1].toLowerCase();

  const encoded =
    match[2].replace(
      /\s+/g,
      "",
    );

  let bytes: Buffer;

  try {
    bytes =
      Buffer.from(
        encoded,
        "base64",
      );
  }
  catch {
    return null;
  }

  if (
    bytes.length < 16
    || bytes.length >
      MAX_SIGNATURE_IMAGE_BYTES
  ) {
    return null;
  }

  const isPng =
    bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;

  const isJpeg =
    bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff;

  if (
    declaredType === "png"
    && !isPng
  ) {
    return null;
  }

  if (
    declaredType === "jpeg"
    && !isJpeg
  ) {
    return null;
  }

  return bytes;
}

function isSupportedSignatureDataUrl(
  value: string,
): boolean {
  return Boolean(
    decodeSupportedSignatureDataUrl(
      value,
    ),
  );
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const auth =
      await requireModuleOperationalAccess(
        request,
        "informed-consents",
      );

    const tenantId =
      auth.tenant_id || "";

    if (!tenantId) {
      throw new ApiError(
        400,
        "Missing tenant context",
      );
    }

    const actorUserId =
      auth.sub?.trim()
      || "";

    const authenticatedSignerName =
      auth.email?.trim()
      || actorUserId;

    if (
      !actorUserId
      || !authenticatedSignerName
    ) {
      throw new ApiError(
        401,
        "Authenticated physician identity is unavailable.",
      );
    }

    const {
      id: documentId,
    } = await params;

    const body =
      (
        await request
          .json()
          .catch(() => ({}))
      ) as Record<string, unknown>;

    const signatureDataUrl =
      typeof body.signatureDataUrl === "string"
        ? body.signatureDataUrl.trim()
        : "";

    if (!signatureDataUrl) {
      throw new ApiError(
        400,
        "Treating physician signature image is required.",
      );
    }

    if (
      !isSupportedSignatureDataUrl(
        signatureDataUrl,
      )
    ) {
      throw new ApiError(
        400,
        "Treating physician signature must be a valid PNG or JPEG image.",
      );
    }

    const prisma =
      getPrisma();

    const consentDocument =
      await prisma
        .consentDocument
        .findFirst({
          where: {
            id:
              documentId,

            tenantId,
          },

          select: {
            id: true,
            status: true,
            physicianName: true,
            physicianLicense: true,
          },
        });

    if (!consentDocument) {
      throw new ApiError(
        404,
        "Consent document not found",
      );
    }

    const displayPhysicianName =
      consentDocument
        .physicianName
        ?.trim()
      || authenticatedSignerName;

    const contextualPhysicianLicense =
      consentDocument
        .physicianLicense
        ?.trim()
      || "";

    const physicianSignatures =
      await prisma
        .consentDocumentSignature
        .findMany({
          where: {
            tenantId,

            consentDocumentId:
              documentId,

            role:
              "PHYSICIAN",
          },

          orderBy: {
            signedAt:
              "desc",
          },

          select: {
            id: true,
            signedAt: true,
            metadata: true,
          },
        });

    const validExistingSignatures =
      physicianSignatures.filter(
        (signature) =>
          isSupportedSignatureDataUrl(
            readSignatureImageDataUrl(
              signature.metadata,
            ),
          ),
      );

    const existingSignatureForActor =
      validExistingSignatures.find(
        (signature) =>
          readMetadataString(
            signature.metadata,
            [
              "authenticatedUserId",
              "capturedBy",
              "physicianUserId",
            ],
          ) === actorUserId,
      );

    if (existingSignatureForActor) {
      return NextResponse.json({
        ok: true,
        alreadyCaptured: true,

        signatureId:
          existingSignatureForActor.id,

        signedAt:
          existingSignatureForActor
            .signedAt
            .toISOString(),

        status:
          consentDocument.status,
      });
    }

    if (
      validExistingSignatures.length > 0
    ) {
      throw new ApiError(
        409,
        "A treating physician signature has already been captured for this consent by another authenticated actor.",
      );
    }

    const evidence =
      buildTabletSignatureEvidence({
        signerRole:
          "PHYSICIAN",

        signerName:
          authenticatedSignerName,

        signatureDataUrl,

        acknowledgmentAccepted:
          true,

        otpVerified:
          false,

        deviceLabel:
          "production-physician-workspace",
      });

    const persistence =
      buildConsentSignaturePersistencePayload(
        evidence,
      );

    const updatedDocument =
      await addConsentSignature(
        auth,
        documentId,
        {
          role:
            "PHYSICIAN",

          signerName:
            authenticatedSignerName,

          signatureMethod:
            persistence.signatureMethod,

          metadata: {
            ...persistence.metadata,

            captureSource:
              "production-physician-workspace",

            identitySource:
              "authenticated-session",

            authenticatedUserId:
              actorUserId,

            authenticatedEmail:
              auth.email
              || null,

            displayPhysicianName,

            documentPhysicianLicense:
              contextualPhysicianLicense
              || null,

            documentPhysicianLicenseTrust:
              contextualPhysicianLicense
                ? "document-context-only"
                : "unavailable",
          },
        },
        request,
      );

    const persistedSignature =
      updatedDocument
        .signatures
        ?.filter(
          (signature) =>
            signature.role ===
            "PHYSICIAN",
        )
        .at(-1);

    return NextResponse.json({
      ok: true,
      alreadyCaptured: false,

      signatureId:
        persistedSignature?.id
        || "",

      signedAt:
        persistedSignature?.signedAt
        || new Date()
          .toISOString(),

      status:
        updatedDocument.status,
    });
  }
  catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : null;

    if (!apiError) {
      console.error(
        "PHYSICIAN_SIGNATURE_CAPTURE_FAILED",
        error,
      );
    }

    return NextResponse.json(
      {
        ok: false,

        error:
          apiError?.message
          || "Failed to capture the treating physician signature.",

        code:
          apiError?.code,

        fields:
          apiError?.fields,
      },
      {
        status:
          apiError?.status
          || 500,
      },
    );
  }
}
