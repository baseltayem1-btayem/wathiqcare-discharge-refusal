import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { getTrakCareConfig, getTrakCareReadiness, type TrakCareConfig } from "@/lib/server/trakcare/config";
import type { TrakCareRequestContext } from "@/lib/server/trakcare/types";

const prisma = () => getPrisma();

type CachedToken = {
  token: string;
  expiresAtEpochMs: number;
};

const tokenCache = new Map<string, CachedToken>();
const rateLimitBuckets = new Map<string, number[]>();

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function buildUrl(base: string, path: string, searchParams?: URLSearchParams): string {
  const prefix = base.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const raw = `${prefix}${suffix}`;
  if (!searchParams || Array.from(searchParams.keys()).length === 0) {
    return raw;
  }
  return `${raw}?${searchParams.toString()}`;
}

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return { raw: input.slice(0, 2000) };
  }
}

function redactDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item));
  }

  if (value && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key.toLowerCase();
      if (
        normalized.includes("token") ||
        normalized.includes("secret") ||
        normalized.includes("password") ||
        normalized.includes("authorization") ||
        normalized.includes("mrn") ||
        normalized.includes("id") ||
        normalized.includes("name") ||
        normalized.includes("phone")
      ) {
        copy[key] = "[REDACTED]";
      } else {
        copy[key] = redactDeep(child);
      }
    }
    return copy;
  }

  return value;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return { value: null } as Prisma.InputJsonValue;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    typeof value === "object"
  ) {
    return value as Prisma.InputJsonValue;
  }

  return String(value) as Prisma.InputJsonValue;
}

function enforceRateLimit(config: TrakCareConfig, context: TrakCareRequestContext): void {
  const now = Date.now();
  const key = `${context.tenantId}:${context.userId}`;
  const bucket = rateLimitBuckets.get(key) || [];
  const oneMinuteAgo = now - 60_000;
  const active = bucket.filter((timestamp) => timestamp >= oneMinuteAgo);

  if (active.length >= config.rateLimitPerMinute) {
    throw new ApiError(429, "TrakCare rate limit exceeded");
  }

  active.push(now);
  rateLimitBuckets.set(key, active);
}

