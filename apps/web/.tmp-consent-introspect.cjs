const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema='public' AND table_name LIKE 'consent_%'
      ORDER BY table_name
    `);
    console.log('CONSENT_TABLES=' + tables.length);
    console.log(JSON.stringify(tables, null, 2));
  } finally {
    await prisma.$disconnect();
  }
})();
