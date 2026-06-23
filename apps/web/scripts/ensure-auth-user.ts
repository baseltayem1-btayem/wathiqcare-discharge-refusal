import "dotenv/config";

import { PrismaClient, $Enums, MembershipRole, MembershipStatus, SubscriberModuleAccessStatus, UserType } from "@prisma/client";
import { ensurePasswordResetSchema } from "../src/lib/server/auth-reset";
import { extractDomain, normalizeEmail } from "../src/lib/server/auth-domain-policy";
import { MODULE_DEFINITIONS, type ModuleKey } from "../src/lib/modules/catalog";
import { hashPassword, verifyPassword } from "../src/lib/server/password";
import { canonicalizeUserRole, membershipRoleForUserRole, userTypeForUserRole } from "../src/lib/server/roles";

type ParsedArgs = {
  apply: boolean;
  email: string;
  password: string | null;
  fullName: string;
  role: string;
  userType: UserType | null;
  tenantCode: string | null;
  tenantId: string | null;
  moduleKeys: ModuleKey[];
};

type UserSnapshot = {
  id: string;
  email: string;
  tenantId: string;
  fullName: string;
  role: string;
  userType: UserType;
  isActive: boolean;
  status: string;
  emailVerified: boolean;
  hashedPassword: string | null;
};

const DEFAULT_EMAIL = "dr.ahmed@wathiqcare.med.sa";
const DEFAULT_ROLE = "doctor";
const DEFAULT_FULL_NAME = "Dr. Ahmed";
const DEFAULT_MODULE_KEYS = MODULE_DEFINITIONS.map((item) => item.key);
const prisma = new PrismaClient();

function printUsage(): void {
  console.log([
    "Usage:",
    "  npm run auth:ensure-user -- --apply --password '<PASSWORD>' [options]",
    "",
    "Options:",
    `  --email <value>        Target user email (default: ${DEFAULT_EMAIL})`,
    "  --password <value>     Password to verify/hash (required with --apply).",
    `  --role <value>         User role (default: ${DEFAULT_ROLE})`,
    `  --full-name <value>    User full name (default: ${DEFAULT_FULL_NAME})`,
    "  --tenant-code <value>  Tenant code used for create/fix.",
    "  --tenant-id <value>    Tenant id used for create/fix.",
    "  --user-type <value>    PLATFORM_ADMIN | TENANT_ADMIN | TENANT_USER (optional override).",
    "  --module <value>       Module key to enforce ACTIVE access (repeatable).",
    "  --apply                Apply changes. Without this flag script is dry-run.",
  ].join("\n"));
}

function parseUserType(value: string | null | undefined): UserType | null {
  const normalized = (value || "").trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (normalized === UserType.PLATFORM_ADMIN) return UserType.PLATFORM_ADMIN;
  if (normalized === UserType.TENANT_ADMIN) return UserType.TENANT_ADMIN;
  if (normalized === UserType.TENANT_USER) return UserType.TENANT_USER;
  throw new Error(`Invalid --user-type value: ${value}`);
}

function parseModuleKey(value: string): ModuleKey {
  const normalized = value.trim().toLowerCase();
  const moduleKey = DEFAULT_MODULE_KEYS.find((item) => item === normalized);
  if (!moduleKey) {
    throw new Error(`Invalid --module value: ${value}`);
  }
  return moduleKey;
}

