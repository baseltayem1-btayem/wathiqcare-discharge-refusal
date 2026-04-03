import { UserType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { ApiError, handleApiError } from "@/lib/server/http";
<<<<<<< HEAD
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

=======
import { prisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
/**
 * POST /api/platform/bootstrap
 *
 * One-time endpoint to promote an existing user to platform_admin.
<<<<<<< HEAD
 * Protected by a BOOTSTRAP_SECRET environment variable.
=======
 * Protected by a BOOTSTRAP_SECRET environment variable — only calls
 * that supply the matching secret are honoured.
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
 *
 * Body:
 *   { "email": "user@example.com", "secret": "<BOOTSTRAP_SECRET>", "level": "admin" | "superadmin" }
 *
 * Returns:
 *   { email, role, userType, isActive, confirmation }
<<<<<<< HEAD
 */
export async function POST(request: NextRequest) {
    try {
        const prisma = getPrisma();

        const bootstrapSecret = (process.env.BOOTSTRAP_SECRET ?? "").trim();
        if (!bootstrapSecret) {
            throw new ApiError(404, "Not found");
        }

        const body = (await request.json().catch(() => null)) as BootstrapPayload | null;
=======
 *
 * Environment variables required (set in Railway / Vercel):
 *   BOOTSTRAP_SECRET  – arbitrary secret string; keep it private
 *
 * SECURITY NOTES:
 *  - This endpoint does NOT require an existing session; it relies on
 *    the BOOTSTRAP_SECRET token.  Set a strong random value and remove
 *    (or rotate) BOOTSTRAP_SECRET after use.
 *  - Disabled automatically when BOOTSTRAP_SECRET is not set.
 */
export async function POST(request: NextRequest) {
    try {
        // ── 1. Guard: BOOTSTRAP_SECRET must be set and match ──────────────
        const bootstrapSecret = (process.env.BOOTSTRAP_SECRET || "").trim();
        if (!bootstrapSecret) {
            // Endpoint is disabled when BOOTSTRAP_SECRET is not configured.
            throw new ApiError(404, "Not found");
        }

        const body = (await request.json().catch(() => null)) as {
            email?: string;
            secret?: string;
            level?: string;
        } | null;

>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!body) {
            throw new ApiError(400, "Invalid JSON body");
        }

<<<<<<< HEAD
        const email = normalizeEmail(body.email);
        const secret = (body.secret ?? "").trim();
        const level = (body.level ?? "").trim().toLowerCase();

        if (!secureEquals(secret, bootstrapSecret)) {
            throw new ApiError(403, "Invalid bootstrap secret");
        }

        if (!email || !isValidEmail(email)) {
=======
        const { email: emailInput, secret, level } = body;

        // Constant-time string comparison to prevent timing attacks
        if (!secret || secret.length !== bootstrapSecret.length || secret !== bootstrapSecret) {
            throw new ApiError(403, "Invalid bootstrap secret");
        }

        const email = (emailInput || "").trim().toLowerCase();
        if (!email || !email.includes("@")) {
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            throw new ApiError(400, "A valid email address is required");
        }

        const role = level === "superadmin" ? "platform_superadmin" : "platform_admin";

<<<<<<< HEAD
        const existing = await getPrisma().user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: "insensitive",
                },
            },
=======
        // ── 2. Verify the user exists ──────────────────────────────────────
        const existing = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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

<<<<<<< HEAD
        const updated = await getPrisma().user.update({
=======
        // ── 3. Promote: update role, is_active, user_type ─────────────────
        const updated = await prisma.user.update({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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

<<<<<<< HEAD
        if (existing.tenantId) {
            try {
                await getPrisma().tenantMembership.updateMany({
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

=======
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
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
    } catch (error) {
        return handleApiError(error);
=======
    } catch (err) {
        return handleApiError(err);
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    }
}
