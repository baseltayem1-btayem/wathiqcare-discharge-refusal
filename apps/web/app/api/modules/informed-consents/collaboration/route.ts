import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const COMMUNICATION_TYPES = [
  "NOTE",
  "TASK",
  "MENTION",
  "LEGAL_REVIEW",
  "ANESTHESIA_REVIEW",
  "SURGEON_REVIEW",
] as const;

const TASK_TYPES = [
  "TASK",
  "LEGAL_REVIEW",
  "ANESTHESIA_REVIEW",
  "SURGEON_REVIEW",
] as const;

const TASK_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

const VISIBILITIES = [
  "INTERNAL",
  "PATIENT_VISIBLE",
] as const;

const PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const;

type CommunicationType = typeof COMMUNICATION_TYPES[number];
type TaskStatus = typeof TASK_STATUSES[number];
type Visibility = typeof VISIBILITIES[number];
type Priority = typeof PRIORITIES[number];

type CollaborationBody = {
  caseId?: string;
  tenantId?: string;
  actorUserId?: string;
  actorDepartment?: string | null;
  action?: string;
  communicationType?: string;
  message?: string;
  mentionedUserId?: string | null;
  taskStatus?: string | null;
  visibility?: string;
  priority?: string;
  dueAt?: string | null;
};

type PatchBody = {
  eventId?: string;
  tenantId?: string;
  taskStatus?: string;
  message?: string;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

function notFound(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 404 });
}

function normalizeCommunicationType(value?: string): CommunicationType {
  const normalized = (value || "NOTE").toUpperCase();
  if (!COMMUNICATION_TYPES.includes(normalized as CommunicationType)) {
    throw new Error(`Invalid communicationType: ${value}`);
  }
  return normalized as CommunicationType;
}

function normalizeVisibility(value?: string): Visibility {
  const normalized = (value || "INTERNAL").toUpperCase();
  if (!VISIBILITIES.includes(normalized as Visibility)) {
    throw new Error(`Invalid visibility: ${value}`);
  }
  return normalized as Visibility;
}

function normalizePriority(value?: string): Priority {
  const normalized = (value || "NORMAL").toUpperCase();
  if (!PRIORITIES.includes(normalized as Priority)) {
    throw new Error(`Invalid priority: ${value}`);
  }
  return normalized as Priority;
}

function normalizeTaskStatus(value: string | null | undefined, communicationType: CommunicationType): TaskStatus | null {
  const isTaskType = TASK_TYPES.includes(communicationType as typeof TASK_TYPES[number]);

  if (!value && isTaskType) {
    return "PENDING";
  }

  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase();
  if (!TASK_STATUSES.includes(normalized as TaskStatus)) {
    throw new Error(`Invalid taskStatus: ${value}`);
  }

  return normalized as TaskStatus;
}

function buildNotificationTitle(communicationType: CommunicationType) {
  switch (communicationType) {
    case "ANESTHESIA_REVIEW":
      return "Anesthesia consent review required";
    case "SURGEON_REVIEW":
      return "Surgeon consent review required";
    case "LEGAL_REVIEW":
      return "Legal review required";
    case "TASK":
      return "Consent collaboration task";
    case "MENTION":
      return "You were mentioned in a consent case";
    default:
      return "Consent collaboration update";
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("caseId");
    const tenantId = searchParams.get("tenantId");

    if (!caseId || !tenantId) {
      return badRequest("caseId and tenantId are required.");
    }

    const events = await prisma.caseStepEvent.findMany({
      where: {
        caseId,
        tenantId,
        communicationType: {
          in: [...COMMUNICATION_TYPES],
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ok: true, events });
  } catch (error) {
    console.error("[consent-collaboration][GET]", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load consent collaboration timeline." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CollaborationBody;

    if (!body.caseId) return badRequest("caseId is required.");
    if (!body.tenantId) return badRequest("tenantId is required.");
    if (!body.actorUserId) return badRequest("actorUserId is required.");

    const communicationType = normalizeCommunicationType(body.communicationType);
    const visibility = normalizeVisibility(body.visibility);
    const priority = normalizePriority(body.priority);
    const taskStatus = normalizeTaskStatus(body.taskStatus, communicationType);

    const isTaskType = TASK_TYPES.includes(communicationType as typeof TASK_TYPES[number]);

    if (!body.message && !isTaskType) {
      return badRequest("message is required.");
    }

    if (isTaskType && !body.mentionedUserId) {
      return badRequest("mentionedUserId is required for task/review communication types.");
    }

    const action = body.action || `CONSENT_COLLABORATION_${communicationType}`;

    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    if (body.dueAt && Number.isNaN(dueAt?.getTime())) {
      return badRequest("dueAt must be a valid date.");
    }

    const event = await prisma.caseStepEvent.create({
      data: {
        tenantId: body.tenantId,
        caseId: body.caseId,
        stepCode: "consent_collaboration",
        stageCode: "informed_consent",
        action,
        actorUserId: body.actorUserId,
        actorDepartment: body.actorDepartment as any,
        communicationType,
        message: body.message || null,
        mentionedUserId: body.mentionedUserId || null,
        taskStatus,
        visibility,
        priority,
        dueAt,
        newValue: {
          communicationType,
          message: body.message || null,
          mentionedUserId: body.mentionedUserId || null,
          taskStatus,
          visibility,
          priority,
          dueAt: dueAt ? dueAt.toISOString() : null,
        },
      },
    });

    if (body.mentionedUserId) {
      await prisma.operationNotification.create({
        data: {
          tenantId: body.tenantId,
          caseId: body.caseId,
          recipientUserId: body.mentionedUserId,
          triggeredByUserId: body.actorUserId,
          eventType: `CONSENT_COLLABORATION_${communicationType}`,
          title: buildNotificationTitle(communicationType),
          message: body.message || "You have a pending consent collaboration task.",
          metadata: {
            communicationEventId: event.id,
            communicationType,
            taskStatus,
            priority,
            dueAt: dueAt ? dueAt.toISOString() : null,
          },
        },
      });
    }

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    console.error("[consent-collaboration][POST]", error);

    if (error instanceof Error && error.message.startsWith("Invalid")) {
      return badRequest(error.message);
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create consent collaboration event." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as PatchBody;

    if (!body.eventId) return badRequest("eventId is required.");
    if (!body.tenantId) return badRequest("tenantId is required.");
    if (!body.taskStatus) return badRequest("taskStatus is required.");

    const normalizedStatus = body.taskStatus.toUpperCase();
    if (!TASK_STATUSES.includes(normalizedStatus as TaskStatus)) {
      return badRequest(`Invalid taskStatus: ${body.taskStatus}`);
    }

    const completedAt = normalizedStatus === "COMPLETED" ? new Date() : null;

    const updateResult = await prisma.caseStepEvent.updateMany({
      where: {
        id: body.eventId,
        tenantId: body.tenantId,
      },
      data: {
        taskStatus: normalizedStatus,
        completedAt,
        newValue: {
          taskStatus: normalizedStatus,
          completedAt: completedAt ? completedAt.toISOString() : null,
          message: body.message || null,
        },
      },
    });

    if (updateResult.count === 0) {
      return notFound("Collaboration event was not found for the provided tenant.");
    }

    const event = await prisma.caseStepEvent.findFirst({
      where: {
        id: body.eventId,
        tenantId: body.tenantId,
      },
    });

    return NextResponse.json({ ok: true, event });
  } catch (error) {
    console.error("[consent-collaboration][PATCH]", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update consent collaboration task." },
      { status: 500 },
    );
  }
}