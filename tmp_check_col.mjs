import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rows = await prisma.$queryRaw`
    SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
    WHERE table_name = 'signing_secure_tokens' AND column_name IN ('token','token_hash')
    ORDER BY column_name;
  `;
  console.log(rows);
}
main().finally(() => prisma.$disconnect());
