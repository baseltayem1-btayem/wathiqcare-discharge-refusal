import crypto from "node:crypto";
import { UserType } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import {
  evaluatePostAuthSnapshot,
  extractDomain,
  hasAnyActiveTenantForDomain,
  isTenantDomainAllowed,
  PostAuthAccessError,
} from "@/lib/server/auth-domain-policy";
import {
  createAccessToken,
  getJwtSecret,
  getTokenTtlSeconds,
} from "@/lib/server/auth-token";
import { getPrisma } from "@/lib/server/prisma";
import { platformRoleForUserRole, userTypeForUserRole } from "@/lib/server/roles";
import { hashResetToken } from "@/lib/server/password";
import { normalizeTenantAuthConfig } from "@/lib/server/tenant-auth-config";

const MAGIC_LINK_TTL_MINUTES = 10;
const ACTIVE_SUBSCRIPTION_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE"] as const;
type TransactionClient = Parameters<Parameters<ReturnType<typeof getPrisma>["$transaction"]>[0]>[0];

type MagicLinkRequestDecision =
  | "INVALID_EMAIL"
  | "DOMAIN_NOT_ALLOWED"
  | "USER_NOT_FOUND"
  | "USER_DOMAIN_MISMATCH";

type MagicLinkRequestDecisionInput = {
  validEmail: boolean;
  domainAllowed: boolean;
  userExists: boolean;
  userDomainEligible: boolean;
};

type MagicLinkRequestUser = {
  id: string;
  email: string;
  fullName: string;
  tenantId: string;
  role: string;
  userType: UserType;
  isActive: boolean;
};

type MagicLinkVerifiedUser = {
  id: string;
  email: string;
  tenant_id: string;
  role: string;
};

type MagicLinkSession = {
  accessToken: string;
  redirectTo: string;
  userType: "platform_admin" | "tenant_admin" | "tenant_user";
};

type VerifyMagicLinkResult = {
  user: MagicLinkVerifiedUser;
  session: MagicLinkSession;
};

const POST_AUTH_MESSAGE_BY_CODE = {
  DOMAIN_NOT_ALLOWED: "Your email domain is not authorized for this tenant",
  TENANT_INACTIVE: "Tenant is inactive",
  PENDING_APPROVAL: "Your account is pending administrator approval",
  NO_ROLE_ASSIGNED: "No role assigned to your account",
  NO_LICENSE_ASSIGNED: "No active license assigned to your account",
} as const;

export function evaluateMagicLinkRequestDecision(
  input: MagicLinkRequestDecisionInput,
): MagicLinkRequestDecision | null {
  if (!input.validEmail) {
    return "INVALID_EMAIL";
  }

  if (!input.domainAllowed) {
    return "DOMAIN_NOT_ALLOWED";
  }

  if (!input.userExists) {
    return "USER_NOT_FOUND";
  }

  if (!input.userDomainEligible) {
    return "USER_DOMAIN_MISMATCH";
  }

  return null;
}

function requestDecisionError(decision: MagicLinkRequestDecision): ApiError {
  switch (decision) {
    case "INVALID_EMAIL":
      return new ApiError(400, "Invalid email address");
    case "DOMAIN_NOT_ALLOWED":
      return new ApiError(403, "Domain not allowed");
    case "USER_DOMAIN_MISMATCH":
      return new ApiError(403, "Email domain does not match your tenant policy");
    case "USER_NOT_FOUND":
    default:
      return new ApiError(404, "User not found");
  }
}

function toSessionUserTypeFromStored(
  storedUserType: UserType | null | undefined,
  userRole: string,
  email: string,
): "platform_admin" | "tenant_admin" | "tenant_user" {
  if (storedUserType === UserType.PLATFORM_ADMIN) {
    return "platform_admin";
  }

  if (storedUserType === UserType.TENANT_ADMIN) {
    return "tenant_admin";
  }

  if (storedUserType === UserType.TENANT_USER) {
    return "tenant_user";
  }

  const computedUserType = userTypeForUserRole(userRole, email);
  return computedUserType === "PLATFORM_ADMIN"
    ? "platform_admin"
    : computedUserType === "TENANT_ADMIN"
      ? "tenant_admin"
      : "tenant_user";
}

