import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/server/http";
import type { AuthContext } from "@/lib/server/auth";
import { canonicalizeUserRole } from "@/lib/server/roles";
import { getPrisma } from "@/lib/server/prisma";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = getPrisma();

const PRIVILEGED_ROLE_SET = new Set([
  "platform_superadmin",
  "platform_admin",
  "tenant_owner",
  "tenant_admin",
  "legal_admin",
  "medical_director",
  "finance_officer",
  "compliance",
  "patient_affairs",
  "viewer",
  "auditor",
]);

const STEP_UP_COOKIE_NAME = "wathiqcare_step_up";
const STEP_UP_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const STEP_UP_SESSION_TTL_MS = 15 * 60 * 1000;
const STEP_UP_SECRET =
  process.env.WATHIQ_STEP_UP_SECRET ||
  process.env.JWT_SECRET ||
  "wathiqcare-step-up-dev-secret";

type RawStepUpRevocationRow = {
  step_up_revoked_at: Date | null;
};

type SignedStepUpPayload = {
  kind: "challenge" | "session";
  sub: string;
  tenantId: string;
  actionKey: string;
  codeHash?: string;
  iat: string;
  exp: string;
  nonce: string;
};

function hashStepUpCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function signStepUpPayload(payload: SignedStepUpPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", STEP_UP_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readSignedStepUpPayload(token: string | null | undefined): SignedStepUpPayload | null {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = crypto.createHmac("sha256", STEP_UP_SECRET).update(encoded).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedStepUpPayload;
  } catch {
    return null;
  }
}

export function getStepUpCookieName(): string {
  return STEP_UP_COOKIE_NAME;
}

export function createStepUpChallenge(args: {
  userId: string;
  tenantId: string;
  actionKey: string;
  now?: Date;
  ttlMs?: number;
}) {
  const issuedAt = args.now ?? new Date();
  const expiresAt = new Date(issuedAt.getTime() + (args.ttlMs ?? STEP_UP_CHALLENGE_TTL_MS));
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const actionKey = args.actionKey.trim().replace(/[^a-zA-Z0-9:_-]/g, "_") || "privileged_action";

  const challengeToken = signStepUpPayload({
    kind: "challenge",
    sub: args.userId,
    tenantId: args.tenantId,
    actionKey,
    codeHash: hashStepUpCode(code),
    iat: issuedAt.toISOString(),
    exp: expiresAt.toISOString(),
    nonce: crypto.randomUUID(),
  });

  return {
    challengeToken,
    code,
    expiresAt: expiresAt.toISOString(),
  };
}

export function verifyStepUpChallenge(args: {
  challengeToken: string;
  code: string;
  userId: string;
  tenantId: string;
  now?: Date;
  sessionTtlMs?: number;
}) {
  const payload = readSignedStepUpPayload(args.challengeToken);
  const now = args.now ?? new Date();

  if (!payload || payload.kind !== "challenge") {
    return { valid: false, reason: "invalid_challenge" } as const;
  }

  if (payload.sub !== args.userId || payload.tenantId !== args.tenantId) {
    return { valid: false, reason: "challenge_scope_mismatch" } as const;
  }

  if (new Date(payload.exp).getTime() < now.getTime()) {
    return { valid: false, reason: "challenge_expired" } as const;
  }

  if (hashStepUpCode(args.code.trim()) !== payload.codeHash) {
    return { valid: false, reason: "invalid_code" } as const;
  }

  const sessionExpiresAt = new Date(now.getTime() + (args.sessionTtlMs ?? STEP_UP_SESSION_TTL_MS));
  const sessionToken = signStepUpPayload({
    kind: "session",
    sub: args.userId,
    tenantId: args.tenantId,
    actionKey: payload.actionKey,
    iat: now.toISOString(),
    exp: sessionExpiresAt.toISOString(),
    nonce: crypto.randomUUID(),
  });

  return {
    valid: true,
    sessionToken,
    expiresAt: sessionExpiresAt.toISOString(),
  } as const;
}

