#!/usr/bin/env node
import { PrismaClient, MembershipRole, MembershipStatus } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return;
  }
  const envPath = path.join(__dirname, '../apps/web/.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=([^\n]+)/);
  if (!match) {
    throw new Error('DATABASE_URL not found in apps/web/.env.local');
  }
  process.env.DATABASE_URL = match[1];
}

function buildPilotMrns() {
  return Array.from({ length: 25 }, (_, i) => `IMC-2026-02${String(i).padStart(3, '0')}`);
}

async function main() {
  loadDatabaseUrl();
  const prisma = new PrismaClient();

  const pilotEmail = 'dr.ahmed@wathiqcare.med.sa';
  const pilotMrns = new Set(buildPilotMrns());

  try {
    const candidateCases = await prisma.case.findMany({
      where: {
        OR: [
          { medicalRecordNo: { startsWith: 'IMC-2026-02' } },
          { metadata: { path: ['mrn'], string_contains: 'IMC-2026-02' } },
        ],
      },
      select: { id: true, tenantId: true, medicalRecordNo: true, metadata: true },
      take: 500,
    });

    const pilotCases = candidateCases.filter((item) => {
      const mrnFromMetadata = item?.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
        ? item.metadata.mrn
        : null;
      const mrn = typeof item.medicalRecordNo === 'string' && item.medicalRecordNo.trim()
        ? item.medicalRecordNo.trim()
        : typeof mrnFromMetadata === 'string'
          ? mrnFromMetadata.trim()
          : '';
      return pilotMrns.has(mrn);
    });

    if (pilotCases.length === 0) {
      throw new Error('No pilot UAT cases found for MRN range IMC-2026-02000..02024');
    }

    const tenantCounts = new Map();
    for (const c of pilotCases) {
      tenantCounts.set(c.tenantId, (tenantCounts.get(c.tenantId) || 0) + 1);
    }

    const targetTenantId = [...tenantCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const targetTenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
    if (!targetTenant) {
      throw new Error(`Target tenant ${targetTenantId} not found`);
    }

    const user = await prisma.user.findUnique({
      where: { email: pilotEmail },
      include: { memberships: true },
    });

    if (!user) {
      throw new Error(`User not found: ${pilotEmail}`);
    }

    await prisma.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: targetTenantId,
          userId: user.id,
        },
      },
      update: {
        status: MembershipStatus.ACTIVE,
        suspendedAt: null,
        role: MembershipRole.MEMBER,
        metadata: {
          source: 'fix-pilot-physician-membership',
          uatTestData: true,
          dataClassification: 'TESTING_ONLY',
        },
      },
      create: {
        tenantId: targetTenantId,
        userId: user.id,
        role: MembershipRole.MEMBER,
        status: MembershipStatus.ACTIVE,
        suspendedAt: null,
        metadata: {
          source: 'fix-pilot-physician-membership',
          uatTestData: true,
          dataClassification: 'TESTING_ONLY',
        },
      },
    });

    if (user.tenantId !== targetTenantId || user.role !== 'PHYSICIAN' || user.status !== 'active' || !user.isActive) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          tenantId: targetTenantId,
          role: 'PHYSICIAN',
          status: 'active',
          isActive: true,
        },
      });
    }

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          where: { tenantId: targetTenantId },
          select: { tenantId: true, role: true, status: true, suspendedAt: true },
        },
        primaryTenant: { select: { id: true, name: true, code: true, isActive: true } },
      },
    });

    console.log(JSON.stringify({
      membershipStatus: refreshed?.memberships?.[0]?.status || 'MISSING',
      tenantLinkage: refreshed?.tenantId === targetTenantId,
      targetTenant: targetTenant,
      user: refreshed ? {
        id: refreshed.id,
        email: refreshed.email,
        role: refreshed.role,
        status: refreshed.status,
        isActive: refreshed.isActive,
        tenantId: refreshed.tenantId,
      } : null,
      membership: refreshed?.memberships?.[0] || null,
      pilotCaseCountInTargetTenant: tenantCounts.get(targetTenantId) || 0,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Fix failed:', error.message);
  process.exit(1);
});
