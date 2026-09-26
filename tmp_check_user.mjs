import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const u = await prisma.user.findUnique({
    where: { email: 'smoke-physician@wathiqcare.test' },
    include: { primaryTenant: true, memberships: true },
  });
  console.log(JSON.stringify(u, null, 2));
}
main().finally(() => prisma.$disconnect());
