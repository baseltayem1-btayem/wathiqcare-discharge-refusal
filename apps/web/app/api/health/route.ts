import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { runDbOperation } from "@/lib/server/db-resilience";

export async function GET() {
    const startedAt = Date.now();

    try {
        await runDbOperation(
            () => getPrisma().$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`,
            {
                operationName: "health_db_ping",
                timeoutMs: Number(process.env.HEALTH_DB_TIMEOUT_MS || 2000),
                maxRetries: 0,
            },
        );

        return NextResponse.json({
            status: "ok",
            service: "frontend",
            role: "api-proxy-host",
            backendHealth: "not_checked_here",
            database: {
                status: "ok",
                latencyMs: Date.now() - startedAt,
            },
        });
    } catch {
        return NextResponse.json(
            {
                status: "degraded",
                service: "frontend",
                role: "api-proxy-host",
                backendHealth: "not_checked_here",
                database: {
                    status: "unavailable",
                    latencyMs: Date.now() - startedAt,
                },
            },
            { status: 503 },
        );
    }
}
