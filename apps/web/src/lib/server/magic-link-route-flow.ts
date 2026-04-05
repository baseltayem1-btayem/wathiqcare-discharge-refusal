export const MAGIC_LINK_GENERIC_RESPONSE = {
    success: true,
    message: "If your account is eligible, a login link has been sent.",
};

export type MagicLinkRequestPayload = {
    email?: string;
};

export type MagicLinkRateLimitResult = {
    limited: boolean;
    waitSeconds?: number;
};

const MAGIC_LINK_MIN_REQUEST_RESPONSE_MS = 300;

export type MagicLinkRequestUser = {
    id: string;
    email: string;
    fullName: string;
    tenantId: string;
    role: string;
    isActive: boolean;
};

export type IssuedMagicLink = {
    tokenId: string;
    magicUrl: string;
    expiresAt: Date;
    expiresMinutes: number;
};

export type MagicLinkVerifySuccess = {
    user: {
        id: string;
        tenant_id: string;
    };
    session: {
        accessToken: string;
        redirectTo: string;
        userType: string;
    };
};

export type MagicLinkVerifyErrorCode =
    | "DOMAIN_NOT_ALLOWED"
    | "PENDING_APPROVAL"
    | "NO_ROLE_ASSIGNED"
    | "NO_LICENSE_ASSIGNED"
    | "TENANT_INACTIVE"
    | "EXPIRED_LINK"
    | "ALREADY_USED"
    | "INVALID_TOKEN";

export type MagicLinkRequestFlowDeps = {
    normalizeEmail(value: string): string | null;
    checkRateLimit(email: string, request: Request): Promise<MagicLinkRateLimitResult>;
    recordAttempt(email: string, success: boolean, reason: string | null, request: Request): Promise<void>;
    findUser(email: string): Promise<MagicLinkRequestUser>;
    createToken(userId: string): Promise<IssuedMagicLink>;
    sendEmail(args: { user: MagicLinkRequestUser; magic: IssuedMagicLink }): Promise<void>;
    auditLog(args: {
        tenantId?: string | null;
        userId?: string | null;
        action: string;
        details: string;
        timestamp: string;
        metadataJson: Record<string, unknown>;
        request: Request;
    }): Promise<void>;
};

export type MagicLinkVerifyFlowDeps = {
    checkRateLimit(token: string, request: Request): Promise<MagicLinkRateLimitResult>;
    recordAttempt(token: string, success: boolean, reason: string | null, request: Request): Promise<void>;
    verifyToken(token: string): Promise<MagicLinkVerifySuccess>;
    auditLog(args: {
        tenantId?: string | null;
        userId?: string | null;
        action: string;
        details: string;
        timestamp: string;
        metadataJson: Record<string, unknown>;
        request: Request;
    }): Promise<void>;
    getSessionCookieName(): string;
    getTokenTtlSeconds(): number;
};

export type MagicLinkVerifyFlowResult =
    | {
          status: 200;
          body: {
              authenticated: true;
              provider: "local_magic";
              redirectTo: string;
              userType: string;
          };
          cookie: {
              name: string;
              value: string;
              maxAgeSeconds: number;
          };
      }
    | {
          status: 400 | 403 | 410;
          body: {
              detail: string;
              code: MagicLinkVerifyErrorCode;
          };
      };

function readErrorStatus(error: unknown): number | null {
    if (!error || typeof error !== "object") {
        return null;
    }

    const candidate = (error as { status?: unknown; statusCode?: unknown }).status
        ?? (error as { status?: unknown; statusCode?: unknown }).statusCode;

    return typeof candidate === "number" ? candidate : null;
}

