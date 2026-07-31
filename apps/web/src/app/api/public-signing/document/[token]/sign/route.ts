import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  submitPublicSigningSignature,
} from "@/lib/server/public-signing-signature-service";

import {
  mapPublicSignRequestBody,
} from "@/lib/server/public-signing-sign-body";

import {
  ApiError,
} from "@/lib/server/http";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

async function readJsonBody(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  try {
    const body =
      await request.json();

    if (
      !body
      || typeof body !== "object"
      || Array.isArray(body)
    ) {
      throw new ApiError(
        400,
        "Request body must be a JSON object.",
      );
    }

    return body as Record<
      string,
      unknown
    >;
  }
  catch (error) {
    if (
      error instanceof ApiError
    ) {
      throw error;
    }

    throw new ApiError(
      400,
      "Invalid JSON request body.",
    );
  }
}

function readRequiredSignatureDataUrl(
  body: Record<string, unknown>,
): string {
  const value =
    body.signatureDataUrl;

  if (
    typeof value !== "string"
    || value.trim().length === 0
  ) {
    throw new ApiError(
      400,
      "signatureDataUrl is required.",
    );
  }

  const signatureDataUrl =
    value.trim();

  if (
    !signatureDataUrl.startsWith(
      "data:image/",
    )
  ) {
    throw new ApiError(
      400,
      "signatureDataUrl must be an image data URL.",
    );
  }

  return signatureDataUrl;
}

export async function POST(
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

    const body =
      await readJsonBody(
        request,
      );

    const signatureDataUrl =
      readRequiredSignatureDataUrl(
        body,
      );

    const result =
      await submitPublicSigningSignature({
        ...mapPublicSignRequestBody(
          {
            ...body,
            signatureDataUrl,
          },
          token,
        ),

        request,
      });

    return NextResponse.json(
      result,
    );
  }
  catch (error) {
    if (
      error instanceof ApiError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,

          code:
            error.code,
        },
        {
          status:
            error.status,
        },
      );
    }

    console.error(
      "POST /api/public-signing/document/[token]/sign",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to submit signature",
      },
      {
        status:
          500,
      },
    );
  }
}
