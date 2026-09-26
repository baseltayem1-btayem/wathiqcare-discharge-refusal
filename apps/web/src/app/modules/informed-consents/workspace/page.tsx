import AccessDenied from "@/components/AccessDenied";
import InformedConsentWorkspacePage from "@/components/informed-consents/workspace/InformedConsentWorkspacePage";
import type {
  AuditEvidence,
  ConsentReadiness,
  PatientEncounter,
  ProcedurePackage,
  SendEligibility,
  TimelineEvent,
  WorkflowStep,
} from "@/components/informed-consents/workspace/types";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";

interface WorkspacePageProps {
  searchParams: Promise<{ encounterId?: string; procedureId?: string }>;
}

async function getPatientEncounter(
  tenantId: string,
  encounterId: string,
): Promise<PatientEncounter | null> {
  const prisma = getPrisma();
  const caseRecord = await prisma.case.findFirst({
    where: { id: encounterId, tenantId },
    select: {
      id: true,
      patientName: true,
      medicalRecordNo: true,
      metadata: true,
    },
  });

  if (!caseRecord) return null;

  const metadata = (caseRecord.metadata ?? {}) as Record<string, unknown>;
  const mobile =
    typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.mobileNumber ?? metadata.phone ?? metadata.patientPhone ?? "") || "")
      : "";
  const email =
    typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.email ?? metadata.patientEmail ?? metadata.emailAddress ?? "") || "")
      : "";

  return {
    name: caseRecord.patientName || "Unknown Patient",
    mrn: caseRecord.medicalRecordNo || `CASE-${caseRecord.id.slice(0, 8).toUpperCase()}`,
    encounterId: caseRecord.id,
    mobileNumber: mobile || null,
    email: email || null,
  };
}

async function resolveProcedurePackage(
  tenantId: string,
  procedureId: string,
): Promise<ProcedurePackage | null> {
  const prisma = getPrisma();

  const template = await prisma.consentTemplate.findFirst({
    where: {
      tenantId,
      OR: [
        { id: procedureId },
        { templateCode: { equals: procedureId, mode: "insensitive" } },
      ],
    },
    include: {
      versions: {
        where: { status: { in: ["APPROVED", "ACTIVE"] } },
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: {
          sections: { select: { id: true } },
        },
      },
    },
  });

  if (!template) return null;

  const currentVersion =
    template.versions[0] ??
    (await prisma.consentTemplateVersion.findFirst({
      where: { templateId: template.id, tenantId },
      orderBy: { versionNumber: "desc" },
      take: 1,
    }));

  if (!currentVersion) return null;

  const metadata = (template.metadata ?? {}) as Record<string, unknown>;
  const procedureMeta =
    typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata.procedure as Record<string, unknown> | undefined)
      : undefined;

  return {
    id: template.id,
    name: template.titleEn || template.titleAr || "Procedure Package",
    category: template.specialty || "General",
    version: currentVersion.versionLabel || String(currentVersion.versionNumber),
    versionId: currentVersion.id,
    riskLevel: template.riskLevel || "Standard Risk",
    languageSet: "Bilingual Set",
    grade: String(procedureMeta?.grade ?? "6"),
    illustrated: Boolean(procedureMeta?.illustrated ?? true),
    duration: String(procedureMeta?.duration ?? "~15 min"),
    sections: currentVersion.sections?.length ?? 7,
    keyBenefits: Number(procedureMeta?.keyBenefits ?? 0),
    risks: Number(procedureMeta?.risks ?? 0),
    alternatives: Number(procedureMeta?.alternatives ?? 0),
    lastUpdated: currentVersion.updatedAt.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    status: template.status === "ACTIVE" || template.status === "APPROVED" ? "ready_for_review" : "draft",
  };
}

async function getConsentDocument(tenantId: string, caseId: string, templateId: string) {
  const prisma = getPrisma();
  return prisma.consentDocument.findFirst({
    where: { tenantId, caseId, templateId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      documentVersion: true,
      updatedAt: true,
      metadata: true,
    },
  });
}

async function getConsentReadiness(
  tenantId: string,
  encounterId: string,
  procedure: ProcedurePackage | null,
  document: { id: string; status: string } | null,
): Promise<ConsentReadiness> {
  const checks = [
    { label: "Patient Selected", done: true },
    { label: "Procedure Resolved", done: procedure !== null },
    { label: "Knowledge Package Ready", done: document !== null && document.status !== "VOID" },
    { label: "Risk Level Assessed", done: procedure !== null && procedure.riskLevel !== "UNKNOWN" },
  ];

  const completed = checks.filter((c) => c.done).length;
  const total = checks.length;

  return {
    percentage: Math.round((completed / total) * 100),
    completed,
    total,
    checks,
  };
}

async function getAuditSessionActive(
  tenantId: string,
  caseId: string,
  documentId?: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const where: Record<string, unknown> = { tenantId, caseId };
  if (documentId) {
    where.metadataJson = { path: ["documentId"], equals: documentId };
  }
  const count = await prisma.auditChainEvent.count({ where });
  return count > 0;
}

