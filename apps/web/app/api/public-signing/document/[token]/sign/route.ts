import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/server/http";
import { submitPublicSigningSignature } from "@/lib/server/public-signing-service";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      signerName?: string;
      signatureDataUrl?: string;
    } | null;

    const payload = await submitPublicSigningSignature({
      token,
      signerName: body?.signerName ?? "",
      signatureDataUrl: body?.signatureDataUrl,
      request,
    });

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error);
  }
}