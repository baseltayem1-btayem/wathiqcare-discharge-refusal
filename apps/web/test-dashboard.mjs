import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst({
      select: { id: true, email: true, role: true },
      take: 1
    });
    
    if (!user) {
      console.log('❌ No users found in database - dashboard will fail auth');
    } else {
      console.log(`✅ Found user: ${user.email} (${user.role})`);
    }
    
    const tenant = await prisma.tenant.findFirst({ take: 1 });
    if (!tenant) {
      console.log('❌ No tenants found - dashboard will fail');
    } else {
      console.log(`✅ Found tenant: ${tenant.name}`);
    }
    
    const caseOpStates = await prisma.caseOperationState.findMany({ take: 1 });
    const cases = await prisma.case.findMany({ take: 1 });
    
    console.log(`✅ CaseOperationStates: ${caseOpStates.length}, Cases: ${cases.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
