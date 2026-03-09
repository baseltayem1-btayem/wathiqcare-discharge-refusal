import crypto from "node:crypto";
import { ApiError } from "@/lib/server/http";
import type { SignatureMethod } from "@/lib/server/platform/types";

type SignatureSession = {
  sessionId: string;
  method: SignatureMethod;
  challenge: string;
  expiresAt: number;
  verified: boolean;
  signatureRecord?: string;
  recipient?: string;
};

const SESSION_TTL_MS = 5 * 60 * 1000;
const sessions = new Map<string, SignatureSession>();

function envValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ApiError(500, `Missing required environment key: ${name}`);
  }
  return value;
}

function isSmsConfigured(): boolean {
  return Boolean(process.env.SMS_PROVIDER_API_KEY && process.env.SMS_PROVIDER_SENDER_ID);
}

function isNafathConfigured(): boolean {
  return Boolean(process.env.NAFATH_CLIENT_ID && process.env.NAFATH_CLIENT_SECRET);
}

export function getSignatureProviderReadiness() {
  return {
    smsOtpConfigured: isSmsConfigured(),
    tabletSignatureConfigured: true,
    nafathConfigured: isNafathConfigured(),
  };
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [key, value] of sessions.entries()) {
    if (value.expiresAt <= now) {
      sessions.delete(key);
    }
  }
}

function createChallengeCode(length: number): string {
  const digits = "0123456789";
  return Array.from({ length }, () => digits[crypto.randomInt(0, digits.length)]).join("");
}

function createSessionId(): string {
  return `sig_${crypto.randomUUID()}`;
}

export async function startSignatureSession(args: {
  method: SignatureMethod;
  recipient?: string;
}) {
  cleanupExpiredSessions();

  if (args.method === "SMS_OTP") {
    envValue("SMS_PROVIDER_API_KEY");
    envValue("SMS_PROVIDER_SENDER_ID");
    if (!args.recipient) {
      throw new ApiError(400, "recipient is required for SMS_OTP");
    }
  }

  if (args.method === "NAFATH") {
    envValue("NAFATH_CLIENT_ID");
    envValue("NAFATH_CLIENT_SECRET");
  }

  const challenge = args.method === "TABLET_SIGNATURE" ? createChallengeCode(4) : createChallengeCode(6);
  const sessionId = createSessionId();

  sessions.set(sessionId, {
    sessionId,
    method: args.method,
    challenge,
    expiresAt: Date.now() + SESSION_TTL_MS,
    verified: false,
    recipient: args.recipient,
  });

  return {
    sessionId,
    method: args.method,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    challengeHint: args.method === "TABLET_SIGNATURE" ? challenge : "sent",
  };
}

export function verifySignatureSession(args: {
  sessionId: string;
  verificationCode: string;
  method: SignatureMethod;
}) {
  cleanupExpiredSessions();
  const session = sessions.get(args.sessionId);

  if (!session) {
    throw new ApiError(404, "Signature session not found or expired");
  }

  if (session.method !== args.method) {
    throw new ApiError(400, "Signature method mismatch");
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(args.sessionId);
    throw new ApiError(410, "Signature session expired");
  }

  if (session.challenge !== args.verificationCode) {
    throw new ApiError(400, "Invalid verification code");
  }

  const signatureRecord = `verified:${session.method}:${session.sessionId}:${Date.now()}`;
  session.verified = true;
  session.signatureRecord = signatureRecord;
  sessions.set(args.sessionId, session);

  return {
    ok: true,
    signatureRecord,
    verifiedAt: new Date().toISOString(),
  };
}

export function resolveVerifiedSignatureRecord(sessionId: string, method: SignatureMethod): string {
  cleanupExpiredSessions();
  const session = sessions.get(sessionId);

  if (!session || session.method !== method || !session.verified || !session.signatureRecord) {
    throw new ApiError(400, "Signature session is not verified");
  }

  return session.signatureRecord;
}
