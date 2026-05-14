import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  const tests = [];
  
  try {
    // Test 1: Can we read from CaseOperationState?
    console.log('\n[Test 1] Reading CaseOperationState...');
    const opStates = await prisma.caseOperationState.findMany({
      select: { caseId: true, status: true, slaState: true },
      take: 5
    });
    console.log(`✅ Found ${opStates.length} operation states`);
    tests.push({ name: 'CaseOperationState.findMany', status: 'PASS' });
  } catch (e) {
    console.error(`❌ CaseOperationState.findMany failed: ${e.message}`);
    tests.push({ name: 'CaseOperationState.findMany', status: 'FAIL', error: e.message });
  }
  
  try {
    // Test 2: Can we read cases?
    console.log('\n[Test 2] Reading Cases...');
    const cases = await prisma.case.findMany({
      select: { id: true, createdAt: true, closedAt: true },
      take: 5
    });
    console.log(`✅ Found ${cases.length} cases`);
    tests.push({ name: 'Case.findMany', status: 'PASS' });
  } catch (e) {
    console.error(`❌ Case.findMany failed: ${e.message}`);
    tests.push({ name: 'Case.findMany', status: 'FAIL', error: e.message });
  }
  
  try {
    // Test 3: Check for any database connection issues
    console.log('\n[Test 3] Checking database connection...');
    const health = await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ Database connection healthy`);
    tests.push({ name: 'Database.connection', status: 'PASS' });
  } catch (e) {
    console.error(`❌ Database connection failed: ${e.message}`);
    tests.push({ name: 'Database.connection', status: 'FAIL', error: e.message });
  }
  
  console.log('\n=== SUMMARY ===');
  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`- ${t.name}: ${t.error}`);
    });
  }
  
  await prisma.$disconnect();
}

diagnose().catch(console.error);
