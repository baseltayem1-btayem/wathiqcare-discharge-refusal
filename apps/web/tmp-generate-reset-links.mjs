import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnvConfig(__dirname);

const prisma = new PrismaClient();
const targetEmails = ["doctor.er@imc.med.sa", "legal.admin@imc.med.sa"];

function parseResetTtlMinutes() {
  const raw = Number(process.env.PASSWORD_RESET_TTL_MINUTES ?? 30);
  if (!Number.isFinite(raw)) return 30;
  return Math.max(5, Math.min(24 * 60, Math.floor(raw)));
}

function readBaseUrl() {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").trim() || (process.env.APP_BASE_URL || "").trim();
  return (configured || "https://wathiqcare.online").replace(/\/$/, "");
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function ensureSchema() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS password_reset_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, used BOOLEAN NOT NULL DEFAULT FALSE, used_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_by TEXT NULL, reason TEXT NULL)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS created_by TEXT NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS reason TEXT NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE`);
  await prisma.$executeRawUnsafe(`ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id)`);
}

try {
  await ensureSchema();

  const users = await prisma.$queryRaw`
    SELECT id, email FROM users
    WHERE LOWER(email) IN (${targetEmails[0].toLowerCase()}, ${targetEmails[1].toLowerCase()})
  `;

  const userByEmail = new Map(users.map((u) => [String(u.email).toLowerCase(), u]));
  for (const email of targetEmails) {
    if (!userByEmail.has(email.toLowerCase())) throw new Error(`User not found: ${email}`);
  }

  const ttlMinutes = parseResetTtlMinutes();
  const baseUrl = readBaseUrl();

  for (const email of targetEmails) {
    const user = userByEmail.get(email.toLowerCase());
    const userId = String(user.id);

    await prisma.$executeRaw`UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE user_id = ${userId} AND used = FALSE`;

    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const tokenId = crypto.randomUUID();

    await prisma.$executeRaw`INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used, created_by, reason) VALUES (${tokenId}, ${userId}, ${tokenHash}, ${expiresAt}, FALSE, ${null}, ${null})`;

    const resetLink = `${baseUrl}/auth/password-reset?token=${encodeURIComponent(rawToken)}`;
    console.log(`${email}, ${resetLink}, ${expiresAt.toISOString()}`);
  }
} finally {
  await prisma.$disconnect();
}
