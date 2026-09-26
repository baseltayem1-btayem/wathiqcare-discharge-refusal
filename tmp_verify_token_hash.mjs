import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const sessionId = process.argv[2];
async function main() {
  const rows = await prisma.$queryRaw`
    SELECT id, session_id, signer_role, token_hash, token, revoked_at, used_at
    FROM signing_secure_tokens
    WHERE session_id = ${sessionId}::uuid
    LIMIT 5;
  `;
  console.log(JSON.stringify(rows, null, 2));
}
main().finally(() => prisma.$disconnect());
