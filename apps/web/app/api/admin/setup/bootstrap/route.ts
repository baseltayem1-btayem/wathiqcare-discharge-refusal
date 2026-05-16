import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getSetupStatus, ensureImcBootstrap } from "@/lib/server/admin-bootstrap";
import { requirePlatformAccess } from "@/lib/server/auth";
import { toJsonSafe } from "@/lib/server/json";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BootstrapPayload = {
    adminEmail?: string;
    adminFullName?: string;
    password?: string;
    setupSecret?: string;
};

const PASSWORD_MIN_LENGTH = 12;

function validateBootstrapPayload(body: BootstrapPayload): { email: string; fullName: string; password: string } {
    const email = (body.adminEmail ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
        throw new ApiError(400, "adminEmail is required and must be a valid email address");
    }

    const fullName = (body.adminFullName ?? "").trim();
    if (!fullName) {
        throw new ApiError(400, "adminFullName is required");
    }

    const password = body.password ?? "";
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
        throw new ApiError(400, `password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }

    return { email, fullName, password };
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json().catch(() => null)) as BootstrapPayload | null;
        if (!body || typeof body !== "object") {
            throw new ApiError(400, "Invalid JSON body");
        }

        // Determine whether this call may proceed without platform auth.
        // Allow unauthenticated bootstrap only when the system is not yet initialized.
        const status = await getSetupStatus();
        const allowedWithoutAuth = !status.initialized;

        // If ADMIN_SETUP_SECRET is configured, require it even when uninitialized.
        const configuredSecret = process.env.ADMIN_SETUP_SECRET;
        if (configuredSecret) {
            const provided = (body.setupSecret ?? "").trim();
            if (!provided || provided !== configuredSecret) {
                throw new ApiError(403, "Invalid or missing setup secret");
            }
        }

        // If already initialized, require platform auth (idempotent re-bootstrap is still useful).
        if (!allowedWithoutAuth) {
            await requirePlatformAccess(request);
        }

        const { email, fullName, password } = validateBootstrapPayload(body);

        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const result = await ensureImcBootstrap({
            adminEmail: email,
            adminFullName: fullName,
            passwordHash,
        });

        return NextResponse.json({
            success: true,
            bootstrapped: true,
            tenantId: result.tenant.id,
            tenantCode: result.tenant.code,
            adminUserId: result.superAdmin.id,
            adminEmail: result.superAdmin.email,
            subscriptionId: result.subscription.id,
            subscriptionStatus: result.subscription.status,
            seatLimit: result.subscription.seatLimit,
            message: "Platform bootstrap complete. You can now log in with the admin credentials.",
        });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function GET(request: NextRequest) {
    try {
        await requirePlatformAccess(request);
        const status = await getSetupStatus();
        return NextResponse.json(toJsonSafe(status));
    } catch (error) {
        return handleApiError(error);
    }
}
