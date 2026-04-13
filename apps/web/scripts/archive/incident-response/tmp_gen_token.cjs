/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

(async () => {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: "admin@wathiqcare.online" }, { userType: "PLATFORM_ADMIN" }] },
      include: { primaryTenant: true },
    });

    if (!user) {
      console.error("NO_PLATFORM_USER");
      process.exit(2);
    }

    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const iss = (process.env.JWT_ISSUER || "wathiqcare").trim() || "wathiqcare";
    const payloadObj = {
      sub: user.id,
      email: user.email,
      role: user.role,
      user_type: "platform_admin",
      tenant_id: user.tenantId || undefined,
      tenant_code: user.primaryTenant?.code || undefined,
      platform_role: "platform_admin",
      iss,
      exp,
    };

    const payload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
    const data = `${header}.${payload}`;
    const secret = (process.env.JWT_SECRET_KEY || "").trim();
    const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
    const token = `${data}.${sig}`;

    console.log(JSON.stringify({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tenantCode: user.primaryTenant?.code,
      token,
    }));
  } finally {
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
