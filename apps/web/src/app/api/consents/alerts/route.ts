import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import { writeConsentAudit } from "@/lib/server/consent-library-service";
import { getPrisma } from "@/lib/server/prisma";
import { extractContactDetails, resolveCaseFromEncounter } from "@/lib/server/workspace-consent-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AlertTone = "blue" | "amber" | "red";

type ConsentAlert = {
  id: string;
  title: string;
  description: string;
  badge: string;
  tone: AlertTone;
};

function isHighRisk(value: string | null | undefined): boolean {
  const normalized = String(value || "").trim().toUpperCase();
  return normalized === "HIGH" || normalized === "CRITICAL" || normalized === "HIGH_RISK";
}

function buildAlerts(input: {
  contactAvailable: boolean;
  riskLevel?: string | null;
  documentStatus?: string | null;
}): ConsentAlert[] {
  const alerts: ConsentAlert[] = [];

  if (isHighRisk(input.riskLevel)) {
    alerts.push({
      id: "high-risk-procedure",
      title: "High-Risk Procedure",
      description: "Enhanced physician review and patient explanation are required before send.",
      badge: "High",
      tone: "red",
    });
  }

  if (!input.contactAvailable) {
    alerts.push({
      id: "missing-contact",
      title: "Patient Contact Missing",
      description: "Mobile number or email is missing, so patient delivery is blocked.",
      badge: "Medium",
      tone: "amber",
    });
  }

  if (!input.documentStatus || ["DRAFT", "AI_DRAFT", "PHYSICIAN_REVIEW"].includes(input.documentStatus)) {
    alerts.push({
      id: "draft-review",
      title: "Additional Consent Items",
      description: "The consent package still needs physician review before final patient delivery.",
      badge: "Medium",
      tone: "amber",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "no-active-alerts",
      title: "No Active Alerts",
      description: "No blocking clinical or delivery alerts were detected for this encounter.",
      badge: "Info",
      tone: "blue",
    });
  }

  return alerts;
}

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  requireInformedConsentPermission(auth, "consent:review");
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const encounterId = searchParams.get("encounterId") || "";

  if (!encounterId) {
    return NextResponse.json(
      { ok: false, error: "Missing required query parameter: encounterId" },
      { status: 400 },
    );
  }

  const caseRecord = await resolveCaseFromEncounter(tenantId, encounterId);
  if (!caseRecord) {
    return NextResponse.json({ ok: false, error: "Encounter not found" }, { status: 404 });
  }

  const prisma = getPrisma();
  const document = await prisma.consentDocument.findFirst({
    where: { tenantId, caseId: encounterId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      templateId: true,
    },
  });

  const template = document?.templateId
    ? await prisma.consentTemplate.findFirst({
        where: { tenantId, id: document.templateId },
        select: { id: true, riskLevel: true },
      })
    : null;

  const contacts = extractContactDetails(caseRecord.metadata);
  const contactAvailable = Boolean(contacts.mobileNumber && contacts.email);
  const alerts = buildAlerts({
    contactAvailable,
    riskLevel: template?.riskLevel,
    documentStatus: document?.status,
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "consent_alerts_viewed",
    summary: `Consent alerts viewed for case ${encounterId}`,
    source: "api-consents-alerts",
    caseId: encounterId,
    consentDocumentId: document?.id,
    metadata: {
      caseId: encounterId,
      documentId: document?.id,
      alertCount: alerts.length,
      contactAvailable,
      riskLevel: template?.riskLevel ?? null,
      documentStatus: document?.status ?? null,
    },
    request,
  });

  return NextResponse.json({ ok: true, alerts });
}