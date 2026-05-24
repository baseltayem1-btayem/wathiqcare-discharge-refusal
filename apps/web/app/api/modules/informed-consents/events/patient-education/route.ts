import { NextRequest, NextResponse } from "next/server";

import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { requireInformedConsentPermission } from "@/lib/modules/informed-consents-rbac";
import {
  PATIENT_EDUCATION_EVENT_TYPES,
  recordPatientEducationEvent,
  type PatientEducationEventType,
  type PatientEducationLanguage,
} from "@/lib/server/patient-education-evidence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_LANGUAGES: PatientEducationLanguage[] = ["ar", "en", "bilingual"];

function isPatientEducationEventType(value: unknown): value is PatientEducationEventType {
  return typeof value === "string" && (PATIENT_EDUCATION_EVENT_TYPES as readonly string[]).includes(value);
}

function isLanguage(value: unknown): value is PatientEducationLanguage {
  return typeof value === "string" && ALLOWED_LANGUAGES.includes(value as PatientEducationLanguage);
}

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireModuleOperationalAccess(request, "informed-consents");
    requireInformedConsentPermission(auth, "consent:create");

    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!payload) {
      throw new ApiError(400, "Request body is required.");
    }

    if (!isPatientEducationEventType(payload.eventType)) {
      throw new ApiError(400, "Unsupported or missing eventType.");
    }

    if (typeof payload.templateCode !== "string" || payload.templateCode.trim() === "") {
      throw new ApiError(400, "templateCode is required.");
    }

    if (!isLanguage(payload.language)) {
      throw new ApiError(400, "language must be one of: ar, en, bilingual.");
    }

    const result = await recordPatientEducationEvent({
      auth,
      eventType: payload.eventType,
      templateCode: payload.templateCode.trim(),
      language: payload.language,
      score: coerceFiniteNumber(payload.score),
      durationSeconds: coerceFiniteNumber(payload.durationSeconds),
      attempts: coerceFiniteNumber(payload.attempts),
      consentDocumentId:
        typeof payload.consentDocumentId === "string" && payload.consentDocumentId.trim() !== ""
          ? payload.consentDocumentId.trim()
          : undefined,
      caseId:
        typeof payload.caseId === "string" && payload.caseId.trim() !== ""
          ? payload.caseId.trim()
          : undefined,
      extra:
        payload.extra && typeof payload.extra === "object" && !Array.isArray(payload.extra)
          ? (payload.extra as Record<string, unknown>)
          : undefined,
      request,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