function parseArgs(argv: string[]): ParsedArgs {
  let apply = false;
  let email = DEFAULT_EMAIL;
  let password: string | null = null;
  let fullName = DEFAULT_FULL_NAME;
  let role = DEFAULT_ROLE;
  let userType: UserType | null = null;
  let tenantCode: string | null = null;
  let tenantId: string | null = null;
  const moduleKeys: ModuleKey[] = [];

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
    if (arg === "--email") {
      email = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--password") {
      password = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--full-name") {
      fullName = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--role") {
      role = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg === "--user-type") {
      userType = parseUserType(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--tenant-code") {
      tenantCode = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--tenant-id") {
      tenantId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--module") {
      moduleKeys.push(parseModuleKey(argv[index + 1] ?? ""));
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error(`Invalid --email value: ${email}`);
  }

  const resolvedModules = moduleKeys.length > 0 ? [...new Set(moduleKeys)] : DEFAULT_MODULE_KEYS;
  if (apply && !password) {
    throw new Error("--password is required when --apply is provided");
  }

  return {
    apply,
    email: normalizedEmail,
    password,
    fullName: fullName.trim() || DEFAULT_FULL_NAME,
    role: role.trim() || DEFAULT_ROLE,
    userType,
    tenantCode: tenantCode?.trim() || null,
    tenantId: tenantId?.trim() || null,
    moduleKeys: resolvedModules,
  };
}

async function inspectAuthAccounts(email: string, userId: string | null) {
  const tableRows = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
    SELECT to_regclass('public.auth_accounts')::text AS table_name
  `;
  const hasTable = Boolean(tableRows[0]?.table_name);

  if (!hasTable) {
    return { hasTable, rowCountByUserId: 0, rowCountByEmail: 0, passwordHashPresent: false };
  }

  const byUserId = userId
    ? await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM auth_accounts WHERE user_id = ${userId}
    `
    : [{ count: BigInt(0) }];

  const byEmail = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM auth_accounts WHERE LOWER(email) = ${email}
  `;

  const passwordHashRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count
    FROM auth_accounts
    WHERE LOWER(email) = ${email}
      AND password_hash IS NOT NULL
      AND LENGTH(password_hash) > 0
  `;

  return {
    hasTable,
    rowCountByUserId: Number(byUserId[0]?.count ?? 0),
    rowCountByEmail: Number(byEmail[0]?.count ?? 0),
    passwordHashPresent: Number(passwordHashRows[0]?.count ?? 0) > 0,
  };
}

async function resolveTenant(args: ParsedArgs, existingUser: UserSnapshot | null) {
  if (existingUser?.tenantId) {
    return prisma.tenant.findUnique({ where: { id: existingUser.tenantId } });
  }

  if (args.tenantId) {
    return prisma.tenant.findUnique({ where: { id: args.tenantId } });
  }

  if (args.tenantCode) {
    return prisma.tenant.findUnique({ where: { code: args.tenantCode } });
  }

  const domain = extractDomain(args.email);
  if (!domain) {
    return null;
  }

  const domainTenant = await prisma.tenantAllowedDomain.findFirst({
    where: { domain, isActive: true, tenant: { isActive: true } },
    select: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
  return domainTenant?.tenant ?? null;
}

async function ensureModuleAccess(tenantId: string, moduleKeys: ModuleKey[]) {
  const tableRows = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
    SELECT to_regclass('public.subscriber_module_access')::text AS table_name
  `;
  const hasTable = Boolean(tableRows[0]?.table_name);
  if (!hasTable) {
    return { hasTable, ensured: [] as ModuleKey[] };
  }

  for (const moduleKey of moduleKeys) {
    await prisma.subscriberModuleAccess.upsert({
      where: { subscriberId_moduleKey: { subscriberId: tenantId, moduleKey } },
      update: {
        status: SubscriberModuleAccessStatus.ACTIVE as $Enums.SubscriberModuleAccessStatus,
        activatedAt: new Date(),
        deactivatedAt: null,
        notes: "Ensured by auth user remediation",
      },
      create: {
        subscriberId: tenantId,
        moduleKey,
        status: SubscriberModuleAccessStatus.ACTIVE as $Enums.SubscriberModuleAccessStatus,
        activatedAt: new Date(),
        notes: "Ensured by auth user remediation",
      },
    });
  }

  return { hasTable, ensured: moduleKeys };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const canonicalRole = canonicalizeUserRole(args.role);
  const membershipRole = membershipRoleForUserRole(canonicalRole);
  const resolvedUserType = args.userType ?? userTypeForUserRole(canonicalRole);

  const existing = await prisma.user.findUnique({
    where: { email: args.email },
    select: {
      id: true,
      email: true,
      tenantId: true,
      fullName: true,
      role: true,
      userType: true,
      isActive: true,
      status: true,
      emailVerified: true,
      hashedPassword: true,
    },
  });

  const tenant = await resolveTenant(args, existing);
  const passwordMatches = args.password && existing?.hashedPassword
    ? await verifyPassword(args.password, existing.hashedPassword)
    : null;
  const authAccounts = await inspectAuthAccounts(args.email, existing?.id ?? null);

  const summary = {
    mode: args.apply ? "apply" : "dry-run",
    target: {
      email: args.email,
      fullName: args.fullName,
      role: canonicalRole,
      userType: resolvedUserType,
      tenantId: tenant?.id ?? null,
      tenantCode: tenant?.code ?? null,
      modules: args.moduleKeys,
    },
    user: existing
      ? {
        id: existing.id,
        isActive: existing.isActive,
        status: existing.status,
        emailVerified: existing.emailVerified,
        hasHashedPassword: Boolean(existing.hashedPassword),
        passwordMatches,
      }
      : null,
    authAccounts,
  };

  if (!args.apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (!tenant) {
    throw new Error("No tenant resolved for user creation/update; provide --tenant-code or --tenant-id");
  }

  await ensurePasswordResetSchema(prisma);
  const passwordHash = await hashPassword(args.password as string);

  const user = existing
    ? await prisma.user.update({
      where: { id: existing.id },
      data: {
        tenantId: tenant.id,
        fullName: args.fullName,
        role: membershipRole as $Enums.MembershipRole,
        userType: resolvedUserType as $Enums.UserType,
        status: MembershipStatus.ACTIVE as $Enums.MembershipStatus,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        authProvider: "local_password",
        hashedPassword: passwordHash,
        lastPasswordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      select: { id: true, email: true, tenantId: true },
    })
    : await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: args.email,
        fullName: args.fullName,
        role: membershipRole as $Enums.MembershipRole,
        userType: resolvedUserType as $Enums.UserType,
        status: MembershipStatus.ACTIVE as $Enums.MembershipStatus,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        authProvider: "local_password",
        hashedPassword: passwordHash,
        lastPasswordChangedAt: new Date(),
      },
      select: { id: true, email: true, tenantId: true },
    });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { role: membershipRole as $Enums.MembershipRole, status: MembershipStatus.ACTIVE as $Enums.MembershipStatus },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: membershipRole as $Enums.MembershipRole,
      status: MembershipStatus.ACTIVE as $Enums.MembershipStatus,
    },
  });

  await prisma.$executeRaw`
    UPDATE users
    SET password_reset_required = FALSE,
        session_revoked_at = NULL
    WHERE id = ${user.id}
  `;

  const moduleAccess = await ensureModuleAccess(tenant.id, args.moduleKeys);

  console.log(JSON.stringify({
    ...summary,
    user: {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      membershipRole,
      passwordMatches: await verifyPassword(args.password as string, passwordHash),
    },
    moduleAccess,
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
