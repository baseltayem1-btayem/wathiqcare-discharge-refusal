import { NextRequest, NextResponse } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import {
  createConsentDocument,
  createConsentTemplate,
} from "@/lib/server/consent-library-service";
import { getPrisma } from "@/lib/server/prisma";
import { ApiError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const caseId = String(body.caseId || "").trim();
  let templateId = String(body.templateId || "").trim();
  const language = body.language === "ar" || body.language === "en" ? (body.language as "ar" | "en") : "bilingual";

  if (!caseId) {
    return NextResponse.json({ ok: false, error: "caseId is required" }, { status: 400 });
  }

  const prisma = getPrisma();

  // Verify the case belongs to the tenant.
  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId },
    select: {
      id: true,
      patientName: true,
      medicalRecordNo: true,
      metadata: true,
    },
  });
  if (!caseRecord) {
    return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });
  }

  // Resolve template: try by id, then by templateCode, then by specialty/type.
  let template = templateId
    ? await prisma.consentTemplate.findFirst({
        where: { tenantId, OR: [{ id: templateId }, { templateCode: { equals: templateId, mode: "insensitive" } }] },
        select: { id: true, currentVersionId: true },
      })
    : null;

  if (!template && templateId) {
    // Try matching static IMC template ids to a tenant template by code prefix.
    template = await prisma.consentTemplate.findFirst({
      where: {
        tenantId,
        templateCode: { startsWith: templateId.slice(0, 8), mode: "insensitive" },
      },
      select: { id: true, currentVersionId: true },
    });
  }

  if (!template) {
    // Fall back to any existing tenant template.
    template = await prisma.consentTemplate.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { id: true, currentVersionId: true },
    });
  }

  if (!template) {
    // Create a minimal generic template so the pilot can proceed.
    const created = await createConsentTemplate(auth, {
      templateCode: `PILOT-${Date.now()}`,
      consentType: "GENERAL_CONSENT",
      specialty: "GENERAL_MEDICINE",
      titleAr: "نموذج موافقة طبي",
      titleEn: "Medical Consent Form",
    });
    template = { id: created.template.id, currentVersionId: created.version.id };
  }

  const metadata = (caseRecord.metadata || {}) as Record<string, unknown>;
  const plannedProcedure =
    typeof body.plannedProcedure === "string" && body.plannedProcedure.trim()
      ? body.plannedProcedure.trim()
      : typeof metadata.plannedProcedure === "string"
        ? metadata.plannedProcedure
        : null;
  const diagnosis =
    typeof body.diagnosis === "string" && body.diagnosis.trim()
      ? body.diagnosis.trim()
      : typeof metadata.diagnosis === "string"
        ? metadata.diagnosis
        : null;

  try {
    const document = await createConsentDocument(auth, {
      caseId,
      templateId: template.id,
      templateVersionId: template.currentVersionId || undefined,
      language,
      physicianName: typeof body.physicianName === "string" ? body.physicianName.trim() : auth.email || undefined,
      physicianSpecialty: typeof body.physicianSpecialty === "string" ? body.physicianSpecialty.trim() : undefined,
      department: typeof body.department === "string" ? body.department.trim() : undefined,
      diagnosis: diagnosis || undefined,
      plannedProcedure: plannedProcedure || undefined,
      metadata: {
        source: "production-physician-workspace",
        assemblyTemplateId: String(body.templateId || ""),
        ...(body.metadata && typeof body.metadata === "object" ? (body.metadata as Record<string, unknown>) : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      document: {
        id: document.id,
        consentReference: document.consentReference,
        status: document.status,
        patientName: document.patientName,
        mrn: document.mrn,
      },
    });
  } catch (error) {
    const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "25"), 100);

  const prisma = getPrisma();
  const documents = await prisma.consentDocument.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      consentReference: true,
      status: true,
      patientName: true,
      mrn: true,
      createdAt: true,
      case: { select: { caseNumber: true, medicalRecordNo: true, patientName: true } },
      template: { select: { titleAr: true, titleEn: true, consentType: true } },
    },
  });

  return NextResponse.json(documents);
}
