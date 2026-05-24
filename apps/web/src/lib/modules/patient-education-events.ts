/**
 * Phase 2.5 — Patient-Education evidence client helper.
 *
 * Lightweight fire-and-forget emitter used by the informed-consent UI to ship
 * patient-education telemetry to the existing audit/evidence pipeline. The
 * server route (`POST /api/modules/informed-consents/events/patient-education`)
 * authenticates via the session cookie and persists events into
 * `ConsentAuditEvent` + `AuditLog` with no schema changes.
 *
 * IMPORTANT: this module is safe to import from client components. It contains
 * no Node-only dependencies and only uses `fetch`.
 */

export const PATIENT_EDUCATION_EVENT_TYPES = [
  "EDUCATION_OPENED",
  "EDUCATION_COMPLETED",
  "FAQ_VIEWED",
  "UNDERSTANDING_COMPLETED",
  "UNDERSTANDING_PASSED",
] as const;

export type PatientEducationEventType = (typeof PATIENT_EDUCATION_EVENT_TYPES)[number];
export type PatientEducationLanguage = "ar" | "en" | "bilingual";

export interface PatientEducationEventPayload {
  eventType: PatientEducationEventType;
  templateCode: string;
  language: PatientEducationLanguage;
  /** 0..100 — required for UNDERSTANDING_COMPLETED / UNDERSTANDING_PASSED. */
  score?: number;
  /** Seconds since EDUCATION_OPENED. */
  durationSeconds?: number;
  /** 1-based submission counter for the understanding check. */
  attempts?: number;
  /** Free-form extras (faqItemId, answers, passingScore, passed, etc.). */
  extra?: Record<string, unknown>;
  /** Optional consent document id once created (later flow stages). */
  consentDocumentId?: string;
  /** Optional case id propagated to the audit chain. */
  caseId?: string;
}

const ENDPOINT = "/api/modules/informed-consents/events/patient-education";

/**
 * Emit a patient-education evidence event. Never throws — failures are logged
 * to the console so that UI flow is not blocked by audit-pipeline outages.
 */
export async function emitPatientEducationEvent(
  payload: PatientEducationEventPayload,
): Promise<void> {
  try {
    const body = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    const response = await fetch(ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[patient-education-events] non-2xx response for ${payload.eventType}: ${response.status}`,
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[patient-education-events] emit failed", payload.eventType, error);
  }
}