async function withTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(504, "TrakCare request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveBearerToken(config: TrakCareConfig): Promise<string> {
  if (config.authMode === "static_bearer") {
    return config.staticBearerToken;
  }

  if (config.authMode === "basic") {
    const encoded = Buffer.from(`${config.username}:${config.password}`, "utf8").toString("base64");
    return `Basic ${encoded}`;
  }

  const cacheKey = `${config.authUrl}|${config.clientId}|${config.scope}`;
  const cached = tokenCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAtEpochMs - 10_000 > now) {
    return cached.token;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  if (config.scope) {
    body.set("scope", config.scope);
  }

  const authHeader = Buffer.from(`${config.clientId}:${config.clientSecret}`, "utf8").toString("base64");
  const tokenResponse = await withTimeout(
    config.authUrl,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${authHeader}`,
      },
      body: body.toString(),
    },
    config.timeoutMs,
  );

  if (!tokenResponse.ok) {
    throw new ApiError(tokenResponse.status, "TrakCare token request failed");
  }

  const tokenPayload = (await tokenResponse.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;

  const accessToken = tokenPayload?.access_token?.trim();
  if (!accessToken) {
    throw new ApiError(502, "TrakCare token response is invalid");
  }

  const expiresIn = Number(tokenPayload?.expires_in || 300);
  tokenCache.set(cacheKey, {
    token: accessToken,
    expiresAtEpochMs: now + Math.max(30, expiresIn) * 1000,
  });

  return accessToken;
}

export async function callTrakCare<T>(args: {
  context: TrakCareRequestContext;
  method?: "GET" | "POST";
  path: string;
  searchParams?: URLSearchParams;
  body?: unknown;
  caseId?: string;
  mrn?: string;
  externalEncounterId?: string;
}): Promise<{ data: T; sourceTransactionId: string | null }> {
  const config = getTrakCareConfig();
  const readiness = getTrakCareReadiness(config);

  if (!readiness.ready) {
    throw new ApiError(503, readiness.reason);
  }

  enforceRateLimit(config, args.context);

  const method = args.method || "GET";
  const url = buildUrl(config.baseUrl, args.path, args.searchParams);
  const requestPayload = args.body ?? null;

  const start = Date.now();
  let finalError: unknown = null;
  let attempt = 0;
  let statusCode: number | null = null;
  let responsePayload: unknown = null;
  let sourceTransactionId: string | null = null;

  while (attempt <= config.retryCount) {
    try {
      const authHeaderValue = await resolveBearerToken(config);
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-request-id": args.context.requestId,
        "x-correlation-id": args.context.correlationId,
      };

      if (config.authMode === "basic") {
        headers.authorization = authHeaderValue;
      } else {
        headers.authorization = `Bearer ${authHeaderValue}`;
      }

      const response = await withTimeout(
        url,
        {
          method,
          headers,
          ...(requestPayload ? { body: JSON.stringify(requestPayload) } : {}),
        },
        config.timeoutMs,
      );

      statusCode = response.status;
      const bodyText = await response.text();
      responsePayload = bodyText ? safeJsonParse(bodyText) : {};
      sourceTransactionId =
        response.headers.get("x-transaction-id") ||
        response.headers.get("x-request-id") ||
        (responsePayload && typeof responsePayload === "object"
          ? String((responsePayload as Record<string, unknown>).transactionId || "")
          : "") ||
        null;

      if (!response.ok) {
        if (RETRYABLE_STATUS_CODES.has(response.status) && attempt < config.retryCount) {
          attempt += 1;
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          throw new ApiError(401, "TrakCare authorization failed");
        }

        if (response.status === 404) {
          throw new ApiError(404, "TrakCare record not found");
        }

        throw new ApiError(response.status, "TrakCare upstream request failed");
      }

      await prisma().trakCareIntegrationLog.create({
        data: {
          tenantId: args.context.tenantId,
          caseId: args.caseId || null,
          userId: args.context.userId,
          endpoint: args.path,
          method,
          requestId: args.context.requestId,
          correlationId: args.context.correlationId,
          mrn: args.mrn || null,
          externalEncounterId: args.externalEncounterId || null,
          sourceTransactionId,
          statusCode,
          outcome: "SUCCESS",
          retryCount: attempt,
          durationMs: Date.now() - start,
          requestPayload: toInputJson(requestPayload),
          responsePayload: toInputJson(responsePayload),
          redactedPayload: toInputJson(redactDeep(responsePayload)),
        },
      });

      return {
        data: responsePayload as T,
        sourceTransactionId,
      };
    } catch (error) {
      finalError = error;
      if (error instanceof ApiError) {
        if (RETRYABLE_STATUS_CODES.has(error.status) && attempt < config.retryCount) {
          attempt += 1;
          continue;
        }
      }
      break;
    }
  }

  const apiError = finalError instanceof ApiError ? finalError : new ApiError(502, "TrakCare request failed");

  await prisma().trakCareIntegrationLog.create({
    data: {
      tenantId: args.context.tenantId,
      caseId: args.caseId || null,
      userId: args.context.userId,
      endpoint: args.path,
      method,
      requestId: args.context.requestId,
      correlationId: args.context.correlationId,
      mrn: args.mrn || null,
      externalEncounterId: args.externalEncounterId || null,
      sourceTransactionId,
      statusCode,
      outcome: "FAILED",
      errorCode: String(apiError.status),
      errorMessage: apiError.message,
      retryCount: attempt,
      durationMs: Date.now() - start,
      requestPayload: toInputJson(requestPayload),
      responsePayload: toInputJson(responsePayload),
      redactedPayload: toInputJson(redactDeep(responsePayload)),
    },
  });

  throw apiError;
}

export function getTrakCareStatus() {
  const config = getTrakCareConfig();
  const readiness = getTrakCareReadiness(config);

  return {
    sourceSystem: config.sourceSystem,
    liveEnabled: config.liveEnabled,
    mode: readiness.ready ? "live" : "pending_credentials",
    state: readiness.ready ? "READY" : "PENDING_LIVE_CREDENTIALS",
    baseUrlConfigured: readiness.baseUrlConfigured,
    authConfigured: readiness.authConfigured,
    timeoutMs: config.timeoutMs,
    retryCount: config.retryCount,
    rateLimitPerMinute: config.rateLimitPerMinute,
    message: readiness.reason,
  } as const;
}
