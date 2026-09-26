import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.case.findFirst({ where: { caseNumber: 'DEMO-IC-001' }, select: { id: true, tenantId: true } });
  console.log('case', c);
  if (c) {
    const docs = await prisma.document.findMany({ where: { caseId: c.id }, take: 5, select: { id: true, titleEn: true, status: true } });
    console.log('docs', docs);
  }
  const sessions = await prisma.$queryRaw`SELECT id, token_hash, token, session_id FROM signing_secure_tokens LIMIT 5;`;
  console.log('tokens', sessions);
}
main().finally(() => prisma.$disconnect());
