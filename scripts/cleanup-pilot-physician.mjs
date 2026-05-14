#!/usr/bin/env node
/**
 * WathiqCare Online — Cleanup Pilot Physician Account
 * 
 * Safely removes the UAT pilot physician account and unlinks all cases
 * 
 * Usage: node scripts/cleanup-pilot-physician.mjs [--confirm]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function section(title) {
  console.log(`\n${COLORS.CYAN}${'═'.repeat(75)}${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${title}${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${'═'.repeat(75)}${COLORS.RESET}\n`);
}

function subsection(title) {
  console.log(`${COLORS.BLUE}▶ ${title}${COLORS.RESET}`);
}

async function findPilotPhysician() {
  subsection('Finding pilot physician account');

  const physician = await prisma.user.findUnique({
    where: { email: 'dr.ahmed@wathiqcare.med.sa' },
  });

  if (!physician) {
    log(COLORS.YELLOW, '  ⚠️  Pilot physician not found (already deleted or never created)');
    return null;
  }

  log(COLORS.GREEN, `  ✅ Found: ${physician.fullName} (${physician.email})`);
  return physician;
}

async function countAffectedCases(physicianId) {
  subsection('Counting affected cases');

  const count = await prisma.case.count({
    where: {
      createdByUserId: physicianId,
      metadata: {
        path: ['uatTestData'],
        equals: true,
      },
    },
  });

  log(COLORS.YELLOW, `  Cases with physician assignment: ${count}`);
  return count;
}

async function unlinkCases(physicianId) {
  subsection('Unlinking cases from physician');

  const cases = await prisma.case.findMany({
    where: {
      createdByUserId: physicianId,
      metadata: {
        path: ['uatTestData'],
        equals: true,
      },
    },
  });

  let unlinked = 0;

  for (const testCase of cases) {
    try {
      const updatedMetadata = { ...testCase.metadata };
      delete updatedMetadata.assignedPhysicianId;
      delete updatedMetadata.assignedPhysicianEmail;
      delete updatedMetadata.assignedPhysicianNameEn;
      delete updatedMetadata.assignedPhysicianNameAr;
      delete updatedMetadata.physicianSpecialty;
      delete updatedMetadata.physicianAssignedAt;

      await prisma.case.update({
        where: { id: testCase.id },
        data: {
          createdByUserId: null,
          metadata: updatedMetadata,
        },
      });

      unlinked++;
    } catch (error) {
      log(COLORS.YELLOW, `  ⚠️  Could not unlink case: ${error.message}`);
    }
  }

  log(COLORS.GREEN, `  ✅ Unlinked ${unlinked} cases from physician`);
}

async function deletePhysician(physicianId) {
  subsection('Deleting pilot physician account');

  try {
    await prisma.user.delete({
      where: { id: physicianId },
    });

    log(COLORS.GREEN, `  ✅ Deleted physician account`);
  } catch (error) {
    log(COLORS.RED, `  ❌ Failed to delete: ${error.message}`);
    throw error;
  }
}

async function verifyCleanup(physicianId) {
  subsection('Verifying cleanup');

  const remainingPhysician = await prisma.user.findUnique({
    where: { id: physicianId },
  }).catch(() => null);

  if (!remainingPhysician) {
    log(COLORS.GREEN, '  ✅ Physician account successfully deleted');
    return true;
  } else {
    log(COLORS.RED, '  ❌ Physician account still exists');
    return false;
  }
}

async function main() {
  section('WATHIQCARE — CLEANUP PILOT PHYSICIAN ACCOUNT');

  try {
    const isConfirmed = process.argv.includes('--confirm');

    const physician = await findPilotPhysician();

    if (!physician) {
      log(COLORS.CYAN, 'Nothing to clean up.');
      process.exit(0);
    }

    const affectedCount = await countAffectedCases(physician.id);

    if (!isConfirmed) {
      log(COLORS.YELLOW, '\n⚠️  This will permanently delete the pilot physician account!');
      log(COLORS.YELLOW, `   ${affectedCount} cases will be unlinked.\n`);
      log(COLORS.YELLOW, 'To confirm deletion, run:\n');
      log(COLORS.CYAN, '  node scripts/cleanup-pilot-physician.mjs --confirm\n');
      process.exit(0);
    }

    await unlinkCases(physician.id);
    await deletePhysician(physician.id);
    const verified = await verifyCleanup(physician.id);

    section('CLEANUP COMPLETE');

    if (verified) {
      log(COLORS.GREEN, '✅ Pilot physician cleanup completed successfully!');
      log(COLORS.GREEN, `   • Deleted: dr.ahmed@wathiqcare.med.sa`);
      log(COLORS.GREEN, `   • Unlinked: ${affectedCount} cases`);
    } else {
      log(COLORS.YELLOW, '⚠️  Cleanup may not have completed fully');
      process.exit(1);
    }

  } catch (error) {
    log(COLORS.RED, `\n❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
