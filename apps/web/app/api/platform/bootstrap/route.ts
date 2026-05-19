import { UserType } from "@/lib/server/prisma-enums";
import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

type BootstrapPayload = {
    email?: string;
    secret?: string;
    level?: string;
};

function normalizeEmail(value?: string): string {
    return (value ?? "").trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function secureEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i += 1) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

/**
 * POST /api/platform/bootstrap
 * One-time endpoint to promote an existing user to platform_admin.
 * Protected by a BOOTSTRAP_SECRET environment variable.
 * Body: { "email": "user@example.com", "secret": "<BOOTSTRAP_SECRET>", "level": "admin" | "superadmin" }
 * Returns: { email, role, userType, isActive, confirmation }
 */
export async function POST(request: NextRequest) {
    try {
        const prisma = getPrisma();
        const bootstrapSecret = (process.env.BOOTSTRAP_SECRET ?? "").trim();
        if (!bootstrapSecret) {
            throw new ApiError(404, "Not found");
        }
        const body = (await request.json().catch(() => null)) as BootstrapPayload | null;

        if (!body) {
            throw new ApiError(400, "Invalid JSON body");
        }

        const { email: emailInput, secret, level } = body;

        // Constant-time string comparison to prevent timing attacks
        if (!secret || !secureEquals(secret, bootstrapSecret)) {
            throw new ApiError(403, "Invalid bootstrap secret");
        }

        const email = normalizeEmail(emailInput);
        if (!isValidEmail(email)) {
            throw new ApiError(400, "A valid email address is required");
        }

        const role = level === "superadmin" ? "platform_superadmin" : "platform_admin";

        // ── 2. Verify the user exists ──────────────────────────────────────
        const existing = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                tenantId: true,
            },
        });

        if (!existing) {
            throw new ApiError(404, `No user found with email: ${email}`);
        }

        // ── 3. Promote: update role, is_active, user_type ─────────────────
        const updated = await prisma.user.update({
            where: { id: existing.id },
            data: {
                role,
                isActive: true,
                userType: UserType.PLATFORM_ADMIN,
                status: "active",
                failedLoginAttempts: 0,
                lockedUntil: null,
            },
            select: {
                id: true,
                email: true,
                role: true,
                isActive: true,
                userType: true,
            },
        });

        if (existing.tenantId) {
            try {
                await prisma.tenantMembership.updateMany({
                    where: {
                        userId: existing.id,
                        tenantId: existing.tenantId,
                        status: { not: "ACTIVE" as never },
                    },
                    data: { status: "ACTIVE" as never },
                });
            } catch {
                // Non-critical for platform admin bootstrap flow.
            }
        }

        // ── 4. Ensure tenant membership is ACTIVE (non-blocking) ──────────
        try {
            await prisma.tenantMembership.updateMany({
                where: {
                    userId: existing.id,
                    tenantId: existing.tenantId,
                    status: { not: "ACTIVE" as never },
                },
                data: { status: "ACTIVE" as never },
            });
        } catch {
            // Non-critical for platform admin authentication flow
        }

        // ── 5. Return confirmation ─────────────────────────────────────────
        return NextResponse.json({
            email: updated.email,
            role: updated.role,
            userType: updated.userType,
            isActive: updated.isActive,
            accessGranted: true,
            platformRoutes: "/platform/*",
            confirmation:
                `User ${updated.email} has been promoted to ${role}. ` +
                `Log out and log back in to receive a new JWT with user_type="platform_admin". ` +
                `The middleware will then grant access to all /platform/* routes.`,
        });
    } catch (error) {
        return handleApiError(error);
    }
}
