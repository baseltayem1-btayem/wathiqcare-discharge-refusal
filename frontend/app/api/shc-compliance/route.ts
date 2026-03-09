import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";
import { getConfiguredBackendApiBaseUrl } from "@/lib/server/backend";

function isEnabled(): boolean {
  return process.env.SHC_COMPLIANCE_MODULE === "true";
}

export async function POST(request: NextRequest) {
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

    const existingCase = await prisma.case.findUnique({ where: { id: payload.caseId } });
    if (!existingCase) {
      throw new ApiError(404, "Case not found");
    }
    if (existingCase.tenantId !== auth.tenant_id) {
      throw new ApiError(403, "Tenant access denied");
    }

    let backendResult: Record<string, unknown> | null = null;
    const backendApiBase = getConfiguredBackendApiBaseUrl();
    const authHeader = request.headers.get("authorization") ?? "";

    if (backendApiBase) {
      const response = await fetch(`${backendApiBase}/api/shc-compliance/workflow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
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

      if (response.ok) {
        backendResult = (await response.json()) as Record<string, unknown>;
      }
    }

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
    };

    await prisma.case.update({
      where: { id: payload.caseId },
      data: {
        metadata: updatedMetadata,
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
