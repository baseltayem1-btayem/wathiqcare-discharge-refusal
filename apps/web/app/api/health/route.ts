import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

type ServiceStatus = "up" | "down" | "degraded";
type HealthStatus = "healthy" | "degraded" | "down";

type HealthService = {
    name: string;
    status: ServiceStatus;
    responseTime: number;
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

async function runTimedCheck(check: () => Promise<ServiceStatus>): Promise<{ status: ServiceStatus; responseTime: number }> {
    const startTime = performance.now();
    try {
        const status = await check();
        const responseTime = performance.now() - startTime;
        return { status, responseTime };
    } catch {
        const responseTime = performance.now() - startTime;
        return { status: "down", responseTime };
    }
}

export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);
        const prisma = getPrisma();
        const now = new Date().toISOString();

        const dbCheck = await runTimedCheck(async () => {
            await prisma.$queryRaw`SELECT 1`;
            return "up";
        });

        if (dbCheck.status === "up" && dbCheck.responseTime > 500) {
            dbCheck.status = "degraded";
        }

        const connectorCheck = await runTimedCheck(async () => {
            const connectorRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count FROM connectors`;
            return connectorRows[0]?.count ? "up" : "down";
        });

        const billingCheck = await runTimedCheck(async () => {
            const billingRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count FROM invoices`;
            return billingRows[0]?.count ? "up" : "down";
        });

        const services: HealthService[] = [
            {
                name: "Database",
                status: dbCheck.status,
                responseTime: dbCheck.responseTime,
                lastChecked: now,
            },
            {
                name: "Integrations",
                status: connectorCheck.status,
                responseTime: connectorCheck.responseTime,
                lastChecked: now,
            },
            {
                name: "Billing",
                status: billingCheck.status,
                responseTime: billingCheck.responseTime,
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
