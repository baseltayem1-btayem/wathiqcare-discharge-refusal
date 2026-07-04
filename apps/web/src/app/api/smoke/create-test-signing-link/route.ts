import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getPrisma } from "@/lib/server/prisma";
import { createConsentDocument, createConsentTemplate } from "@/lib/server/consent-library-service";
import { sendModuleSecureSigningLink } from "@/lib/server/module-secure-signing-service";
import type { AuthContext } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_PHYSICIAN_EMAIL = "dr.ahmed@wathiqcare.med.sa";
const DEFAULT_CASE_ID = "a4173dc9-5e40-4204-9b2c-4712abb6c7fa";
const DEFAULT_PATIENT_MOBILE = "+966543587771";
const DEFAULT_PATIENT_EMAIL = "Basel@linagroups.com";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.SMOKE_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json({ ok: false, error: "Smoke harness disabled" }, { status: 503 });
  }

  const provided = request.headers.get("x-smoke-secret")?.trim() || "";
  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(configuredSecret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const physicianEmail = String(body.physicianEmail || DEFAULT_PHYSICIAN_EMAIL).trim().toLowerCase();
  const caseId = String(body.caseId || DEFAULT_CASE_ID).trim();
  const patientName = String(body.patientName || "Mohammed Ibrahim Al-Rashidi").trim();
  const mobileNumber = String(body.mobileNumber || DEFAULT_PATIENT_MOBILE).trim();
  const recipientEmail = String(body.recipientEmail || DEFAULT_PATIENT_EMAIL).trim().toLowerCase();
  const locale = body.locale === "en" ? "en" : "ar";

  const prisma = getPrisma();

  const physician = await prisma.user.findUnique({
    where: { email: physicianEmail },
    select: { id: true, email: true, role: true, tenantId: true },
  });
  if (!physician || !physician.tenantId) {
    return badRequest(`Physician ${physicianEmail} not found or has no tenant`);
  }

  const auth: AuthContext = {
    sub: physician.id,
    email: physician.email,
    role: physician.role || "physician",
    tenant_id: physician.tenantId,
    user_type: "tenant_user",
  };

  let caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: physician.tenantId },
    select: { id: true, patientName: true, medicalRecordNo: true },
  });

  if (!caseRecord) {
    caseRecord = await prisma.case.create({
      data: {
        tenantId: physician.tenantId,
        id: caseId,
        patientName,
        medicalRecordNo: "MRN-2024-0847",
        caseNumber: `SMOKE-${Date.now()}`,
        createdByUserId: physician.id,
      },
      select: { id: true, patientName: true, medicalRecordNo: true },
    });
  }

  let template = await prisma.consentTemplate.findFirst({
    where: { tenantId: physician.tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true, currentVersionId: true },
  });

  if (!template || !template.currentVersionId) {
    const created = await createConsentTemplate(auth, {
      templateCode: `SMOKE-${Date.now()}`,
      consentType: "GENERAL_CONSENT",
      specialty: "GENERAL_MEDICINE",
      titleAr: "نموذج موافقة تجريبي",
      titleEn: "Smoke Test Consent",
    });
    template = { id: created.template.id, currentVersionId: created.version.id };
  }

  const document = await createConsentDocument(auth, {
    caseId: caseRecord.id,
    templateId: template.id,
    templateVersionId: template.currentVersionId || undefined,
    language: "bilingual",
    physicianName: physician.email,
  });

  const workflow = await sendModuleSecureSigningLink({
    tenantId: physician.tenantId,
    initiatedBy: physician.id,
    moduleKey: "informed_consent",
    moduleType: "informed_consent",
    documentId: document.id,
    caseId: caseRecord.id,
    patientName: caseRecord.patientName || patientName,
    mobileNumber,
    recipientEmail,
    locale: locale as "ar" | "en",
  });

  return NextResponse.json({
    ok: true,
    signingUrl: workflow.signingUrl,
    token: workflow.signingUrl.split("/").pop(),
    sessionId: workflow.sessionId,
    documentId: document.id,
    caseId: caseRecord.id,
    smsDeliveryStatus: workflow.smsDeliveryStatus,
    emailDeliveryStatus: workflow.emailDeliveryStatus,
    emailFailureReason: workflow.emailFailureReason,
  });
}