async function getAuditEvidence(
  tenantId: string,
  encounterId: string,
  document: { id: string; documentVersion: string | null } | null,
): Promise<AuditEvidence> {
  const prisma = getPrisma();
  const chainCount = await prisma.auditChainEvent.count({
    where: { tenantId, caseId: encounterId },
  });

  return {
    tamperEvident: chainCount > 0,
    items: [
      {
        iconName: "LockKeyhole",
        title: "All actions securely logged",
        description: `Complete audit trail with ${chainCount} chain event${chainCount === 1 ? "" : "s"}.`,
      },
      {
        iconName: "Download",
        title: "Export Evidence",
        description: "Download signed audit report.",
      },
      {
        iconName: "FileCheck2",
        title: "Package Version",
        description: document ? `v${document.documentVersion || "1.0"} • Current` : "v1.0 • Current",
      },
      {
        iconName: "ShieldCheck",
        title: "Trust & Compliance",
        description: "HIPAA • SOC 2 • ISO 27001",
      },
    ],
  };
}

function getTimeline(): TimelineEvent[] {
  return [
    { label: "Patient Selected", time: "4:10 PM", done: true },
    { label: "Procedure Resolved", time: "4:11 PM", done: true },
    { label: "Knowledge Package Ready", time: "", done: false },
    { label: "Risk Review", time: "", done: false },
    { label: "Patient Delivery", time: "", done: false },
    { label: "Signature Pending", time: "", done: false },
  ];
}

function getWorkflowSteps(): WorkflowStep[] {
  return [
    { id: 1, title: "Patient Selected", status: "completed" },
    { id: 2, title: "Procedure Resolved", status: "active" },
    { id: 3, title: "Knowledge Package Ready", status: "pending" },
    { id: 4, title: "Risk Review", status: "pending" },
    { id: 5, title: "Patient Delivery", status: "pending" },
    { id: 6, title: "Signature Pending", status: "pending" },
  ];
}

function buildSendEligibility(
  readiness: ConsentReadiness,
  patient: PatientEncounter,
  procedure: ProcedurePackage | null,
  auditSessionActive: boolean,
): SendEligibility {
  const contactAvailable = Boolean(patient.mobileNumber && patient.email);
  const versionResolved = procedure !== null && Boolean(procedure.version);
  const readinessComplete = readiness.percentage === 100;

  const gates = [
    { ok: readinessComplete, reason: "Readiness checklist is not complete" },
    { ok: contactAvailable, reason: "Patient contact details are missing" },
    { ok: versionResolved, reason: "Procedure package version is not resolved" },
    { ok: auditSessionActive, reason: "Audit session is not active" },
  ];

  const firstBlocked = gates.find((g) => !g.ok);

  return {
    canSend: !firstBlocked,
    reason: firstBlocked?.reason,
    dryRunPassed: false,
    contactAvailable,
    versionResolved,
    auditSessionActive,
  };
}

export default async function WorkspacePage({ searchParams }: WorkspacePageProps) {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    return (
      <AccessDenied
        resource="Informed Consents Module"
        backHref="/modules"
        backLabel="العودة إلى الوحدات"
      />
    );
  }

  const tenantId = auth.tenant_id;
  if (!tenantId) {
    return (
      <AccessDenied
        resource="Informed Consents Module"
        backHref="/modules"
        backLabel="العودة إلى الوحدات"
      />
    );
  }

  const { encounterId, procedureId } = await searchParams;

  if (!encounterId || !procedureId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Missing parameters</h1>
          <p className="mt-2 text-sm">
            Please provide{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">encounterId</code> and{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">procedureId</code> query parameters.
          </p>
        </div>
      </div>
    );
  }

  const [patient, procedure] = await Promise.all([
    getPatientEncounter(tenantId, encounterId),
    resolveProcedurePackage(tenantId, procedureId),
  ]);

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Encounter not found</h1>
          <p className="mt-2 text-sm">The requested encounter could not be found in this tenant.</p>
        </div>
      </div>
    );
  }

  const document = procedure
    ? await getConsentDocument(tenantId, encounterId, procedure.id)
    : null;

  const [readiness, auditSessionActive, audit] = await Promise.all([
    getConsentReadiness(tenantId, encounterId, procedure, document),
    getAuditSessionActive(tenantId, encounterId, document?.id),
    getAuditEvidence(tenantId, encounterId, document),
  ]);

  const sendEligibility = buildSendEligibility(readiness, patient, procedure, auditSessionActive);

  return (
    <InformedConsentWorkspacePage
      auth={auth}
      encounterId={encounterId}
      procedureId={procedureId}
      patient={patient}
      procedure={
        procedure ?? {
          id: "",
          name: "Unknown Procedure",
          category: "Unknown",
          version: "",
          versionId: "",
          riskLevel: "Unknown",
          languageSet: "Unknown",
          grade: "0",
          illustrated: false,
          duration: "",
          sections: 0,
          keyBenefits: 0,
          risks: 0,
          alternatives: 0,
          lastUpdated: "",
          status: "draft",
        }
      }
      readiness={readiness}
      timeline={getTimeline()}
      audit={audit}
      workflowSteps={getWorkflowSteps()}
      sendEligibility={sendEligibility}
    />
  );
}