function buildMagicLinkSession(args: {
  userId: string;
  email: string;
  role: string;
  userType: UserType;
  tenantId: string;
  tenantCode: string | null;
}): MagicLinkSession {
  const ttlSeconds = getTokenTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;
  const sessionUserType = toSessionUserTypeFromStored(args.userType, args.role, args.email);
  const redirectTo = "/modules";

  return {
    accessToken: createAccessToken(
      {
        sub: args.userId,
        user_id: args.userId,
        email: args.email,
        role: args.role,
        user_type: sessionUserType,
        platform_role: platformRoleForUserRole(args.role),
        tenant_id: args.tenantId,
        tenant_code: args.tenantCode,
        exp,
      },
      getJwtSecret(),
    ),
    redirectTo,
    userType: sessionUserType,
  };
}

async function assertMagicLinkAccessAllowed(
  tx: TransactionClient,
  user: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
    userType: UserType;
    status: string;
    isActive: boolean;
    primaryTenant: { code: string; isActive: boolean } | null;
    memberships: Array<{ status: string }>;
  },
): Promise<void> {
  if (user.userType === UserType.PLATFORM_ADMIN) {
    return;
  }

  const domain = extractDomain(user.email);
  const domainAllowed = domain
    ? await tx.$queryRaw<Array<{ tenant_id: string }>>`
        SELECT tenant_id
        FROM tenant_allowed_domains
        WHERE tenant_id = ${user.tenantId}
          AND domain = ${domain}
          AND is_active = TRUE
        LIMIT 1
      `
    : [];

  const subscription = await tx.subscription.findFirst({
    where: {
      tenantId: user.tenantId,
      status: {
        in: [...ACTIVE_SUBSCRIPTION_STATUSES],
      },
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  const denial = evaluatePostAuthSnapshot({
    domainAllowed: domainAllowed.length > 0,
    tenantActive: user.primaryTenant?.isActive === true,
    userActive: user.isActive,
    status: user.status,
    hasRole: Boolean(user.role.trim()),
    hasMembership: user.memberships.length > 0,
    hasLicense: user.memberships.length > 0 && !!subscription,
  });

  if (denial) {
    throw new PostAuthAccessError(
      denial,
      POST_AUTH_MESSAGE_BY_CODE[denial],
      { tenantId: user.tenantId, userId: user.id },
    );
  }
}

function readMagicLinkBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "https://wathiqcare.online";
}

export async function issueMagicLinkForUser(userId: string): Promise<{
  tokenId: string;
  rawToken: string;
  magicUrl: string;
  expiresAt: Date;
  expiresMinutes: number;
}> {
  const prisma = getPrisma();
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(rawToken);
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction(async (tx: TransactionClient) => {
    await tx.$executeRaw`
      UPDATE magic_link_tokens
      SET used = TRUE, used_at = NOW()
      WHERE user_id = ${userId}
        AND used = FALSE
        AND expires_at > NOW()
    `;

    await tx.$executeRaw`
      INSERT INTO magic_link_tokens (id, user_id, token_hash, expires_at, used)
      VALUES (${tokenId}, ${userId}, ${tokenHash}, ${expiresAt}, FALSE)
    `;
  });

  return {
    tokenId,
    rawToken,
    magicUrl: `${readMagicLinkBaseUrl()}/auth/magic?token=${encodeURIComponent(rawToken)}`,
    expiresAt,
    expiresMinutes: MAGIC_LINK_TTL_MINUTES,
  };
}

export const magicLinkAuth = async (email: string): Promise<MagicLinkRequestUser> => {
  const prisma = getPrisma();
  const normalizedEmail = email.trim().toLowerCase();
  const domain = extractDomain(normalizedEmail);
  const domainAllowed = domain ? await hasAnyActiveTenantForDomain(domain) : false;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      fullName: true,
      tenantId: true,
      role: true,
      userType: true,
      isActive: true,
      primaryTenant: {
        select: {
          authConfig: true,
        },
      },
    },
  });

  const tenantAuthConfig = normalizeTenantAuthConfig(user?.primaryTenant?.authConfig);
  if (user && !tenantAuthConfig.secure_link_enabled) {
    throw new ApiError(403, "Secure Link sign-in is disabled for this tenant");
  }

  const isPlatformUser = user?.userType === UserType.PLATFORM_ADMIN;
  const userDomainEligible =
    !!user?.tenantId && !!domain && (isPlatformUser ? true : await isTenantDomainAllowed(user.tenantId, domain));

  const decision = isPlatformUser && user?.isActive && user.tenantId
    ? null
    : evaluateMagicLinkRequestDecision({
        validEmail: !!domain,
        domainAllowed,
        userExists: !!user?.isActive && !!user.tenantId,
        userDomainEligible,
      });

  if (decision) {
    throw requestDecisionError(decision);
  }

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.isActive) {
    throw new ApiError(403, "User inactive");
  }

  if (!user.tenantId) {
    throw new ApiError(400, "Tenant not found");
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    tenantId: user.tenantId,
    role: user.role || "",
    userType: user.userType,
    isActive: user.isActive,
  };
};

