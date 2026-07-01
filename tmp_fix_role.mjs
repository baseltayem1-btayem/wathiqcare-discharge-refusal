import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.update({
    where: { email: 'smoke-physician@wathiqcare.test' },
    data: { role: 'doctor' },
  });
  console.log(JSON.stringify(user, null, 2));
}
main().finally(() => prisma.$disconnect());
