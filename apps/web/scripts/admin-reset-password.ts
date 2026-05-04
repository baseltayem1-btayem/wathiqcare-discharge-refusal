import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { ensurePasswordResetSchema } from "../src/lib/server/auth-reset";
import { hashPassword, verifyPassword } from "../src/lib/server/password";

type ResetTarget = {
  identifier: string;
  password: string;
};

type UserRow = {
  id: string;
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
    "",
    "Options:",
    "  --apply   Execute the update. Without this flag the script runs in dry-run mode.",
    "  --help    Show this help.",
  ].join("\n"));
}

function parseArgs(argv: string[]): { apply: boolean; targets: ResetTarget[] } {
  let apply = false;
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

  if (targets.length === 0) {
    throw new Error("No reset targets provided");
  }

  return { apply, targets };
}

async function findUser(identifier: string): Promise<UserRow> {
  const normalized = identifier.trim().toLowerCase();
  const rows = normalized.includes("@")
    ? await prisma.$queryRaw<UserRow[]>`
        SELECT id, email, is_active, status, COALESCE(password_reset_required, FALSE) AS password_reset_required, hashed_password
        FROM users
        WHERE LOWER(email) = ${normalized}
        LIMIT 2
      `
    : await prisma.$queryRaw<UserRow[]>`
        SELECT id, email, is_active, status, COALESCE(password_reset_required, FALSE) AS password_reset_required, hashed_password
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
    SELECT id, email, is_active, status, COALESCE(password_reset_required, FALSE) AS password_reset_required, hashed_password
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
  const { apply, targets } = parseArgs(process.argv.slice(2));

  await ensurePasswordResetSchema(prisma);

  const resolved = await Promise.all(targets.map(async (target) => ({
    input: target,
    user: await findUser(target.identifier),
  })));

  if (!apply) {
    console.log(JSON.stringify({
      mode: "dry-run",
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