export function isStepUpSessionTokenValid(args: {
  sessionToken: string | null | undefined;
  userId: string;
  tenantId: string;
  now?: Date;
  revokedAt?: Date | null;
}) {
  const payload = readSignedStepUpPayload(args.sessionToken);
  const now = args.now ?? new Date();

  if (!payload || payload.kind !== "session") {
    return false;
  }

  if (payload.sub !== args.userId || payload.tenantId !== args.tenantId) {
    return false;
  }

   if (args.revokedAt && new Date(payload.iat).getTime() <= args.revokedAt.getTime()) {
    return false;
  }

  return new Date(payload.exp).getTime() >= now.getTime();
}

async function ensureStepUpRevocationSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS step_up_revoked_at TIMESTAMPTZ NULL
  `);
}

async function getUserStepUpRevokedAt(userId: string): Promise<Date | null> {
  try {
    await ensureStepUpRevocationSchema();
    const rows = await prisma.$queryRaw<RawStepUpRevocationRow[]>`
      SELECT step_up_revoked_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    return rows[0]?.step_up_revoked_at ?? null;
  } catch {
    return null;
  }
}

export async function getStepUpStatusFromRequest(args: {
  request: NextRequest;
  auth: AuthContext;
  tenantId: string;
}) {
  const sessionToken =
    args.request.cookies.get(STEP_UP_COOKIE_NAME)?.value ??
    args.request.headers.get("x-step-up-token") ??
    args.request.headers.get("x-wathiq-step-up-token") ??
    null;
  const cookiePayload = readSignedStepUpPayload(sessionToken);
  const revokedAt = await getUserStepUpRevokedAt(args.auth.sub);
  const cookieVerified = isStepUpSessionTokenValid({
    sessionToken,
    userId: args.auth.sub,
    tenantId: args.tenantId,
    revokedAt,
  });
  const headerVerified =
    args.request.headers.get("x-wathiq-step-up") === "verified" ||
    args.request.headers.get("x-mfa-verified") === "true";

  return {
    verified: headerVerified || cookieVerified,
    method: headerVerified ? "header" : cookieVerified ? "cookie" : "none",
    expiresAt: cookieVerified ? cookiePayload?.exp ?? null : null,
  };
}

export function isPrivilegedRole(role: string | null | undefined): boolean {
  return PRIVILEGED_ROLE_SET.has(canonicalizeUserRole(role));
}

export function isTenantAccessAllowed(
  currentTenantId: string | null | undefined,
  resourceTenantId: string,
  platformBypass = false,
): boolean {
  if (platformBypass) {
    return true;
  }
  return Boolean(currentTenantId) && currentTenantId === resourceTenantId;
}

export async function getTenantSecuritySettings(tenantId: string) {
  const defaults = {
    mfaRequiredForAdmins: true,
    mfaRequiredForPrivileged: true,
    privilegedStepUpEnabled: true,
    enforceKsaResidency: true,
    exportApprovalRequired: true,
    sessionTimeoutMinutes: 30,
    allowedAnalyticsRegion: "saudi-arabia-riyadh",
  };

  try {
    const current = await prisma.tenantSecuritySetting.findUnique({ where: { tenantId } });
    return current ?? defaults;
  } catch {
    return defaults;
  }
}

