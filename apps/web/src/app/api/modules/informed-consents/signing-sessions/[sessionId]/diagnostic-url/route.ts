import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import {
  generateSigningToken,
  buildSigningUrl,
} from "@/lib/server/signing-token-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Temporary Preview-only diagnostic helper for MR1135 UAT.
 * Returns the deterministic signing URL for a session so the patient signing
 * flow can be exercised without reading the override email inbox.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "Missing tenant context" },
      { status: 400 },
    );
  }

  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "Missing sessionId" },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const session = await prisma.signingSession.findFirst({
    where: { id: sessionId, tenantId },
    include: { tokens: true },
  });

  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Signing session not found" },
      { status: 404 },
    );
  }

  const patientToken = session.tokens.find((t) => t.signerRole === "patient");
  const signerRole = patientToken?.signerRole || "patient";
  const expiresAt = session.expiresAt;

  const token = generateSigningToken({
    tenantId,
    sessionId,
    signerRole,
    expiresAt,
  });

  const signingUrl = buildSigningUrl(token, request.nextUrl.origin);

  return NextResponse.json({
    ok: true,
    signingUrl,
    sessionId,
    signerRole,
    expiresAt: expiresAt.toISOString(),
  });
}
