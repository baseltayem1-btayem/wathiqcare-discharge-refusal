require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyUATData() {
  try {
    // Check if the UAT physician exists
    const physician = await prisma.user.findUnique({
      where: { email: 'dr.ahmed@wathiqcare.med.sa' },
      select: { id: true, email: true, hashedPassword: true },
    });

    const authHashPresent = physician?.hashedPassword ? true : false;

    // Check if UAT MRNs exist
    const mrnCount = await prisma.case.count({
      where: { medicalRecordNo: { not: null } },
    });

    console.log('UAT physician exists:', authHashPresent ? 'YES' : 'NO');
    console.log('UAT MRN count found:', mrnCount);

    // If physician does not exist, run the seed script
    if (!authHashPresent) {
      console.log('Seeding UAT physician...');
      // Add your seed script logic here
    }

    // If MRNs do not exist, run the patient seed script
    if (mrnCount === 0) {
      console.log('Seeding UAT MRNs...');
      // Add your patient seed script logic here
    }
  } catch (error) {
    console.error('Error verifying UAT data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUATData();