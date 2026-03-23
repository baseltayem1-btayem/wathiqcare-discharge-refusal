import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";
import { getSessionCookieName } from "@/lib/server/sessionCookie";

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

function toInputJsonValue(value: unknown): Prisma.InputJsonValue | null {
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
    const jsonObj: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, val] of Object.entries(obj)) {
      jsonObj[key] = toInputJsonValue(val);
    }
    return jsonObj;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    if (!isEnabled()) {
      throw new ApiError(404, "SHC compliance module is disabled");
    }

    const auth = await requireAuth(request);
    const tenantId = auth.tenant_id;
    if (!tenantId) {
      throw new ApiError(403, "Tenant context is required");
    }
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

    const existingCase = await prisma.case.findFirst({
      where: { id: payload.caseId, tenantId },
    });
    if (!existingCase) {
      throw new ApiError(404, "Case not found");
    }

    let backendResult: Record<string, unknown> | null = null;
    const backendApiBase = getConfiguredBackendApiBaseUrl();
    if (!backendApiBase) {
      throw new ApiError(503, "BACKEND_API_BASE_URL is not configured for SHC module");
    }

    const accessTokenCookie = request.cookies.get(getSessionCookieName())?.value ?? "";
    const upstreamAuthorization = accessTokenCookie ? `Bearer ${accessTokenCookie}` : "";

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

    await prisma.case.update({
      where: { id: payload.caseId },
      data: {
        metadata: toInputJsonValue(updatedMetadata) as Prisma.InputJsonObject,
        updatedByUserId: auth.sub,
      },
    });

    await writeAuditLog({
      tenantId,
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