export async function logPrivilegedAccess(args: {
  tenantId: string;
  caseId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  actionKey: string;
  result: "allowed" | "denied";
  reason?: string;
  request?: NextRequest;
  stepUpVerified?: boolean;
  metadataJson?: unknown;
}) {
  const ipAddress = args.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  try {
    await prisma.privilegedAccessLog.create({
      data: {
        tenantId: args.tenantId,
        caseId: args.caseId ?? null,
        actionKey: args.actionKey,
        reason: args.reason ?? null,
        actorUserId: args.actorUserId ?? null,
        actorRole: args.actorRole ?? null,
        accessChannel: "api",
        stepUpVerified: args.stepUpVerified ?? false,
        result: args.result,
        ipAddress,
        metadataJson:
          args.metadataJson === undefined
            ? undefined
            : args.metadataJson === null
              ? Prisma.JsonNull
              : (args.metadataJson as Prisma.InputJsonValue),
      },
    });
  } catch (error) {
    console.error("privileged access log write failed", error);
  }

  if (args.actorUserId) {
    await writeAuditLog({
      tenantId: args.tenantId,
      userId: args.actorUserId,
      entityType: "security_policy",
      entityId: args.caseId ?? args.actionKey,
      action: `privileged_${args.result}`,
      details: args.reason ?? `Privileged action ${args.actionKey} ${args.result}`,
      caseId: args.caseId ?? null,
      metadataJson: {
        actionKey: args.actionKey,
        stepUpVerified: args.stepUpVerified ?? false,
        result: args.result,
      },
      request: args.request,
    }).catch(() => undefined);
  }
}

export async function assertStepUpForSensitiveAction(args: {
  auth: AuthContext;
  request: NextRequest;
  tenantId: string;
  actionKey: string;
  reason?: string;
  caseId?: string | null;
}) {
  const settings = await getTenantSecuritySettings(args.tenantId);
  const stepUp = await getStepUpStatusFromRequest({
    request: args.request,
    auth: args.auth,
    tenantId: args.tenantId,
  });

  if (isPrivilegedRole(args.auth.role) && settings.mfaRequiredForPrivileged && settings.privilegedStepUpEnabled && !stepUp.verified) {
    await logPrivilegedAccess({
      tenantId: args.tenantId,
      caseId: args.caseId ?? null,
      actorUserId: args.auth.sub,
      actorRole: args.auth.role ?? null,
      actionKey: args.actionKey,
      result: "denied",
      reason: args.reason ?? "Step-up authentication required",
      request: args.request,
      stepUpVerified: false,
      metadataJson: {
        actionKey: args.actionKey,
        stepUpMethod: stepUp.method,
      },
    });

    throw new ApiError(403, "Step-up authentication required for this privileged action");
  }

  await logPrivilegedAccess({
    tenantId: args.tenantId,
    caseId: args.caseId ?? null,
    actorUserId: args.auth.sub,
    actorRole: args.auth.role ?? null,
    actionKey: args.actionKey,
    result: "allowed",
    reason: args.reason,
    request: args.request,
    stepUpVerified: stepUp.verified,
    metadataJson: {
      actionKey: args.actionKey,
      stepUpMethod: stepUp.method,
      stepUpExpiresAt: stepUp.expiresAt,
    },
  });

  return {
    settings,
    stepUpVerified: stepUp.verified,
    stepUpMethod: stepUp.method,
    stepUpExpiresAt: stepUp.expiresAt,
  };
}

export async function getSecurityDashboard(tenantId: string) {
  const settings = await getTenantSecuritySettings(tenantId);
  const recentPrivilegedAccess = await prisma.privilegedAccessLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 25,
  }).catch(() => []);

  const recentAuditExports = await prisma.reportAccessLog.findMany({
    where: {
      tenantId,
      OR: [
        { reportKey: { contains: "audit" } },
        { exportFormat: { not: null } },
      ],
    },
    orderBy: { accessedAt: "desc" },
    take: 20,
  }).catch(() => []);

  return {
    settings,
    privilegedRoles: Array.from(PRIVILEGED_ROLE_SET),
    recentPrivilegedAccess,
    recentAuditExports,
    metrics: {
      privilegedEventCount: recentPrivilegedAccess.length,
      deniedEventCount: recentPrivilegedAccess.filter((item) => item.result === "denied").length,
      auditExportCount: recentAuditExports.length,
      mfaRequiredForPrivileged: settings.mfaRequiredForPrivileged,
      privilegedStepUpEnabled: settings.privilegedStepUpEnabled,
    },
  };
}
