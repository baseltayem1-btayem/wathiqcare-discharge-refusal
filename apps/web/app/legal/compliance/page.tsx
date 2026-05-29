import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/server/prisma";
import { requirePageAuthClaimsOrRedirect, type PageAuthClaims } from "@/lib/server/pageAuth";
import LegalComplianceDashboard, {
  type AuditEventRow,
  type EvidenceRow,
  type OtpEventRow,
  type PdfStatusRow,
} from "@/components/legal/LegalComplianceDashboard";

export const dynamic = "force-dynamic";

// Roles authorized to view the Legal Compliance experience. Platform admins
// bypass this list. All other authenticated users are redirected to /dashboard.
const ALLOWED_ROLES = new Set<string>([
  "legal_admin",
  "compliance",
  "tenant_owner",
  "tenant_admin",
  "medical_director",
  "quality",
]);

function canViewLegalCompliance(auth: PageAuthClaims): boolean {
  if ((auth.platform_role || "").trim()) return true;
  return ALLOWED_ROLES.has((auth.role || "").toLowerCase());
}

function isOtpAction(action: string): boolean {
  const lower = action.toLowerCase();
  return (
    lower.includes("otp") ||
    lower.includes("verify_otp") ||
    lower.includes("request_otp") ||
    lower.includes("public_signing_otp")
  );
}

export default async function LegalCompliancePage() {
  const auth = await requirePageAuthClaimsOrRedirect("/legal/compliance");

  if (!canViewLegalCompliance(auth)) {
    redirect("/dashboard");
  }

  const prisma = getPrisma();
  const isPlatform = Boolean((auth.platform_role || "").trim());
  const tenantFilter = isPlatform ? {} : { tenantId: auth.tenant_id || "__no_tenant__" };

  // Live data only — same Prisma source as /api/audit-log and
  // /api/modules/informed-consents/documents. No mock fixtures, no fallbacks.
  const [auditLogs, otpLogs, signedDocs, pdfDocs] = await Promise.all([
    prisma.auditLog.findMany({
      where: tenantFilter,
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditLog.findMany({
      where: {
        ...tenantFilter,
        OR: [
          { action: { contains: "otp", mode: "insensitive" } },
          { action: { contains: "verify", mode: "insensitive" } },
        ],
      },
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.consentDocument.findMany({
      where: {
        ...tenantFilter,
        status: { in: ["COMPLETED", "SIGNED", "APPROVED"] as never },
      },
      select: {
        id: true,
        consentReference: true,
        patientName: true,
        physicianName: true,
        status: true,
        documentVersion: true,
        immutablePdfHash: true,
        immutablePdfUrl: true,
        finalizedAt: true,
        approvedAt: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.consentDocument.findMany({
      where: tenantFilter,
      select: {
        id: true,
        consentReference: true,
        patientName: true,
        status: true,
        immutablePdfUrl: true,
        immutablePdfHash: true,
        finalizedAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const evidenceRows: EvidenceRow[] = signedDocs.map((doc) => ({
    id: doc.id,
    reference: doc.consentReference,
    patientName: doc.patientName,
    physicianName: doc.physicianName,
    status: String(doc.status),
    version: doc.documentVersion ?? "v1.0",
    hash: doc.immutablePdfHash ?? null,
    pdfUrl: doc.immutablePdfUrl ?? null,
    generatedAt: (doc.finalizedAt ?? doc.approvedAt ?? doc.updatedAt).toISOString(),
  }));

  const auditRows: AuditEventRow[] = auditLogs.map((log) => ({
    id: log.id,
    timestamp: log.createdAt.toISOString(),
    actor: log.user?.fullName || log.user?.email || log.userId || "system",
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId ?? null,
    documentId: log.documentId ?? null,
    caseId: log.caseId ?? null,
  }));

  const otpRows: OtpEventRow[] = otpLogs
    .filter((log) => isOtpAction(log.action))
    .map((log) => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      actor: log.user?.fullName || log.user?.email || log.userId || "system",
      action: log.action,
      ipAddress: log.ipAddress ?? null,
      entityId: log.entityId ?? null,
      caseId: log.caseId ?? null,
    }));

  const pdfRows: PdfStatusRow[] = pdfDocs.map((doc) => ({
    id: doc.id,
    reference: doc.consentReference,
    patientName: doc.patientName,
    status: String(doc.status),
    hasPdf: Boolean(doc.immutablePdfUrl),
    hash: doc.immutablePdfHash ?? null,
    pdfUrl: doc.immutablePdfUrl ?? null,
    finalizedAt: doc.finalizedAt ? doc.finalizedAt.toISOString() : null,
    updatedAt: doc.updatedAt.toISOString(),
  }));

  return (
    <LegalComplianceDashboard
      tenantCode={auth.tenant_code ?? null}
      isPlatform={isPlatform}
      evidence={evidenceRows}
      audit={auditRows}
      otp={otpRows}
      pdf={pdfRows}
    />
  );
}
