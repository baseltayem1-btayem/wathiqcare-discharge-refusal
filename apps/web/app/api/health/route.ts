import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/server/prisma";

type ServiceStatus = "up" | "down" | "degraded";
type HealthStatus = "healthy" | "degraded" | "down";

type HealthService = {
    name: string;
    status: ServiceStatus;
    responseTime?: number;
    lastChecked: string;
};

function aggregateStatus(services: HealthService[]): HealthStatus {
    if (services.some((service) => service.status === "down")) {
        return "down";
    }
    if (services.some((service) => service.status === "degraded")) {
        return "degraded";
    }
    return "healthy";
}

export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);

        const now = new Date().toISOString();

        const dbStart = Date.now();
        let dbStatus: ServiceStatus = "up";
        try {
            await prisma.$queryRaw`SELECT 1`;
            const dbResponseTime = Date.now() - dbStart;
            dbStatus = dbResponseTime > 500 ? "degraded" : "up";
        } catch {
            dbStatus = "down";
        }

        const connectorStart = Date.now();
        let connectorStatus: ServiceStatus = "up";
        try {
            const connectorRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*)::bigint AS count
                FROM integration_connectors
                WHERE enabled = TRUE
            `;
            const enabledCount = Number(connectorRows[0]?.count ?? 0);
            const connectorResponseTime = Date.now() - connectorStart;
            if (connectorResponseTime > 500 || enabledCount === 0) {
                connectorStatus = "degraded";
            }
        } catch {
            connectorStatus = "down";
        }

        const billingStart = Date.now();
        let billingStatus: ServiceStatus = "up";
        try {
            await prisma.invoice.count();
            const billingResponseTime = Date.now() - billingStart;
            billingStatus = billingResponseTime > 500 ? "degraded" : "up";
        } catch {
            billingStatus = "down";
        }

        const services: HealthService[] = [
            {
                name: "Database",
                status: dbStatus,
                responseTime: Date.now() - dbStart,
                lastChecked: now,
            },
            {
                name: "Integrations",
                status: connectorStatus,
                responseTime: Date.now() - connectorStart,
                lastChecked: now,
            },
            {
                name: "Billing",
                status: billingStatus,
                responseTime: Date.now() - billingStart,
                lastChecked: now,
            },
        ];

        const response = {
            status: aggregateStatus(services),
            services,
            uptime: Math.max(0, Math.min(1, process.uptime() / (process.uptime() + 60))),
            timestamp: now,
        };

        return NextResponse.json(toJsonSafe(response));
    } catch (error) {
        return handleApiError(error);
    }
}
