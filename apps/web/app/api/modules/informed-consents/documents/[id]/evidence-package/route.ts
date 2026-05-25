import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {

  buildImmutableEvidencePackage,
} from "@/lib/server/informed-consents-evidence-vault-service";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function buildArtifactUrls(origin: string, documentId: string, verificationToken: string | null) {
  return {
    finalPdf: `${origin}/api/modules/informed-consents/documents/${encodeURIComponent(documentId)}/pdf?lang=bilingual`,
    signatureCertificate: `${origin}/api/modules/informed-consents/documents/${encodeURIComponent(documentId)}/signature-certificate`,
    auditTrail: `${origin}/api/modules/informed-consents/documents/${encodeURIComponent(documentId)}/timeline`,
    verification: verificationToken
      ? `${origin}/api/modules/informed-consents/evidence/verify/${encodeURIComponent(verificationToken)}`
      : null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = getPrisma();
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:view_evidence");
    const { id } = await params;

    const doc = await prisma.consentDocument.findFirst({
      where: { id, tenantId: auth.tenant_id },
      select: {
        id: true,
        consentReference: true,
        status: true,
        finalizedAt: true,
        metadata: true,
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Consent document not found" }, { status: 404 });
    }

    const metadata = asRecord(doc.metadata);
    const evidenceVault = asRecord(metadata.evidenceVault);
    const verificationToken =
      typeof evidenceVault.verificationToken === "string" && evidenceVault.verificationToken.trim() !== ""
        ? evidenceVault.verificationToken.trim()
        : null;

    const evidencePackageV2Id =
      typeof evidenceVault.evidencePackageV2Id === "string" && evidenceVault.evidencePackageV2Id.trim() !== ""
        ? evidenceVault.evidencePackageV2Id.trim()
        : null;

    const packageV2 = evidencePackageV2Id
      ? await prisma.evidencePackage.findFirst({
          where: { id: evidencePackageV2Id, tenantId: auth.tenant_id || "" },
          include: {
            timeline: true,
            events: {
              orderBy: [{ sequenceNo: "asc" }, { eventTimestamp: "asc" }],
            },
            assetRecords: {
              orderBy: { sortOrder: "asc" },
            },
          },
        })
      : null;

    const artifactUrls = buildArtifactUrls(request.nextUrl.origin, doc.id, verificationToken);

    return NextResponse.json(
      toJsonSafe({
        ...doc,
        artifactUrls,
        bundle: {
          includes: ["final_pdf", "signature_certificate", "education_evidence", "audit_trail"],
          generatedFiles:
            Array.isArray(evidenceVault.files) && evidenceVault.files.every((item) => typeof item === "string")
              ? (evidenceVault.files as string[])
              : [
                  "final.pdf",
                  "signature-certificate.json",
                  "education-evidence.json",
                  "audit-timeline.json",
                ],
        },
        evidenceVault: {
          storagePath: typeof evidenceVault.storagePath === "string" ? evidenceVault.storagePath : null,
          checksumSha256: typeof evidenceVault.checksumSha256 === "string" ? evidenceVault.checksumSha256 : null,
          verificationToken,
          generatedAt: typeof evidenceVault.generatedAt === "string" ? evidenceVault.generatedAt : null,
          evidencePackageV2Id,
        },
        educationEvidence: packageV2
          ? {
              summary: packageV2.educationSummary,
              viewed: packageV2.educationViewed,
              language: packageV2.educationLanguage,
              viewDurationSeconds: packageV2.viewDurationSeconds,
              assetsPresented: {
                total: packageV2.events[0]?.assetsPresented ?? null,
                images: packageV2.events[0]?.imagesPresented ?? null,
                videos: packageV2.events[0]?.videosPresented ?? null,
                pdfs: packageV2.events[0]?.pdfsPresented ?? null,
              },
              timeline: packageV2.timeline?.timelineJson ?? null,
            }
          : null,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:view_evidence");
    const { id } = await params;

    const result = await buildImmutableEvidencePackage(auth, id, request);
    const artifactUrls = buildArtifactUrls(request.nextUrl.origin, id, result.verificationToken || null);
    return NextResponse.json(
      toJsonSafe({
        ...result,
        artifactUrls,
        bundle: {
          includes: ["final_pdf", "signature_certificate", "education_evidence", "audit_trail"],
          generatedFiles: result.files,
        },
      }),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