function delay(ms: number): Promise<void> {
    if (ms <= 0) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function enforceMinimumRequestDuration(startedAt: number): Promise<void> {
    const elapsed = Date.now() - startedAt;
    await delay(MAGIC_LINK_MIN_REQUEST_RESPONSE_MS - elapsed);
}

export function codeFromMagicLinkVerifyDetail(detail: string): MagicLinkVerifyErrorCode {
    const normalized = detail.trim().toLowerCase();
    if (normalized.includes("domain not allowed") || normalized.includes("not allowed") || normalized.includes("not authorized")) {
        return "DOMAIN_NOT_ALLOWED";
    }
    if (normalized.includes("pending administrator approval") || normalized.includes("pending approval")) {
        return "PENDING_APPROVAL";
    }
    if (normalized.includes("no role assigned")) {
        return "NO_ROLE_ASSIGNED";
    }
    if (normalized.includes("no active license")) {
        return "NO_LICENSE_ASSIGNED";
    }
    if (normalized.includes("tenant is inactive")) {
        return "TENANT_INACTIVE";
    }
    if (normalized.includes("expired")) {
        return "EXPIRED_LINK";
    }
    if (normalized.includes("used")) {
        return "ALREADY_USED";
    }
    return "INVALID_TOKEN";
}

export function statusFromMagicLinkVerifyCode(code: MagicLinkVerifyErrorCode): 400 | 403 | 410 {
    if (code === "INVALID_TOKEN") {
        return 400;
    }
    if (code === "EXPIRED_LINK" || code === "ALREADY_USED") {
        return 410;
    }
    return 403;
}

export async function handleMagicLinkRequestFlow(args: {
    request: Request;
    payload: MagicLinkRequestPayload | null;
    deps: MagicLinkRequestFlowDeps;
}): Promise<typeof MAGIC_LINK_GENERIC_RESPONSE> {
    const startedAt = Date.now();
    const { request, payload, deps } = args;
    const rawEmail = payload?.email?.trim() || "";
    const email = deps.normalizeEmail(rawEmail) || "";

    try {
        if (!email) {
            if (rawEmail) {
                await deps.recordAttempt(rawEmail, false, "MAGIC_LINK_INVALID_EMAIL", request);
            }
            return MAGIC_LINK_GENERIC_RESPONSE;
        }

        const rateLimitCheck = await deps.checkRateLimit(email, request);
        if (rateLimitCheck.limited) {
            await deps.recordAttempt(email, false, "MAGIC_LINK_RATE_LIMITED", request);
            return MAGIC_LINK_GENERIC_RESPONSE;
        }

        try {
            const user = await deps.findUser(email);
            const magic = await deps.createToken(user.id);
            const timestamp = new Date().toISOString();

            await deps.sendEmail({ user, magic });
            await deps.recordAttempt(email, true, "MAGIC_LINK_SENT", request);

            try {
                await deps.auditLog({
                    tenantId: user.tenantId,
                    userId: user.id,
                    action: "magic_link_requested",
                    details: "Secure sign-in link issued",
                    timestamp,
                    metadataJson: {
                        provider: "local_magic",
                        tokenId: magic.tokenId,
                        expiresAt: magic.expiresAt.toISOString(),
                        timestamp,
                    },
                    request,
                });
            } catch (auditError) {
                console.error("magic-link request: audit write failed", auditError);
            }
        } catch (error) {
            const status = readErrorStatus(error);
            if (status && [400, 403, 404].includes(status)) {
                await deps.recordAttempt(email, false, `MAGIC_LINK_${status}`, request);
                return MAGIC_LINK_GENERIC_RESPONSE;
            }

            console.error("magic-link request failed", error);
            await deps.recordAttempt(email, false, "MAGIC_LINK_DELIVERY_FAILED", request);
            return MAGIC_LINK_GENERIC_RESPONSE;
        }

        return MAGIC_LINK_GENERIC_RESPONSE;
    } finally {
        await enforceMinimumRequestDuration(startedAt);
    }
}

export async function handleMagicLinkVerifyFlow(args: {
    request: Request;
    token: string;
    deps: MagicLinkVerifyFlowDeps;
}): Promise<MagicLinkVerifyFlowResult> {
    const { request, token, deps } = args;
    const trimmedToken = token.trim();

    const rateLimitCheck = await deps.checkRateLimit(trimmedToken, request);
    if (rateLimitCheck.limited) {
        await deps.recordAttempt(trimmedToken, false, "MAGIC_LINK_VERIFY_RATE_LIMITED", request);
        return {
            status: 400,
            body: {
                detail: "Invalid magic link token",
                code: "INVALID_TOKEN",
            },
        };
    }

    try {
        const { user, session } = await deps.verifyToken(trimmedToken);
        const timestamp = new Date().toISOString();

        await deps.recordAttempt(trimmedToken, true, "MAGIC_LINK_VERIFY_SUCCESS", request);

        try {
            await deps.auditLog({
                tenantId: user.tenant_id,
                userId: user.id,
                action: "magic_link_used",
                details: "Magic-link token consumed",
                timestamp,
                metadataJson: { provider: "local_magic", timestamp },
                request,
            });

            await deps.auditLog({
                tenantId: user.tenant_id,
                userId: user.id,
                action: "login_success",
                details: "User authenticated via magic-link",
                timestamp,
                metadataJson: { provider: "local_magic", timestamp },
                request,
            });
        } catch (auditError) {
            console.error("magic-link verify: audit write failed", auditError);
        }

        return {
            status: 200,
            body: {
                authenticated: true,
                provider: "local_magic",
                redirectTo: session.redirectTo,
                userType: session.userType,
            },
            cookie: {
                name: deps.getSessionCookieName(),
                value: session.accessToken,
                maxAgeSeconds: deps.getTokenTtlSeconds(),
            },
        };
    } catch (error) {
        if (error instanceof Error) {
            const code = codeFromMagicLinkVerifyDetail(error.message);
            await deps.recordAttempt(trimmedToken, false, `MAGIC_LINK_VERIFY_${code}`, request);
            return {
                status: statusFromMagicLinkVerifyCode(code),
                body: {
                    detail: error.message,
                    code,
                },
            };
        }

        throw error;
    }
}