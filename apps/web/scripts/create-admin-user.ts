import "dotenv/config";

import { UserType } from "@prisma/client";
import { getPrisma } from "@/lib/server/prisma";
import { hashPassword } from "@/lib/server/password";

const ADMIN_ROLE = "ADMIN";
const DEFAULT_TENANT_CODE = "default";
const DEFAULT_TENANT_NAME = "Default Tenant";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function ensureDefaultTenant() {
  const prisma = getPrisma();

  return prisma.tenant.upsert({
    where: { code: DEFAULT_TENANT_CODE },
    update: {
      name: DEFAULT_TENANT_NAME,
      isActive: true,
    },
    create: {
      code: DEFAULT_TENANT_CODE,
      name: DEFAULT_TENANT_NAME,
      isActive: true,
      authConfig: {
        password_enabled: true,
        microsoft_sso_enabled: false,
        secure_link_enabled: false,
      },
    },
  });
}

async function main() {
  const prisma = getPrisma();

  const tenant = await ensureDefaultTenant();
  const email = requireEnv("WATHIQCARE_ADMIN_EMAIL").toLowerCase();
  const password = requireEnv("WATHIQCARE_ADMIN_PASSWORD");

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  const hashedPassword = await hashPassword(password);

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        tenantId: tenant.id,
        role: ADMIN_ROLE,
        userType: UserType.TENANT_ADMIN,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        hashedPassword,
        lastPasswordChangedAt: new Date(),
      },
    });
    console.log(`Admin user already existed and was updated: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      fullName: "WathiqCare Administrator",
      role: ADMIN_ROLE,
      userType: UserType.TENANT_ADMIN,
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      hashedPassword,
      lastPasswordChangedAt: new Date(),
    },
  });

  console.log(`Admin user created: ${email}`);
}

main()
  .catch((error) => {
    console.error("Failed to create admin user", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
