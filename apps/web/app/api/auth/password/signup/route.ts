import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ApiError, handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { normalizeEmail, extractDomain, hasAnyActiveTenantForDomain } from "@/lib/server/auth-domain-policy";
import { hashPassword, validatePasswordStrength } from "@/lib/server/password";

type PasswordSignupPayload = {
    email?: string;
    password?: string;
    fullName?: string;
};

<<<<<<< HEAD
export async function POST(request: NextRequest) {
=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
try {
    const prisma = getPrisma();
    const payload = (await request.json().catch(() => null)) as PasswordSignupPayload | null;
    if (!payload) {
        throw new ApiError(400, "Invalid JSON body");
    }

    const { email: emailInput, password, fullName } = payload;
    const email = normalizeEmail(emailInput || "");

    if (!email || !password || !fullName) {
        throw new ApiError(400, "Email, password, and full name are required");
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
        throw new ApiError(400, passwordValidation.errors.join("; "));
    }

    // Check if email already exists
<<<<<<< HEAD
    const existingUser = await getPrisma().user.findUnique({
=======
    const existingUser = await prisma.user.findUnique({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        where: { email },
        select: { id: true },
    });

    if (existingUser) {
        throw new ApiError(409, "An account with this email already exists");
    }

    // Extract domain and find tenant
    const domain = extractDomain(email);
    if (!domain) {
        throw new ApiError(400, "Invalid email domain");
    }

    // Check if there's an active tenant for this domain
    const hasTenant = await hasAnyActiveTenantForDomain(domain);
    if (!hasTenant) {
        throw new ApiError(403, "Organization for this email domain is not found or not active");
    }

    // Find default tenant for domain
<<<<<<< HEAD
    const tenantRows = await getPrisma().$queryRaw<Array<{ id: string; code: string }>>`
=======
    const tenantRows = await prisma.$queryRaw<Array<{ id: string; code: string }>>`
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      SELECT DISTINCT t.id, t.code
      FROM tenants t
      INNER JOIN tenant_allowed_domains tad ON tad.tenant_id = t.id
      WHERE LOWER(tad.domain) = ${domain} AND t.is_active = TRUE
      LIMIT 1
    `;

    if (!tenantRows[0]) {
        throw new ApiError(403, "No active organization found for this domain");
    }

    const tenant = tenantRows[0];

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with email_verification_required status
    const userId = crypto.randomUUID();
<<<<<<< HEAD
    await getPrisma().$executeRaw`
=======
    await prisma.$executeRaw`
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      INSERT INTO users (
        id,
        tenant_id,
        email,
        full_name,
        hashed_password,
        email_verified,
        is_active,
        user_type,
        role
      )
      VALUES (
        ${userId},
        ${tenant.id},
        ${email},
        ${fullName},
        ${hashedPassword},
        FALSE,
        TRUE,
        'TENANT_USER',
        'MEMBER'
      )
    `;

    // Create default membership
    const membershipId = crypto.randomUUID();
<<<<<<< HEAD
    await getPrisma().$executeRaw`
=======
    await prisma.$executeRaw`
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
      INSERT INTO tenant_memberships (
        id,
        tenant_id,
        user_id,
        role,
        status,
        created_at
      )
      VALUES (
        ${membershipId},
        ${tenant.id},
        ${userId},
        'MEMBER',
        'ACTIVE',
        NOW()
      )
    `;

    // Send verification email request
    try {
        await fetch(`${request.nextUrl.origin}/api/auth/email/verify-request`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
        });
    } catch (error) {
        console.error("Failed to send verification email:", error);
    }

    return NextResponse.json({
        message: "Account created successfully. Please check your email to verify your account.",
        email,
        userId,
        tenantId: tenant.id,
    }, { status: 201 });
} catch (error) {
    return handleApiError(error);
}
}
