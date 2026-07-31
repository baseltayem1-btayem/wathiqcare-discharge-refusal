import { NextRequest, NextResponse } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";

export type TimelineEvent = {
  id: string;
  type:
    | "consent_dispatched"
    | "patient_opened"
    | "otp_verified"
    | "signed"
    | "refused"
    | "physician_review"
    | "system";
  actor: "physician" | "patient" | "system";
  actorName: string;
  timestamp: string;
  status: "completed";
  summaryEn: string;
  summaryAr: string;
  evidenceHash?: undefined;
};

export type TimelineDependencies = {
  requireModuleOperationalAccess: (
    request: NextRequest,
    moduleKey: "informed-consents",
  ) => Promise<AuthContext>;
  getPrisma: () => {
    auditChainEvent: {
      findMany: (args: {
        where: {
          tenantId: string;
          caseId?: string;
          metadataJson?: { path: ["documentId"]; equals: string };
        };
        select: {
          id: boolean;
          eventType: boolean;
          actorId: boolean;
          actorRole: boolean;
          payloadSummary: boolean;
          createdAt: boolean;
        };
        orderBy: { createdAt: "desc" };
        take: number;
      }) => Promise<
        Array<{
          id: string;
          eventType: string;
          actorId: string | null;
          actorRole: string | null;
          payloadSummary: string | null;
          createdAt: Date;
        }>
      >;
    };
  };
};

function mapEventType(
  eventType: string,
):
  | "consent_dispatched"
  | "patient_opened"
  | "otp_verified"
  | "signed"
  | "refused"
  | "physician_review"
  | "system" {
  const lower = eventType.toLowerCase();
  if (lower.includes("send") || lower.includes("created")) return "consent_dispatched";
  if (lower.includes("otp")) return "otp_verified";
  if (lower.includes("accept")) return "signed";
  if (lower.includes("refus")) return "refused";
  if (lower.includes("open") || lower.includes("view")) return "patient_opened";
  if (lower.includes("review")) return "physician_review";
  return "system";
}

function mapActor(actorRole: string | null): "physician" | "patient" | "system" {
  if (!actorRole) return "system";
  const lower = actorRole.toLowerCase();
  if (lower.includes("physician") || lower.includes("doctor")) return "physician";
  if (lower.includes("patient")) return "patient";
  return "system";
}

export async function handleTimelineRequest(
  request: NextRequest,
  deps: TimelineDependencies,
): Promise<Response> {
  try {
    const auth = await deps.requireModuleOperationalAccess(request, "informed-consents");
    const { searchParams } = new URL(request.url);
    const tenantId = auth.tenant_id || "";
    const caseId = searchParams.get("caseId") || undefined;
    const documentId = searchParams.get("documentId") || undefined;

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant context" }, { status: 400 });
    }

    const prisma = deps.getPrisma();

    const events = await prisma.auditChainEvent.findMany({
      where: {
        tenantId,
        ...(caseId ? { caseId } : {}),
        ...(documentId ? { metadataJson: { path: ["documentId"], equals: documentId } } : {}),
      },
      select: {
        id: true,
        eventType: true,
        actorId: true,
        actorRole: true,
        payloadSummary: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const mapped: TimelineEvent[] = events.map((event) => {
      const type = mapEventType(event.eventType);
      return {
        id: event.id,
        type,
        actor: mapActor(event.actorRole),
        actorName:
          event.actorRole === "physician"
            ? "Physician"
            : event.actorRole === "patient"
              ? "Patient"
              : "System",
        timestamp: event.createdAt.toISOString(),
        status: "completed" as const,
        summaryEn: event.payloadSummary || event.eventType,
        summaryAr: event.payloadSummary || event.eventType,
        evidenceHash: undefined,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    return handleApiError(error);
  }
}
