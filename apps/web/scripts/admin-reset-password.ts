import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { ensurePasswordResetSchema } from "../src/lib/server/auth-reset";
import { appendAuditChainEvent } from "../src/lib/server/audit-chain-service";
import { hashPassword, verifyPassword } from "../src/lib/server/password";

type ResetTarget = {
  identifier: string;
  password: string;
};

type ParsedArgs = {
  apply: boolean;
  audit: boolean;
  actorIdentifier: string | null;
  filePath: string | null;
  targets: ResetTarget[];
};

type UserRow = {
  id: string;
  tenant_id: string;
  email: string;
  is_active: boolean;
  status: string | null;
  password_reset_required: boolean;
  hashed_password: string | null;
};

const prisma = new PrismaClient();

function printUsage(): void {
  console.log([
    "Usage:",
    "  npm run admin:reset-password -- --username <username-or-email> --password <newPassword>",
    "  npm run admin:reset-password -- --target <username-or-email=password> [--target <username-or-email=password>]",
    "  npm run admin:reset-password -- --file <resets.json|resets.csv>",
    "",
    "Options:",
    "  --file <path>   Load reset targets from JSON or CSV.",
    "  --audit         Write audit_logs entries and an audit-chain event for each password reset.",
    "  --actor <id>    Username or email of the admin/operator performing the reset. Required with --audit.",
    "  --apply   Execute the update. Without this flag the script runs in dry-run mode.",
    "  --help    Show this help.",
  ].join("\n"));
}

async function loadTargetsFromFile(filePath: string): Promise<ResetTarget[]> {
  const absolutePath = path.resolve(filePath);
  const extension = path.extname(absolutePath).toLowerCase();
  const raw = await fs.readFile(absolutePath, "utf8");

  if (extension === ".json") {
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) {
      throw new Error("JSON reset file must contain an array of objects");
    }

    return parsed.map((entry, index) => {
      const identifier = String(entry.identifier ?? entry.username ?? entry.email ?? "").trim();
      const password = String(entry.password ?? "");
      if (!identifier || !password) {
        throw new Error(`Invalid JSON entry at index ${index}: identifier and password are required`);
      }
      return { identifier, password };
    });
  }

  if (extension === ".csv") {
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error("CSV reset file is empty");
    }

    const header = lines[0].split(",").map((part) => part.trim().toLowerCase());
    const identifierIndex = header.findIndex((key) => ["identifier", "username", "email"].includes(key));
    const passwordIndex = header.findIndex((key) => key === "password");

    if (identifierIndex < 0 || passwordIndex < 0) {
      throw new Error("CSV reset file must contain identifier/username/email and password columns");
    }

    return lines.slice(1).map((line, rowIndex) => {
      const columns = line.split(",");
      const identifier = (columns[identifierIndex] ?? "").trim();
      const password = columns[passwordIndex] ?? "";
      if (!identifier || !password) {
        throw new Error(`Invalid CSV entry at row ${rowIndex + 2}: identifier and password are required`);
      }
      return { identifier, password };
    });
  }

  throw new Error(`Unsupported file type: ${extension}. Use .json or .csv`);
}

