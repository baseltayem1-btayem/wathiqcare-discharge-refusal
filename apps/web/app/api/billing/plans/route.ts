import { PlanCode, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
import { getPrisma } from "@/lib/server/prisma";

function parsePlanCode(value: unknown): PlanCode {
    if (typeof value !== "string") {
        throw new ApiError(400, "plan code is required");
    }

    const normalized = value.toUpperCase();
    if (!Object.values(PlanCode).includes(normalized as PlanCode)) {
        throw new ApiError(400, "invalid plan code");
    }

    return normalized as PlanCode;
}

export async function GET(request: NextRequest) {
try {
    const prisma = getPrisma();
    await requirePlatformAccess(request);

    const plans = await getPrisma().plan.findMany({
        orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(toJsonSafe(plans));
} catch (error) {
    return handleApiError(error);
}
}

export async function POST(request: NextRequest) {
try {
    const prisma = getPrisma();
    await requirePlatformAccess(request);

    const payload = (await request.json().catch(() => null)) as
        | {
            code?: string;
            name?: string;
            description?: string | null;
            seatLimit?: number;
            priceMonthlyCents?: number;
            priceYearlyCents?: number;
            isActive?: boolean;
            features?: Record<string, unknown>;
        }
        | null;

    if (!payload) {
        throw new ApiError(400, "Invalid JSON body");
    }

    const code = parsePlanCode(payload.code);
    const name = payload.name?.trim();
    if (!name) {
        throw new ApiError(400, "plan name is required");
    }

    const seatLimit = Math.max(1, Math.floor(Number(payload.seatLimit ?? 5)));
    const monthly = Math.max(0, Math.floor(Number(payload.priceMonthlyCents ?? 0)));
    const yearly = Math.max(0, Math.floor(Number(payload.priceYearlyCents ?? 0)));
    const features = (payload.features ?? {}) as Prisma.InputJsonValue;

    const plan = await getPrisma().plan.upsert({
        where: { code },
        update: {
            name,
            description: payload.description ?? null,
            seatLimit,
            priceMonthlyCents: monthly,
            priceYearlyCents: yearly,
            isActive: payload.isActive ?? true,
            features,
        },
        create: {
            code,
            name,
            description: payload.description ?? null,
            seatLimit,
            priceMonthlyCents: monthly,
            priceYearlyCents: yearly,
            isActive: payload.isActive ?? true,
            features,
        },
    });

    return NextResponse.json(toJsonSafe(plan), { status: 201 });
} catch (error) {
    return handleApiError(error);
}
}
