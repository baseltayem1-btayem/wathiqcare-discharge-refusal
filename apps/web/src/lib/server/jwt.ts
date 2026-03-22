import crypto from "node:crypto";

export type JwtHeader = {
    alg: "HS256";
    typ: "JWT";
};

export type JwtClaims = {
    sub: string;
    email?: string;
    role?: string;
    user_type?: "platform_admin" | "tenant_admin" | "tenant_user";
    tenant_id?: string;
    tenant_code?: string | null;
    platform_role?: "platform_superadmin" | "platform_admin" | null;
    exp?: number;
    iss?: string;
};

const DEFAULT_ISSUER = "wathiqcare";
const REQUIRED_ALGORITHM = "HS256" as const;

function decodeBase64Url(input: string): string {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return Buffer.from(padded, "base64").toString("utf8");
}

function base64UrlEncode(value: string): string {
    return Buffer.from(value, "utf8").toString("base64url");
}

export function getJwtIssuer(): string {
    return (process.env.JWT_ISSUER || DEFAULT_ISSUER).trim() || DEFAULT_ISSUER;
}

export function getJwtAlgorithm(): "HS256" {
    const configured = (process.env.JWT_ALGORITHM || REQUIRED_ALGORITHM).trim().toUpperCase();
    if (configured !== REQUIRED_ALGORITHM) {
        throw new Error("JWT_ALGORITHM must be HS256");
    }
    return REQUIRED_ALGORITHM;
}

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET_KEY?.trim();
    if (!secret || secret === "change-me") {
        throw new Error("JWT_SECRET_KEY is not configured");
    }
    return secret;
}

export function createSignedJwt(payload: JwtClaims): string {
    const header: JwtHeader = {
        alg: getJwtAlgorithm(),
        typ: "JWT",
    };

    const normalizedPayload: JwtClaims = {
        ...payload,
        iss: payload.iss ?? getJwtIssuer(),
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(normalizedPayload));
    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto.createHmac("sha256", getJwtSecret()).update(data).digest("base64url");

    return `${data}.${signature}`;
}

export function verifyAndDecodeJwt(token: string): JwtClaims {
    const parts = token.split(".");
    if (parts.length !== 3) {
        throw new Error("Malformed access token");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    let header: JwtHeader;
    try {
        header = JSON.parse(decodeBase64Url(encodedHeader)) as JwtHeader;
    } catch {
        throw new Error("Malformed access token header");
    }

    if (header.alg !== getJwtAlgorithm() || header.typ !== "JWT") {
        throw new Error("Unexpected JWT header");
    }

    const expectedSignature = crypto
        .createHmac("sha256", getJwtSecret())
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64url");

    const provided = Buffer.from(encodedSignature);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        throw new Error("Invalid access token signature");
    }

    let claims: JwtClaims;
    try {
        claims = JSON.parse(decodeBase64Url(encodedPayload)) as JwtClaims;
    } catch {
        throw new Error("Malformed access token");
    }

    if (!claims.sub) {
        throw new Error("Invalid access token claims");
    }

    if ((claims.iss || "").trim() !== getJwtIssuer()) {
        throw new Error("Invalid access token issuer");
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.exp === "number" && claims.exp < now) {
        throw new Error("Access token expired");
    }

    return claims;
}