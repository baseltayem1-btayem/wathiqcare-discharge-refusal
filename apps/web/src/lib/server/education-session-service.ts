export type EducationSessionStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type EducationSessionEventType =
  | "EDUCATION_VISUAL_GENERATED"
  | "EDUCATION_PRESENTED"
  | "EDUCATION_STARTED"
  | "EDUCATION_COMPLETED"
  | "EDUCATION_ACKNOWLEDGED";

export type EducationSessionState = {
  sessionId: string | null;
  documentId: string;
  packageId: string | null;
  versionId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: EducationSessionStatus;
};

type EducationAuditEvent = {
  action: string;
  createdAt: Date | string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function deriveEducationSessionState(args: {
  sessionId?: string | null;
  documentId: string;
  packageId?: string | null;
  versionId?: string | null;
  rawMetadata?: unknown;
  events?: EducationAuditEvent[];
}): EducationSessionState {
  const metadata = asRecord(args.rawMetadata) || {};
  const executionContext = asRecord(metadata.executionContext) || {};
  const educationSession = asRecord(executionContext.educationSession) || {};
  const events = args.events || [];

  const presentedEvent = events.find((event) => event.action === "EDUCATION_PRESENTED") || null;
  const startedEvent = events.find((event) => event.action === "EDUCATION_STARTED") || presentedEvent;
  const completedEvent = [...events].reverse().find((event) => event.action === "EDUCATION_COMPLETED") || null;

  const startedAt = toIsoString(startedEvent?.createdAt) || getNullableString(educationSession.startedAt) || null;
  const completedAt = toIsoString(completedEvent?.createdAt) || getNullableString(educationSession.completedAt) || null;
  const status: EducationSessionStatus = completedAt
    ? "COMPLETED"
    : startedAt
      ? "IN_PROGRESS"
      : "NOT_STARTED";

  return {
    sessionId: args.sessionId || getNullableString(educationSession.sessionId),
    documentId: args.documentId,
    packageId: args.packageId || getNullableString(educationSession.packageId),
    versionId: args.versionId || getNullableString(educationSession.versionId),
    startedAt,
    completedAt,
    status,
  };
}

export function mergeEducationSessionContext(args: {
  rawMetadata: unknown;
  eventType: EducationSessionEventType;
  sessionId?: string | null;
  documentId: string;
  packageId?: string | null;
  versionId?: string | null;
  occurredAt?: string;
}): Record<string, unknown> {
  const metadata = asRecord(args.rawMetadata) || {};
  const executionContext = asRecord(metadata.executionContext) || {};
  const currentSession = asRecord(executionContext.educationSession) || {};
  const occurredAt = args.occurredAt || new Date().toISOString();
  const startedAt =
    args.eventType === "EDUCATION_STARTED" || args.eventType === "EDUCATION_PRESENTED"
      ? getNullableString(currentSession.startedAt) || occurredAt
      : getNullableString(currentSession.startedAt);
  const completedAt =
    args.eventType === "EDUCATION_COMPLETED"
      ? occurredAt
      : getNullableString(currentSession.completedAt);
  const status: EducationSessionStatus = completedAt
    ? "COMPLETED"
    : startedAt
      ? "IN_PROGRESS"
      : "NOT_STARTED";

  return {
    ...metadata,
    executionContext: {
      ...executionContext,
      educationSession: {
        ...currentSession,
        sessionId: args.sessionId || getNullableString(currentSession.sessionId),
        documentId: args.documentId,
        packageId: args.packageId || getNullableString(currentSession.packageId),
        versionId: args.versionId || getNullableString(currentSession.versionId),
        startedAt,
        completedAt,
        status,
        lastEventType: args.eventType,
        updatedAt: occurredAt,
      },
    },
  };
}