async function parseArgs(argv: string[]): Promise<ParsedArgs> {
  let apply = false;
  let audit = false;
  let actorIdentifier: string | null = null;
  let filePath: string | null = null;
  let username: string | null = null;
  let password: string | null = null;
  const targets: ResetTarget[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--audit") {
      audit = true;
      continue;
    }

    if (arg === "--actor") {
      actorIdentifier = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    if (arg === "--file") {
      filePath = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    if (arg === "--username") {
      username = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }

    if (arg === "--password") {
      password = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--target") {
      const raw = argv[index + 1] ?? "";
      index += 1;
      const separatorIndex = raw.indexOf("=");
      if (separatorIndex <= 0) {
        throw new Error(`Invalid --target value: ${raw}. Expected username-or-email=password`);
      }

      const identifier = raw.slice(0, separatorIndex).trim();
      const targetPassword = raw.slice(separatorIndex + 1);
      if (!identifier || !targetPassword) {
        throw new Error(`Invalid --target value: ${raw}. Expected username-or-email=password`);
      }
      targets.push({ identifier, password: targetPassword });
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if ((username && !password) || (!username && password)) {
    throw new Error("--username and --password must be provided together");
  }

  if (username && password) {
    targets.push({ identifier: username, password });
  }

  if (filePath) {
    targets.push(...await loadTargetsFromFile(filePath));
  }

  if (targets.length === 0) {
    throw new Error("No reset targets provided");
  }

  if (audit && !actorIdentifier) {
    throw new Error("--actor is required when --audit is used");
  }

  return { apply, audit, actorIdentifier, filePath, targets };
}

async function findUser(identifier: string): Promise<UserRow> {
  const normalized = identifier.trim().toLowerCase();
  const rows = normalized.includes("@")
    ? await prisma.$queryRaw<UserRow[]>`
        SELECT id, tenant_id, email, is_active, status, COALESCE(password_reset_required, FALSE) AS password_reset_required, hashed_password
        FROM users
        WHERE LOWER(email) = ${normalized}
        LIMIT 2
      `
    : await prisma.$queryRaw<UserRow[]>`
        SELECT id, tenant_id, email, is_active, status, COALESCE(password_reset_required, FALSE) AS password_reset_required, hashed_password
        FROM users
        WHERE LOWER(email) LIKE ${`${normalized}@%`}
        ORDER BY created_at ASC
        LIMIT 2
      `;

  if (rows.length === 0) {
    throw new Error(`No user found for identifier: ${identifier}`);
  }

  if (rows.length > 1) {
    throw new Error(`Multiple users matched identifier ${identifier}: ${rows.map((row) => row.email).join(", ")}`);
  }

  return rows[0];
}

async function writePasswordResetAudit(args: {
  actor: UserRow;
  target: UserRow;
  sourceIdentifier: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: args.target.tenant_id,
      userId: args.actor.id,
      entityType: "USER_ACCOUNT",
      entityId: args.target.id,
      action: "ADMIN_PASSWORD_RESET_APPLIED",
      details: `identifier=${args.sourceIdentifier} email=${args.target.email}`,
      metadataJson: {
        sourceIdentifier: args.sourceIdentifier,
        targetEmail: args.target.email,
        script: "admin-reset-password",
      },
    },
  });

  try {
    await appendAuditChainEvent({
      tenantId: args.target.tenant_id,
      eventType: "ADMIN_PASSWORD_RESET_APPLIED",
      actorId: args.actor.id,
      payloadSummary: `Password reset applied for ${args.target.email}`,
      metadataJson: {
        sourceIdentifier: args.sourceIdentifier,
        targetUserId: args.target.id,
        script: "admin-reset-password",
      },
    });
  } catch (auditChainError) {
    console.error("admin reset audit-chain append failed", auditChainError);
  }
}

async function updateUserPassword(user: UserRow, password: string): Promise<{ passwordMatches: boolean; target: UserRow }> {
  const passwordHash = await hashPassword(password);

  await prisma.$executeRaw`
    UPDATE users
    SET hashed_password = ${passwordHash},
        last_password_changed_at = NOW(),
        password_reset_required = FALSE,
        session_revoked_at = NOW(),
        failed_login_attempts = 0,
        locked_until = NULL,
        is_active = TRUE,
        status = 'active'
    WHERE id = ${user.id}
  `;

  const verificationRows = await prisma.$queryRaw<UserRow[]>`
    SELECT id, tenant_id, email, is_active, status, COALESCE(password_reset_required, FALSE) AS password_reset_required, hashed_password
    FROM users
    WHERE id = ${user.id}
    LIMIT 1
  `;

  const verification = verificationRows[0];
  const passwordMatches = verification.hashed_password
    ? await verifyPassword(password, verification.hashed_password)
    : false;

  return {
    passwordMatches,
    target: verification,
  };
}

async function main() {
  const { apply, audit, actorIdentifier, filePath, targets } = await parseArgs(process.argv.slice(2));

  await ensurePasswordResetSchema(prisma);

  const actor = actorIdentifier ? await findUser(actorIdentifier) : null;

  const resolved = await Promise.all(targets.map(async (target) => ({
    input: target,
    user: await findUser(target.identifier),
  })));

  if (!apply) {
    console.log(JSON.stringify({
      mode: "dry-run",
      filePath,
      audit,
      actor: actor ? actor.email : null,
      targets: resolved.map(({ input, user }) => ({
        identifier: input.identifier,
        email: user.email,
        is_active: user.is_active,
        status: user.status,
        password_reset_required: user.password_reset_required,
        changes: {
          is_active: true,
          status: "active",
          password_reset_required: false,
          hashed_password: "will be replaced using hashPassword()",
        },
      })),
    }, null, 2));
    return;
  }

  const results = [];
  for (const entry of resolved) {
    const result = await updateUserPassword(entry.user, entry.input.password);

    if (audit && actor) {
      await writePasswordResetAudit({
        actor,
        target: result.target,
        sourceIdentifier: entry.input.identifier,
      });
    }

    results.push({
      identifier: entry.input.identifier,
      email: result.target.email,
      is_active: result.target.is_active,
      status: result.target.status,
      password_reset_required: result.target.password_reset_required,
      passwordMatches: result.passwordMatches,
    });
  }

  console.log(JSON.stringify({
    mode: "apply",
    filePath,
    audit,
    actor: actor ? actor.email : null,
    results,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });