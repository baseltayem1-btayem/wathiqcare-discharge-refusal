import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { writeConsentAudit } from "@/lib/server/consent-library-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{ formId: string }>;
};

const ALLOWED_FIELD_TYPES = new Set([
  "PATIENT_SIGNATURE",
  "PATIENT_NAME",
  "PATIENT_MRN",
  "PATIENT_NATIONAL_ID",
  "PATIENT_SIGNED_AT",
  "PHYSICIAN_SIGNATURE",
  "PHYSICIAN_NAME",
  "PHYSICIAN_LICENSE",
  "PHYSICIAN_SIGNED_AT",
  "GUARDIAN_SIGNATURE",
  "GUARDIAN_NAME",
  "GUARDIAN_SIGNED_AT",
  "WITNESS_SIGNATURE",
  "WITNESS_NAME",
  "WITNESS_SIGNED_AT",
  "INTERPRETER_SIGNATURE",
  "INTERPRETER_NAME",
  "INTERPRETER_SIGNED_AT",
  "OTP_VERIFICATION_REF",
  "QR_VERIFICATION_CODE",
  "CONSENT_DOCUMENT_ID",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asOptionalString(value: unknown): string | null {
  const text = asString(value);
  return text || null;
}

function asNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

async function resolveParams(context: RouteContext) {
  return await context.params;
}

function validateNormalizedBox(input: Record<string, unknown>) {
  const pageNumber = Math.trunc(asNumber(input.pageNumber));
  const x = asNumber(input.x);
  const y = asNumber(input.y);
  const width = asNumber(input.width);
  const height = asNumber(input.height);

  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return { ok: false as const, error: "pageNumber must be a positive integer." };
  }

  for (const [key, value] of Object.entries({ x, y, width, height })) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      return { ok: false as const, error: `${key} must be a normalized number between 0 and 1.` };
    }
  }

  if (width <= 0 || height <= 0) {
    return { ok: false as const, error: "width and height must be greater than zero." };
  }

  if (x + width > 1 || y + height > 1) {
    return { ok: false as const, error: "The field box exceeds the normalized page boundary." };
  }

  return {
    ok: true as const,
    value: { pageNumber, x, y, width, height },
  };
}

function normalizeFieldType(value: unknown): string {
  return asString(value).toUpperCase();
}

function normalizeFieldKey(value: unknown, fieldType: string): string {
  const explicit = asString(value);
  if (explicit) return explicit;

  return fieldType
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";
  const { formId } = await resolveParams(context);

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  if (!formId) {
    return NextResponse.json({ ok: false, error: "Missing formId" }, { status: 400 });
  }

  const prisma = getPrisma();

  const form = await prisma.consentForm.findFirst({
    where: { id: formId, tenantId },
    select: {
      id: true,
      tenantId: true,
      code: true,
      titleEn: true,
      titleAr: true,
      version: true,
      status: true,
      pdfTemplateUrl: true,
      governanceSnapshot: true,
    },
  });

  if (!form) {
    return NextResponse.json({ ok: false, error: "Consent form not found" }, { status: 404 });
  }

  const mappings = await prisma.consentSignatureFieldMapping.findMany({
    where: {
      tenantId,
      formId,
      isActive: true,
    },
    orderBy: [
      { pageNumber: "asc" },
      { fieldType: "asc" },
      { fieldKey: "asc" },
    ],
  });

  return NextResponse.json({
    ok: true,
    source: "database",
    form,
    total: mappings.length,
    mappings,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const tenantId = auth.tenant_id || "";
  const { formId } = await resolveParams(context);

  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing tenant context" }, { status: 400 });
  }

  if (!formId) {
    return NextResponse.json({ ok: false, error: "Missing formId" }, { status: 400 });
  }

  const body = asRecord(await request.json().catch(() => ({})));
  const fieldType = normalizeFieldType(body.fieldType);

  if (!ALLOWED_FIELD_TYPES.has(fieldType)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported signature field type.",
        allowedFieldTypes: Array.from(ALLOWED_FIELD_TYPES).sort(),
      },
      { status: 422 },
    );
  }

  const box = validateNormalizedBox(body);
  if (!box.ok) {
    return NextResponse.json({ ok: false, error: box.error }, { status: 422 });
  }

  const fieldKey = normalizeFieldKey(body.fieldKey, fieldType);

  const prisma = getPrisma();

  const form = await prisma.consentForm.findFirst({
    where: { id: formId, tenantId },
    select: {
      id: true,
      code: true,
      titleEn: true,
      titleAr: true,
      version: true,
      status: true,
    },
  });

  if (!form) {
    return NextResponse.json({ ok: false, error: "Consent form not found" }, { status: 404 });
  }

  const duplicate = await prisma.consentSignatureFieldMapping.findFirst({
    where: {
      tenantId,
      formId,
      fieldKey,
      isActive: true,
    },
    select: { id: true, fieldKey: true },
  });

  if (duplicate) {
    return NextResponse.json(
      {
        ok: false,
        error: "An active mapping already exists for this fieldKey.",
        duplicate,
      },
      { status: 409 },
    );
  }

  const appearance = asRecord(body.appearance);
  const metadata = asRecord(body.metadata);

  const mapping = await prisma.consentSignatureFieldMapping.create({
    data: {
      tenantId,
      formId,
      fieldKey,
      fieldType,
      role: asOptionalString(body.role),
      labelEn: asOptionalString(body.labelEn),
      labelAr: asOptionalString(body.labelAr),
      pageNumber: box.value.pageNumber,
      x: box.value.x,
      y: box.value.y,
      width: box.value.width,
      height: box.value.height,
      coordinateMode: "NORMALIZED",
      required: body.required === false ? false : true,
      isActive: true,
      appearance: Object.keys(appearance).length ? appearance : undefined,
      metadata: Object.keys(metadata).length ? metadata : undefined,
      createdByUserId: auth.sub || null,
    },
  });

  await writeConsentAudit({
    tenantId,
    auth,
    action: "signature_mapping_created",
    summary: `Signature field mapping created for consent form ${form.code}`,
    source: "informed-consents-signature-mapping",
    templateId: form.id,
    metadata: {
      formId,
      formCode: form.code,
      formVersion: form.version,
      mappingId: mapping.id,
      fieldKey: mapping.fieldKey,
      fieldType: mapping.fieldType,
      pageNumber: mapping.pageNumber,
      x: mapping.x,
      y: mapping.y,
      width: mapping.width,
      height: mapping.height,
      coordinateMode: mapping.coordinateMode,
      required: mapping.required,
    },
    request,
  });

  return NextResponse.json(
    {
      ok: true,
      mapping,
    },
    { status: 201 },
  );
}
