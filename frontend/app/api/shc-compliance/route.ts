import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";

function isEnabled(): boolean {
  return process.env.SHC_COMPLIANCE_MODULE === "true";
}

function extractBackendErrorDetail(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "Unknown backend error";
  }

  const detail = (value as Record<string, unknown>).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  const message = (value as Record<string, unknown>).message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return "Unknown backend error";
}

<<<<<<< HEAD
function toInputJsonValue(value: unknown): getPrisma().InputJsonValue | null {
=======
function toInputJsonValue(value: unknown): Prisma.InputJsonValue | null {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toInputJsonValue(item));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
<<<<<<< HEAD
    const jsonObj: Record<string, getPrisma().InputJsonValue | null> = {};
=======
    const jsonObj: Record<string, Prisma.InputJsonValue | null> = {};
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    for (const [key, val] of Object.entries(obj)) {
      jsonObj[key] = toInputJsonValue(val);
    }
    return jsonObj;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  try {
    if (!isEnabled()) {
      throw new ApiError(404, "SHC compliance module is disabled");
    }

    const auth = requireAuth(request);
    const payload = (await request.json().catch(() => null)) as
      | {
        caseId?: string;
        shc?: Record<string, unknown>;
        patient?: Record<string, unknown>;
        signature?: Record<string, unknown>;
      }
      | null;

    if (!payload?.caseId || !payload.shc) {
      throw new ApiError(400, "caseId and shc payload are required");
    }

    const shc = payload.shc as Record<string, unknown>;
    const patient = (payload.patient ?? {}) as Record<string, unknown>;
    const signature = (payload.signature ?? {}) as Record<string, unknown>;

<<<<<<< HEAD
    const existingCase = await getPrisma().case.findUnique({ where: { id: payload.caseId } });
=======
    const existingCase = await prisma.case.findUnique({ where: { id: payload.caseId } });
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (!existingCase) {
      throw new ApiError(404, "Case not found");
    }
    if (existingCase.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    let backendResult: Record<string, unknown> | null = null;
    const backendApiBase = getConfiguredBackendApiBaseUrl();
    if (!backendApiBase) {
      throw new ApiError(503, "BACKEND_API_BASE_URL is not configured for SHC module");
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const accessTokenCookie = request.cookies.get("wathiqcare_access_token")?.value ?? "";
    const upstreamAuthorization = authHeader || (accessTokenCookie ? `Bearer ${accessTokenCookie}` : "");

    const response = await fetch(`${backendApiBase}/api/shc-compliance/workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(upstreamAuthorization ? { Authorization: upstreamAuthorization } : {}),
      },
      body: JSON.stringify({
        case_id: payload.caseId,
        patient_name: String(patient["patient_name"] ?? existingCase.patientName ?? ""),
        patient_id_number: String(patient["patient_id_number"] ?? existingCase.patientIdNumber ?? ""),
        medical_record_number: String(
          patient["medical_record_number"] ?? existingCase.medicalRecordNo ?? ""
        ),
        room_number: String(patient["room_number"] ?? existingCase.roomNumber ?? ""),
        attending_physician: String(patient["attending_physician"] ?? ""),
        discharge_status: String(shc["discharge_status"] ?? "accept_discharge"),
        discharge_alternative: shc["discharge_alternative"] ?? null,
        homecare_plan: shc["home_care_plan"] ?? null,
        transfer_request: shc["transfer_request"] ?? null,
        equipment_request: shc["equipment_request"] ?? null,
        signature_method: signature["signature_method"] ?? null,
        signature_device: signature["device"] ?? null,
      }),
    });

    const backendPayload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `SHC backend workflow failed: ${extractBackendErrorDetail(backendPayload)}`,
      );
    }

    backendResult = backendPayload;

    const currentMeta =
      existingCase.metadata && typeof existingCase.metadata === "object"
        ? (existingCase.metadata as Record<string, unknown>)
        : {};

    const updatedMetadata = {
      ...currentMeta,
      shc_compliance: {
        ...shc,
        backend_result: backendResult,
      },
    } satisfies Record<string, unknown>;

<<<<<<< HEAD
    await getPrisma().case.update({
      where: { id: payload.caseId },
      data: {
        metadata: toInputJsonValue(updatedMetadata) as getPrisma().InputJsonObject,
=======
    await prisma.case.update({
      where: { id: payload.caseId },
      data: {
        metadata: toInputJsonValue(updatedMetadata) as Prisma.InputJsonObject,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        updatedByUserId: auth.sub,
      },
    });

    await writeAuditLog({
      tenantId: auth.tenant_id,
      userId: auth.sub,
      entityType: "case",
      entityId: payload.caseId,
      action: "shc_compliance_recorded",
      details: "SHC discharge refusal workflow recorded",
      caseId: payload.caseId,
      metadataJson: {
        decision: shc["discharge_status"] ?? null,
        forms_generated: backendResult?.forms_generated ?? null,
        signature_method: signature["signature_method"] ?? null,
        equipment_requests: shc["equipment_request"] ?? null,
      },
      request,
    });

    return NextResponse.json({ ok: true, backendResult });
  } catch (error) {
    return handleApiError(error);
  }
}
