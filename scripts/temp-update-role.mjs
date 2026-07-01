import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: "cme.test@wathiqcare.med.sa" },
    data: { role: "DOCTOR" },
  });
  console.log("updated user:", user.id, user.role);
  const membership = await prisma.tenantMembership.updateMany({
    where: { userId: user.id },
    data: { role: "DOCTOR" },
  });
  console.log("updated memberships:", membership.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
