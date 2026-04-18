import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  buildWathiqCareEmailHtml,
  buildWathiqCareEmailText,
  sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";
import { generateResetToken, hashResetToken } from "@/lib/server/password";

const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 30;

type RawResetStateRow = {
  password_reset_required: boolean | null;
  session_revoked_at: Date | null;
};

export type UserResetState = {
  passwordResetRequired: boolean;
  sessionRevokedAt: Date | null;
};

export type CreatePasswordResetTokenArgs = {
  userId: string;
  createdBy?: string | null;
  reason?: string | null;
  expiresMinutes?: number;
};

export type CreatePasswordResetTokenResult = {
  tokenId: string;
  rawToken: string;
  expiresAt: Date;
};

export function isMissingTableOrColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: unknown; meta?: { code?: unknown } };
  const code = err.code ? String(err.code) : "";
  const sqlState = err.meta?.code ? String(err.meta.code) : "";
  return (
    code === "P2021" ||
    code === "P2022" ||
    (code === "P2010" && (sqlState === "42P01" || sqlState === "42703"))
  );
}

function parseResetTtlMinutes(): number {
  const raw = Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? DEFAULT_PASSWORD_RESET_TTL_MINUTES);
  if (!Number.isFinite(raw)) {
    return DEFAULT_PASSWORD_RESET_TTL_MINUTES;
  }

  const clamped = Math.max(5, Math.min(24 * 60, Math.floor(raw)));
  return clamped;
}

export function getPasswordResetTtlMinutes(): number {
  return parseResetTtlMinutes();
}

export function readResetBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "https://wathiqcare.online";
}

export function buildPasswordResetLink(rawToken: string): string {
  return `${readResetBaseUrl()}/auth/password-reset?token=${encodeURIComponent(rawToken)}`;
}

export async function ensurePasswordResetSchema(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by TEXT NULL,
      reason TEXT NULL
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE password_reset_tokens
      ADD COLUMN IF NOT EXISTS created_by TEXT NULL
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE password_reset_tokens
      ADD COLUMN IF NOT EXISTS reason TEXT NULL
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE password_reset_tokens
      ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE password_reset_tokens
      ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ NULL
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE password_reset_tokens
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
      ON password_reset_tokens (user_id)
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS session_revoked_at TIMESTAMPTZ NULL
  `);
}

export async function createPasswordResetToken(
  prisma: PrismaClient,
  args: CreatePasswordResetTokenArgs,
): Promise<CreatePasswordResetTokenResult> {
  await ensurePasswordResetSchema(prisma);

  const expiresMinutes = args.expiresMinutes ?? getPasswordResetTtlMinutes();
  const rawToken = generateResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  const tokenId = crypto.randomUUID();

  await prisma.$executeRaw`
    INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_by, reason)
    VALUES (${tokenId}, ${args.userId}, ${tokenHash}, ${expiresAt}, FALSE, ${args.createdBy ?? null}, ${args.reason ?? null})
  `;

  await prisma.$executeRaw`
    UPDATE password_reset_tokens
    SET used = TRUE, used_at = NOW()
    WHERE user_id = ${args.userId} AND id != ${tokenId} AND used = FALSE
  `;

  return {
    tokenId,
    rawToken,
    expiresAt,
  };
}

export async function getUserResetState(prisma: PrismaClient, userId: string): Promise<UserResetState> {
  try {
    const rows = await prisma.$queryRaw<RawResetStateRow[]>`
      SELECT password_reset_required, session_revoked_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;

    const row = rows[0];
    return {
      passwordResetRequired: Boolean(row?.password_reset_required),
      sessionRevokedAt: row?.session_revoked_at ?? null,
    };
  } catch (error) {
    if (isMissingTableOrColumnError(error)) {
      return {
        passwordResetRequired: false,
        sessionRevokedAt: null,
      };
    }
    throw error;
  }
}

export async function sendPasswordResetEmail(args: {
  to: string;
  resetLink: string;
  expiresMinutes: number;
}): Promise<{ [key: string]: unknown }> {
  const html = buildWathiqCareEmailHtml({
    title: "Reset Your WathiqCare Password",
    preheader: "Password reset request",
    bodyHtml: `
      <p>We received a request to reset your WathiqCare password. Click the button below to set a new password:</p>
    `,
    ctaUrl: args.resetLink,
    ctaText: "Reset Password",
    expiresNote: `This link expires in ${args.expiresMinutes} minutes`,
    securityNote:
      "If you did not request a password reset, you can ignore this email. Your password will remain unchanged.",
  });

  const text = buildWathiqCareEmailText({
    title: "Reset Your WathiqCare Password",
    bodyLines: [
      "We received a request to reset your WathiqCare password.",
      "Click the link below to set a new password:",
    ],
    ctaUrl: args.resetLink,
    ctaLabel: "Reset Password",
    expiresNote: `This link expires in ${args.expiresMinutes} minutes`,
    securityNote:
      "If you did not request a password reset, you can ignore this email. Your password will remain unchanged.",
  });

  return sendEmailWithDiagnostics({
    to: args.to,
    subject: "Reset Your WathiqCare Password",
    html,
    text,
  });
}
