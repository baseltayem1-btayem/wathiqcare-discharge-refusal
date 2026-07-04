import { ApiError } from "@/lib/server/http";

/**
 * Simple in-memory sliding-window rate limiter for Next.js API routes.
 *
 * This is intentionally lightweight for the controlled pilot.  For production
 * scale it should be replaced with Redis-backed rate limiting.
 */

type WindowEntry = {
  count: number;
  resetAt: number;
};

const windows = new Map<string, WindowEntry>();

function cleanupExpired(now: number): void {
  for (const [key, entry] of windows.entries()) {
    if (entry.resetAt <= now) {
      windows.delete(key);
    }
  }
}

export function checkRateLimit(args: {
  key: string;
  maxRequests: number;
  windowMs: number;
}): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  cleanupExpired(now);

  const existing = windows.get(args.key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + args.windowMs;
    windows.set(args.key, { count: 1, resetAt });
    return { allowed: true, remaining: args.maxRequests - 1, resetAt };
  }

  if (existing.count >= args.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: args.maxRequests - existing.count, resetAt: existing.resetAt };
}

export function rateLimitOrThrow(args: {
  key: string;
  maxRequests: number;
  windowMs: number;
  context?: string;
}): { remaining: number; resetAt: number } {
  const result = checkRateLimit(args);
  if (!result.allowed) {
    const seconds = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw new ApiError(429, `Rate limit exceeded. Try again in ${seconds}s`);
  }
  return { remaining: result.remaining, resetAt: result.resetAt };
}
