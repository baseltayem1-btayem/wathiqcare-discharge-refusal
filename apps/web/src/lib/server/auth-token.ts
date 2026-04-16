import crypto from "node:crypto";
import { ApiError } from "@/lib/server/http";
import { getJwtIssuer } from "@/lib/server/jwt";

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET_KEY?.trim();
    if (!secret || secret === "change-me") {
        throw new ApiError(500, "JWT_SECRET_KEY is not configured");
    }
    return secret;
}

export function getTokenTtlSeconds(): number {
    const raw = process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? "60";
    const minutes = Number(raw);
    if (!Number.isFinite(minutes) || minutes <= 0) {
        throw new ApiError(500, "ACCESS_TOKEN_EXPIRE_MINUTES is invalid");
    }
    return Math.floor(minutes * 60);
}

function base64UrlEncode(value: string): string {
    return Buffer.from(value, "utf8").toString("base64url");
}

export function createAccessToken(payload: Record<string, unknown>, secret: string): string {
    const header = {
        alg: "HS256",
        typ: "JWT",
    };

    const normalizedPayload = {
        ...payload,
        iat: typeof payload.iat === "number" ? payload.iat : Math.floor(Date.now() / 1000),
        iss: typeof payload.iss === "string" && payload.iss.trim() ? payload.iss : getJwtIssuer(),
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(normalizedPayload));
    const data = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");

    return `${data}.${signature}`;
}
