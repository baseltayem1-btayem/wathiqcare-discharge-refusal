/**
 * @wathiqcare/utils — Shared utility functions.
 *
 * Pure functions with no external dependencies. Safe to import in both
 * browser (apps/web) and server (apps/api via ts-node / jsdom) contexts.
 */

import { createHash, randomBytes } from "crypto";

// ── Token helpers ─────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random token (hex string).
 * Default 48 bytes → 96 hex chars.
 */
export function generateSecureToken(byteLength = 48): string {
    return randomBytes(byteLength).toString("hex");
}

/**
 * Hash a raw token with sha256 for safe storage.
 * Optionally pepper the hash for extra security.
 */
export function hashToken(rawToken: string, pepper?: string): string {
    const input = pepper ? `${rawToken}${pepper}` : rawToken;
    return createHash("sha256").update(input).digest("hex");
}

// ── Date helpers ──────────────────────────────────────────────────────

/** Format an ISO date string for Arabic locale display. */
export function formatDateAr(isoString: string): string {
    return new Intl.DateTimeFormat("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Riyadh",
    }).format(new Date(isoString));
}

/** Calculate expiry Date from now + seconds offset. */
export function expiresAt(ttlSeconds: number): Date {
    return new Date(Date.now() + ttlSeconds * 1000);
}

// ── Validation helpers ────────────────────────────────────────────────

/** Basic Saudi mobile number validation. */
export function isValidSaudiMobile(mobile: string): boolean {
    return /^(?:\+966|966|0)5\d{8}$/.test(mobile.trim());
}

/** Normalise mobile to E.164 format (+966XXXXXXXXX). */
export function normaliseMobile(mobile: string): string {
    const cleaned = mobile.replace(/\s+/g, "").replace(/^0/, "");
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("966")) return `+${cleaned}`;
    return `+966${cleaned}`;
}

// ── String helpers ────────────────────────────────────────────────────

/** Replace {{variable}} placeholders in a template string. */
export function interpolate(
    template: string,
    vars: Record<string, string | number | undefined | null>
): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const val = vars[key];
        return val != null ? String(val) : `[${key}]`;
    });
}

/** Truncate a string to maxLength with an Arabic-aware ellipsis. */
export function truncate(s: string, maxLength: number): string {
    if (s.length <= maxLength) return s;
    return s.slice(0, maxLength - 1) + "…";
}

// ── Sleep helper ──────────────────────────────────────────────────────

export const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));
