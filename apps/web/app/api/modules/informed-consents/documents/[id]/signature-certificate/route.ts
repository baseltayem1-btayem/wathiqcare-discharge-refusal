import { type NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError, handleApiError } from "@/lib/server/http";
import { hasInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeRole(role: string | null | undefined): string {
  return (role || "").trim().toLowerCase();
}

function isPhysicianRole(auth: { role?: string | null; user_type?: string | null; platform_role?: string | null }): boolean {
  const candidates = [normalizeRole(auth.role), normalizeRole(auth.user_type), normalizeRole(auth.platform_role)];
  return candidates.includes("doctor") || candidates.includes("nurse") || candidates.includes("nursing");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    const hasEvidencePermission = hasInformedConsentPermission(auth, "consent:view_evidence");
    const { id } = await params;
    const prisma = getPrisma();

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId: auth.tenant_id },
      select: {
        id: true,
        consentReference: true,
        status: true,
        finalizedAt: true,
        metadata: true,
        case: {
          select: {
            assignedToUserId: true,
            createdByUserId: true,
          },
        },
        signatures: {
          orderBy: { signedAt: "asc" },
          select: {
            role: true,
            signerName: true,
            signedAt: true,
            signatureMethod: true,
            signatureHash: true,
            certificateId: true,
            evidenceId: true,
          },
        },
      },
    });

    if (!doc) {
      throw new ApiError(404, "Consent document not found");
    }

    if (!hasEvidencePermission) {
      if (!isPhysicianRole(auth)) {
        throw new ApiError(403, "Missing permission: consent:view_evidence");
      }

      const scopedAccessAllowed =
        doc.status === "FINALIZED"
        && Boolean(auth.sub)
        && (doc.case?.assignedToUserId === auth.sub || doc.case?.createdByUserId === auth.sub);

      if (!scopedAccessAllowed) {
        throw new ApiError(403, "Missing permission: consent:view_evidence");
      }
    }

    const metadata = (doc.metadata && typeof doc.metadata === "object" && !Array.isArray(doc.metadata))
      ? (doc.metadata as Record<string, unknown>)
      : {};
    const evidenceVault = (metadata.evidenceVault && typeof metadata.evidenceVault === "object" && !Array.isArray(metadata.evidenceVault))
      ? (metadata.evidenceVault as Record<string, unknown>)
      : {};
    const verificationToken =
      typeof evidenceVault.verificationToken === "string" && evidenceVault.verificationToken.trim() !== ""
        ? evidenceVault.verificationToken.trim()
        : null;
    const verificationApiUrl = verificationToken
      ? `${request.nextUrl.origin}/api/modules/informed-consents/evidence/verify/${encodeURIComponent(verificationToken)}`
      : null;
    const verificationConsentUrl = `${request.nextUrl.origin}/verify/consent/${doc.id}`;

    const payload = {
      type: "INFORMED_CONSENT_SIGNATURE_CERTIFICATE",
      documentId: doc.id,
      consentReference: doc.consentReference,
      status: doc.status,
      finalizedAt: doc.finalizedAt?.toISOString() || null,
      generatedAt: new Date().toISOString(),
      verificationReference: {
        token: verificationToken,
        apiVerificationUrl: verificationApiUrl,
        consentVerificationUrl: verificationConsentUrl,
        checksumSha256:
          typeof evidenceVault.checksumSha256 === "string" && evidenceVault.checksumSha256.trim() !== ""
            ? evidenceVault.checksumSha256
            : null,
      },
      signatures: doc.signatures.map((item) => ({
        role: item.role,
        signerName: item.signerName,
        signedAt: item.signedAt?.toISOString() || null,
        signatureMethod: item.signatureMethod,
        signatureHash: item.signatureHash,
        certificateId: item.certificateId,
        evidenceId: item.evidenceId,
      })),
    };

    const safeReference = doc.consentReference.replace(/[^a-zA-Z0-9_-]/g, "_");

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="SIGNATURE-CERT-${safeReference}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
