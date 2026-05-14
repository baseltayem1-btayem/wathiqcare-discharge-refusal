#!/usr/bin/env node
/**
 * WathiqCare Online — Cleanup Script for Pilot Patient Data
 * 
 * Removes all synthetic test patient data from the database
 * ⚠️  WARNING: This permanently deletes test data
 * 
 * Usage: node scripts/cleanup-pilot-patients.mjs [--confirm]
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

async function countTestData() {
  log(COLORS.CYAN, '📊 Analyzing test data...\n');

  const casesCount = await prisma.case.count({
    where: {
      metadata: {
        path: ['uatTestData'],
        equals: true,
      },
    },
  });

  const notesCount = await prisma.promissoryNote.count({
    where: {
      metadata: {
        path: ['uatTestData'],
        equals: true,
      },
    },
  });

  log(COLORS.YELLOW, `  Test Cases to Remove: ${casesCount}`);
  log(COLORS.YELLOW, `  Test Promissory Notes to Remove: ${notesCount}`);

  return { casesCount, notesCount };
}

async function deleteTestData() {
  section('REMOVING TEST PATIENT DATA');

  try {
    log(COLORS.BLUE, 'Deleting promissory notes...');
    const deletedNotes = await prisma.promissoryNote.deleteMany({
      where: {
        metadata: {
          path: ['uatTestData'],
          equals: true,
        },
      },
    });

    log(COLORS.GREEN, `  ✅ Deleted ${deletedNotes.count} promissory notes`);

    log(COLORS.BLUE, 'Deleting cases...');
    const deletedCases = await prisma.case.deleteMany({
      where: {
        metadata: {
          path: ['uatTestData'],
          equals: true,
        },
      },
    });

    log(COLORS.GREEN, `  ✅ Deleted ${deletedCases.count} cases`);

    return { deletedCases: deletedCases.count, deletedNotes: deletedNotes.count };
  } catch (error) {
    log(COLORS.RED, `❌ Error during deletion: ${error.message}`);
    throw error;
  }
}

async function verifyCleanup() {
  section('VERIFYING CLEANUP');

  const remainingCases = await prisma.case.count({
    where: {
      metadata: {
        path: ['uatTestData'],
        equals: true,
      },
    },
  });

  const remainingNotes = await prisma.promissoryNote.count({
    where: {
      metadata: {
        path: ['uatTestData'],
        equals: true,
      },
    },
  });

  if (remainingCases === 0 && remainingNotes === 0) {
    log(COLORS.GREEN, '✅ All test data successfully removed!');
    return true;
  } else {
    log(COLORS.RED, `❌ Cleanup verification failed!`);
    log(COLORS.RED, `  Remaining cases: ${remainingCases}`);
    log(COLORS.RED, `  Remaining notes: ${remainingNotes}`);
    return false;
  }
}

async function main() {
  section('WATHIQCARE — CLEANUP TEST PATIENT DATA');

  try {
    const isConfirmed = process.argv.includes('--confirm');

    const counts = await countTestData();

    if (!isConfirmed) {
      log(COLORS.YELLOW, '⚠️  This will permanently delete all test patient data!');
      log(COLORS.YELLOW, '\nTo confirm deletion, run:\n');
      log(COLORS.CYAN, '  node scripts/cleanup-pilot-patients.mjs --confirm\n');
      process.exit(0);
    }

    const deleted = await deleteTestData();
    const verified = await verifyCleanup();

    section('CLEANUP COMPLETE');

    if (verified) {
      log(COLORS.GREEN, `✅ Successfully cleaned up test data:`);
      log(COLORS.GREEN, `   • ${deleted.deletedCases} cases removed`);
      log(COLORS.GREEN, `   • ${deleted.deletedNotes} promissory notes removed`);
    } else {
      log(COLORS.RED, '❌ Cleanup did not complete successfully!');
      process.exit(1);
    }

  } catch (error) {
    log(COLORS.RED, `❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
