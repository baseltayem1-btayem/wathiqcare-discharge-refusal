import { NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/server/backendProxy";

const BACKEND_UNAVAILABLE_DETAIL = "الخدمة الخلفية غير متاحة حالياً. يرجى المحاولة لاحقاً.";

type HealthPayload = {
    ok: boolean;
    status?: number;
    code?: string;
    detail?: string;
};

function getRecordValue(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function readJsonSafely(response: Response): Promise<Record<string, unknown> | null> {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        return null;
    }

    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
        return null;
    }

    return payload as Record<string, unknown>;
}

function buildHealthResponse(backend: HealthPayload) {
    return NextResponse.json(
        {
            ok: backend.ok,
            service: "frontend-next",
            timestamp: new Date().toISOString(),
            checks: {
                frontend: { ok: true },
                backend,
            },
        },
        {
            status: backend.ok ? 200 : 503,
            headers: {
                "Cache-Control": "no-store",
            },
        },
    );
}

export async function buildFrontendHealthResponse(requestHost?: string) {
    const built = buildBackendUrl("/api/health/ready", requestHost);
    if (!built.ok) {
        const payload = await readJsonSafely(built.response);
        return buildHealthResponse({
            ok: false,
            status: built.response.status,
            code: payload ? getRecordValue(payload, "code") : "backend_unavailable",
            detail: payload ? getRecordValue(payload, "detail") : BACKEND_UNAVAILABLE_DETAIL,
        });
    }

    try {
        const backendResponse = await fetch(built.url, {
            method: "GET",
            headers: {
                accept: "application/json",
            },
            cache: "no-store",
        });

        const payload = await readJsonSafely(backendResponse);

        return buildHealthResponse({
            ok: backendResponse.ok,
            status: backendResponse.status,
            code: payload ? getRecordValue(payload, "code") : undefined,
            detail: payload ? getRecordValue(payload, "detail") : undefined,
        });
    } catch {
        return buildHealthResponse({
            ok: false,
            status: 503,
            code: "backend_unreachable",
            detail: BACKEND_UNAVAILABLE_DETAIL,
        });
    }
}