export const verifyMagicLink = async (
  rawToken: string,
): Promise<VerifyMagicLinkResult> => {
  const trimmedToken = rawToken.trim();
  if (!trimmedToken) {
    throw new ApiError(400, "Invalid magic link token");
  }

  const tokenHash = hashResetToken(trimmedToken);
  const prisma = getPrisma();

  return prisma.$transaction(async (tx: TransactionClient) => {
    const rows = await tx.$queryRaw<
      Array<{
        id: string;
        user_id: string;
        expires_at: Date;
        used: boolean;
      }>
    >`
      SELECT id, user_id, expires_at, used
      FROM magic_link_tokens
      WHERE token_hash = ${tokenHash}
      FOR UPDATE
    `;

    const token = rows[0];
    if (!token) {
      throw new ApiError(400, "Invalid magic link token");
    }
    if (token.used) {
      throw new ApiError(400, "This magic link has already been used");
    }
    if (token.expires_at.getTime() <= Date.now()) {
      throw new ApiError(400, "This magic link has expired");
    }

    const user = await tx.user.findUnique({
      where: { id: token.user_id },
      select: {
        id: true,
        email: true,
        tenantId: true,
        role: true,
        userType: true,
        status: true,
        isActive: true,
        primaryTenant: {
          select: {
            code: true,
            isActive: true,
            authConfig: true,
          },
        },
        memberships: {
          where: { status: "ACTIVE" },
          select: { status: true },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const tenantAuthConfig = normalizeTenantAuthConfig(user.primaryTenant?.authConfig);
    if (!tenantAuthConfig.secure_link_enabled) {
      throw new ApiError(403, "Secure Link sign-in is disabled for this tenant");
    }

    await assertMagicLinkAccessAllowed(tx, {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role || "",
      userType: user.userType,
      status: user.status,
      isActive: user.isActive,
      primaryTenant: user.primaryTenant,
      memberships: user.memberships,
    });

    await tx.$executeRaw`
      UPDATE magic_link_tokens
      SET used = TRUE, used_at = NOW()
      WHERE id = ${token.id}
    `;

    await tx.$executeRaw`
      UPDATE users
      SET auth_provider = 'local_magic',
          last_login_at = NOW()
      WHERE id = ${user.id}
    `;

    const session = buildMagicLinkSession({
      userId: user.id,
      email: user.email,
      role: user.role || "",
      userType: user.userType,
      tenantId: user.tenantId,
      tenantCode: user.primaryTenant?.code ?? null,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        tenant_id: user.tenantId,
        role: user.role || "",
      },
      session,
    };
  });
};
