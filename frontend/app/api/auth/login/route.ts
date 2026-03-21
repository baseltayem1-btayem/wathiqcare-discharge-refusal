import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { ApiError, handleApiError } from "@/lib/server/http";
import bcrypt from "bcryptjs";

type LoginPayload = {
  email?: string;
  password?: string;
};

const AUTH_DEBUG = process.env.AUTH_DEBUG === "true";

function authDebugLog(event: string, details: Record<string, unknown> = {}): void {
  if (!AUTH_DEBUG) {
    return;
  }
  console.info("[auth-debug]", event, details);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET_KEY;
  if (!secret || secret === "change-me") {
    throw new ApiError(500, "JWT_SECRET_KEY is not configured");
  }
  return secret;
}

function getTokenTtlSeconds(): number {
  const raw = process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? "30";
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new ApiError(500, "ACCESS_TOKEN_EXPIRE_MINUTES is invalid");
  }
  const bounded = Math.max(15, Math.min(30, Math.floor(minutes)));
  return Math.floor(bounded * 60);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function createAccessToken(payload: Record<string, unknown>, secret: string): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      throw new ApiError(500, "DATABASE_URL is not configured");
    }

    const payload = (await request.json().catch(() => null)) as LoginPayload | null;
    const email = payload?.email?.trim().toLowerCase();
    const password = payload?.password;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        primaryTenant: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!user || !user.hashedPassword || !user.isActive) {
      throw new ApiError(401, "Invalid credentials");
    }

    const validPassword = await bcrypt.compare(password, user.hashedPassword);
    if (!validPassword) {
      throw new ApiError(401, "Invalid credentials");
    }

    const secret = getJwtSecret();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + getTokenTtlSeconds();

    const issuer = process.env.JWT_ISSUER?.trim() || null;
    const accessToken = createAccessToken(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenantId,
        tenant_code: user.primaryTenant?.code ?? null,
        exp,
        ...(issuer ? { iss: issuer } : {}),
      },
      secret,
    );

    const response = NextResponse.json({ access_token: accessToken });
    const isProd = process.env.NODE_ENV === "production";
    const requestHost = new URL(request.url).hostname.toLowerCase();
    const cookieDomain = isProd && requestHost.endsWith("wathiqcare.online")
      ? ".wathiqcare.online"
      : undefined;

    response.cookies.set("wathiqcare_access_token", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      domain: cookieDomain,
      path: "/",
      maxAge: getTokenTtlSeconds(),
    });

    authDebugLog("login_cookie_set", {
      requestHost,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      domain: cookieDomain ?? "host-only",
      maxAgeSeconds: getTokenTtlSeconds(),
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
