import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

type AuditLogListItem = {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    resource: string;
    resourceId?: string;
    status: "success" | "failure";
};

function deriveStatus(action: string, details?: string | null): "success" | "failure" {
    const haystack = `${action} ${details ?? ""}`.toLowerCase();

    if (
        haystack.includes("denied") ||
        haystack.includes("failed") ||
        haystack.includes("error")
    ) {
        return "failure";
    }

    return "success";
}

function parseLimit(value: string | null): number {
    const parsed = Number(value ?? "100");

    if (!Number.isFinite(parsed)) {
        return 100;
    }

    return Math.min(Math.max(parsed, 1), 200);
}

export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);

        const prisma = getPrisma();

        const url = new URL(request.url);
        const limit = parseLimit(url.searchParams.get("limit"));
        const search = (url.searchParams.get("search") ?? "").trim();

        const logs = await getPrisma().auditLog.findMany({
            where: search
                ? {
                      OR: [
                          { action: { contains: search, mode: "insensitive" } },
                          { entityType: { contains: search, mode: "insensitive" } },
                          { entityId: { contains: search, mode: "insensitive" } },
                          { details: { contains: search, mode: "insensitive" } },
                      ],
                  }
                : undefined,
            include: {
                user: {
                    select: {
                        email: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        const result: AuditLogListItem[] = logs.map((log) => ({
            id: log.id,
            timestamp: log.createdAt.toISOString(),
            actor: log.user?.fullName || log.user?.email || log.userId || "system",
            action: log.action,
            resource: log.entityType,
            resourceId: log.entityId ?? undefined,
            status: deriveStatus(log.action, log.details),
        }));

        return NextResponse.json(toJsonSafe(result));
    } catch (error) {
        return handleApiError(error);
    }
}
