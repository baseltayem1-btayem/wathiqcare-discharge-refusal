import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e

type ServiceStatus = "up" | "down" | "degraded";
type HealthStatus = "healthy" | "degraded" | "down";

type HealthService = {
    name: string;
    status: ServiceStatus;
<<<<<<< HEAD
    responseTime: number;
    lastChecked: string;
};

type TimedCheckResult = {
    status: ServiceStatus;
    responseTime: number;
};

=======
    responseTime?: number;
    lastChecked: string;
};

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
function aggregateStatus(services: HealthService[]): HealthStatus {
    if (services.some((service) => service.status === "down")) {
        return "down";
    }
<<<<<<< HEAD

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

=======
    if (services.some((service) => service.status === "degraded")) {
        return "degraded";
    }
    return "healthy";
}

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);

<<<<<<< HEAD
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
=======
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                SELECT COUNT(*)::bigint AS count
                FROM integration_connectors
                WHERE enabled = TRUE
            `;
<<<<<<< HEAD

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
=======
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        }

        const services: HealthService[] = [
            {
                name: "Database",
<<<<<<< HEAD
                status: dbCheck.status,
                responseTime: dbCheck.responseTime,
=======
                status: dbStatus,
                responseTime: Date.now() - dbStart,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                lastChecked: now,
            },
            {
                name: "Integrations",
<<<<<<< HEAD
                status: connectorCheck.status,
                responseTime: connectorCheck.responseTime,
=======
                status: connectorStatus,
                responseTime: Date.now() - connectorStart,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                lastChecked: now,
            },
            {
                name: "Billing",
<<<<<<< HEAD
                status: billingCheck.status,
                responseTime: billingCheck.responseTime,
=======
                status: billingStatus,
                responseTime: Date.now() - billingStart,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
                lastChecked: now,
            },
        ];

        const response = {
            status: aggregateStatus(services),
            services,
<<<<<<< HEAD
            uptime: Math.max(
                0,
                Math.min(1, process.uptime() / (process.uptime() + 60)),
            ),
=======
            uptime: Math.max(0, Math.min(1, process.uptime() / (process.uptime() + 60))),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            timestamp: now,
        };

        return NextResponse.json(toJsonSafe(response));
    } catch (error) {
        return handleApiError(error);
    }
}
