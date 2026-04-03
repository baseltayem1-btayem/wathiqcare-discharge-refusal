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

type TimedCheckResult = {
    status: ServiceStatus;
    responseTime: number;
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

async function runTimedCheck(
    check: () => Promise<ServiceStatus>,
): Promise<TimedCheckResult> {
    const startedAt = Date.now();

    try {
        const status = await check();

        return {
            status,
            responseTime: Date.now() - startedAt,
        };
    } catch {
        return {
            status: "down",
            responseTime: Date.now() - startedAt,
        };
    }
}

export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);

        const prisma = getPrisma();
        const now = new Date().toISOString();

        const dbCheck = await runTimedCheck(async () => {
            await getPrisma().$queryRaw`SELECT 1`;
            return "up";
        });

        if (dbCheck.status === "up" && dbCheck.responseTime > 500) {
            dbCheck.status = "degraded";
        }

        const connectorCheck = await runTimedCheck(async () => {
            const connectorRows = await getPrisma().$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*)::bigint AS count
                FROM integration_connectors
                WHERE enabled = TRUE
            `;

            const enabledCount = Number(connectorRows[0]?.count ?? 0);

            if (enabledCount === 0) {
                return "degraded";
            }

            return "up";
        });

        if (connectorCheck.status === "up" && connectorCheck.responseTime > 500) {
            connectorCheck.status = "degraded";
        }

        const billingCheck = await runTimedCheck(async () => {
            await getPrisma().invoice.count();
            return "up";
        });

        if (billingCheck.status === "up" && billingCheck.responseTime > 500) {
            billingCheck.status = "degraded";
        }

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
            uptime: Math.max(
                0,
                Math.min(1, process.uptime() / (process.uptime() + 60)),
            ),
            timestamp: now,
        };

        return NextResponse.json(toJsonSafe(response));
    } catch (error) {
        return handleApiError(error);
    }
}
