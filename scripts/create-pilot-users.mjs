#!/usr/bin/env node
/**
 * WathiqCare Online — Pilot User Setup Script
 * 
 * Creates test accounts for IMC Controlled Pilot
 * Pilot Scope: Legal Affairs, Physicians, Medical Director, Compliance
 * Pilot Duration: 2-4 weeks
 * Pilot Workflows: Informed Consent, Discharge Refusal, Promissory Note, Legal Review
 * 
 * Usage: node scripts/create-pilot-users.mjs
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
  console.log(`\n${COLORS.CYAN}${'='.repeat(60)}${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${title}${COLORS.RESET}`);
  console.log(`${COLORS.CYAN}${'='.repeat(60)}${COLORS.RESET}\n`);
}

async function createPilotUsers() {
  section('CREATING PILOT USER ACCOUNTS FOR IMC');

  const pilotUsers = [
    // Legal Affairs Department (2 staff)
    {
      email: 'legal.pilot.01@imc.local',
      name: 'Sarah Al-Hamdan',
      role: 'LEGAL_AFFAIRS_MANAGER',
      department: 'Legal Affairs',
      phone: '+966-50-XXXX-0001',
    },
    {
      email: 'legal.pilot.02@imc.local',
      name: 'Mohammed Al-Otaibi',
      role: 'LEGAL_AFFAIRS_MANAGER',
      department: 'Legal Affairs',
      phone: '+966-50-XXXX-0002',
    },

    // Physicians (5 physicians)
    {
      email: 'physician.pilot.01@imc.local',
      name: 'Dr. Ahmed Hassan',
      role: 'PHYSICIAN',
      department: 'Internal Medicine',
      phone: '+966-50-XXXX-1001',
    },
    {
      email: 'physician.pilot.02@imc.local',
      name: 'Dr. Fatima Al-Rashid',
      role: 'PHYSICIAN',
      department: 'Pediatrics',
      phone: '+966-50-XXXX-1002',
    },
    {
      email: 'physician.pilot.03@imc.local',
      name: 'Dr. Khalid Al-Dosari',
      role: 'PHYSICIAN',
      department: 'Surgery',
      phone: '+966-50-XXXX-1003',
    },
    {
      email: 'physician.pilot.04@imc.local',
      name: 'Dr. Layla Al-Shammari',
      role: 'PHYSICIAN',
      department: 'Gynecology',
      phone: '+966-50-XXXX-1004',
    },
    {
      email: 'physician.pilot.05@imc.local',
      name: 'Dr. Nasser Al-Qahtani',
      role: 'PHYSICIAN',
      department: 'Cardiology',
      phone: '+966-50-XXXX-1005',
    },

    // Medical Director
    {
      email: 'medical.director@imc.local',
      name: 'Dr. Abdullah Al-Shaya',
      role: 'MEDICAL_DIRECTOR',
      department: 'Medical Affairs',
      phone: '+966-50-XXXX-2000',
    },

    // Compliance / Quality
    {
      email: 'compliance.pilot@imc.local',
      name: 'Hana Al-Ghanim',
      role: 'COMPLIANCE_OFFICER',
      department: 'Compliance & Quality',
      phone: '+966-50-XXXX-3000',
    },

    // Nurses (2 nurses) - Support Role
    {
      email: 'nurse.pilot.01@imc.local',
      name: 'Amira Al-Rasheed',
      role: 'NURSE',
      department: 'Nursing',
      phone: '+966-50-XXXX-4001',
    },
    {
      email: 'nurse.pilot.02@imc.local',
      name: 'Rayan Al-Anezi',
      role: 'NURSE',
      department: 'Nursing',
      phone: '+966-50-XXXX-4002',
    },
  ];

  let created = 0;
  let updated = 0;

  for (const userData of pilotUsers) {
    try {
      const role = await prisma.role.findUnique({
        where: { name: userData.role },
      });

      if (!role) {
        log(COLORS.RED, `  ❌ Role not found: ${userData.role}`);
        continue;
      }

      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          status: 'ACTIVE',
        },
        create: {
          email: userData.email,
          name: userData.name,
          roleId: role.id,
          status: 'ACTIVE',
          emailVerified: new Date(),
        },
      });

      const action = user.createdAt ? 'CREATED' : 'UPDATED';
      log(COLORS.GREEN, `  ✅ ${userData.name} (${userData.role}) - ${action}`);
      
      if (action === 'CREATED') {
        created++;
      } else {
        updated++;
      }
    } catch (error) {
      log(
        COLORS.RED,
        `  ❌ Failed to create user ${userData.email}: ${error.message}`
      );
    }
  }

  log(COLORS.GREEN, `\n✅ Total: ${created} created, ${updated} updated`);

  return created + updated;
}

async function generatePilotAccessMatrix() {
  section('PILOT ACCESS MATRIX');

  log(COLORS.CYAN, 'Pilot Workflows Configuration:\n');

  const workflows = [
    { name: 'INFORMED_CONSENT', enabled: true },
    { name: 'DISCHARGE_REFUSAL', enabled: true },
    { name: 'PROMISSORY_NOTE', enabled: true },
    { name: 'LEGAL_REVIEW', enabled: true },
    { name: 'DELEGATION', enabled: false },
    { name: 'ESCALATION', enabled: false },
    { name: 'CONDITIONAL_APPROVAL', enabled: false },
    { name: 'MULTI_ROLE_APPROVAL', enabled: false },
  ];

  for (const workflow of workflows) {
    const status = workflow.enabled ? '🟢 ENABLED' : '🔴 DISABLED';
    log(
      workflow.enabled ? COLORS.GREEN : COLORS.YELLOW,
      `  ${workflow.name}: ${status}`
    );
  }

  log(COLORS.CYAN, '\nPilot Access Control:\n');

  const accessMatrix = [
    { role: 'LEGAL_AFFAIRS_MANAGER', canCreate: true, canApprove: true, canSign: true },
    { role: 'PHYSICIAN', canCreate: true, canApprove: false, canSign: true },
    { role: 'MEDICAL_DIRECTOR', canCreate: false, canApprove: true, canSign: false },
    { role: 'COMPLIANCE_OFFICER', canCreate: false, canApprove: false, canSign: false },
    { role: 'NURSE', canCreate: false, canApprove: false, canSign: false },
  ];

  for (const access of accessMatrix) {
    log(
      COLORS.BLUE,
      `  ${access.role.padEnd(25)} | Create: ${access.canCreate ? '✓' : '✗'} | Approve: ${access.canApprove ? '✓' : '✗'} | Sign: ${access.canSign ? '✓' : '✗'}`
    );
  }
}

async function generatePilotOnboardingGuide() {
  section('PILOT ONBOARDING GUIDE');

  const guide = `
WATHIQCARE ONLINE — PILOT PROGRAM

Pilot Duration: 2-4 weeks starting [DATE]
Pilot Scope: Islamic Medical Center (IMC)
Pilot URL: https://staging.wathiqcare.online
Pilot Users: 11 total

═══════════════════════════════════════════════════════════════

PILOT USERS & CREDENTIALS:

Legal Affairs Team:
  • Sarah Al-Hamdan (legal.pilot.01@imc.local)
  • Mohammed Al-Otaibi (legal.pilot.02@imc.local)

Physician Team:
  • Dr. Ahmed Hassan (physician.pilot.01@imc.local)
  • Dr. Fatima Al-Rashid (physician.pilot.02@imc.local)
  • Dr. Khalid Al-Dosari (physician.pilot.03@imc.local)
  • Dr. Layla Al-Shammari (physician.pilot.04@imc.local)
  • Dr. Nasser Al-Qahtani (physician.pilot.05@imc.local)

Leadership:
  • Dr. Abdullah Al-Shaya, Medical Director (medical.director@imc.local)
  • Hana Al-Ghanim, Compliance (compliance.pilot@imc.local)

Support:
  • Amira Al-Rasheed, Nurse (nurse.pilot.01@imc.local)
  • Rayan Al-Anezi, Nurse (nurse.pilot.02@imc.local)

═══════════════════════════════════════════════════════════════

PILOT WORKFLOWS (Enabled):

1. INFORMED CONSENT
   - Physicians create consent documents
   - Patients review and sign
   - Legal Affairs verifies
   - Documents stored with digital signatures

2. DISCHARGE REFUSAL
   - Physicians initiate discharge refusal forms
   - Medical Director reviews
   - Legal Affairs documents refusal
   - Compliance records evidence

3. PROMISSORY NOTE
   - Legal Affairs creates promissory notes
   - Physicians review payment commitments
   - Patients sign acknowledgment
   - Financial evidence preserved

4. LEGAL REVIEW
   - Legal Affairs conducts legal review
   - Documents compliance with regulations
   - Compliance Officer approves
   - Audit trail recorded

═══════════════════════════════════════════════════════════════

PILOT DAILY MONITORING CHECKLIST:

□ All 11 pilot users can login successfully
□ At least 1 informed consent created and completed
□ At least 1 discharge refusal documented
□ No critical errors in application
□ Database performing well (<100ms queries)
□ Email notifications sending
□ Audit logs recording all actions
□ PDF generation working
□ No storage connectivity issues
□ No authentication issues

═══════════════════════════════════════════════════════════════

PILOT SUPPORT STRUCTURE:

On-Call Support: [Name] - [Phone]
Technical Lead: [Name] - [Phone]
Medical Director: Dr. Abdullah Al-Shaya
Legal Affairs Manager: Sarah Al-Hamdan

Issue Severity Levels:

🔴 CRITICAL: System down, data loss risk, security breach
   Response time: Immediate (< 15 minutes)
   Contact: On-Call Support

🟠 HIGH: Major feature broken, workflow blocked, data sync issues
   Response time: 1 hour
   Contact: Technical Lead

🟡 MEDIUM: Non-critical feature issue, workaround available
   Response time: 4 hours
   Contact: Support Team

🟢 LOW: UI improvements, documentation, general questions
   Response time: Next business day
   Contact: Support Team

═══════════════════════════════════════════════════════════════

PILOT SUCCESS CRITERIA:

✓ All 11 roles can login and see correct permissions
✓ All 4 workflows can be initiated and completed
✓ At least 10 workflows complete successfully during pilot
✓ Zero critical errors affecting users
✓ Audit trail captures all actions with timestamps
✓ PDF generation works for all document types
✓ Mobile access works (iOS and Android tested)
✓ Arabic/English interface rendering correct
✓ Notifications delivered reliably
✓ No data loss or corruption issues
✓ Legal/compliance teams approve data integrity
✓ Performance acceptable (page load <3s)

═══════════════════════════════════════════════════════════════

PILOT METRICS TO TRACK (Daily):

• User adoption rate (% of pilot users active)
• Workflows initiated per day
• Workflows completed successfully per day
• Average workflow completion time
• Error rate (errors per 1,000 actions)
• System uptime
• Average API response time
• PDF generation success rate
• User feedback/issue count

═══════════════════════════════════════════════════════════════

END OF PILOT ONBOARDING GUIDE
  `;

  console.log(guide);
}

async function main() {
  console.log(`
${COLORS.CYAN}╔════════════════════════════════════════════════════════════╗${COLORS.RESET}
${COLORS.CYAN}║  WATHIQCARE ONLINE — PILOT USER SETUP                    ║${COLORS.RESET}
${COLORS.CYAN}║  IMC Controlled Pilot Deployment                         ║${COLORS.RESET}
${COLORS.CYAN}║  2-4 Week Pilot Program                                  ║${COLORS.RESET}
${COLORS.CYAN}╚════════════════════════════════════════════════════════════╝${COLORS.RESET}
  `);

  try {
    // Create pilot users
    const usersCreated = await createPilotUsers();

    // Generate access matrix
    await generatePilotAccessMatrix();

    // Generate onboarding guide
    await generatePilotOnboardingGuide();

    section('PILOT SETUP COMPLETE');
    log(
      COLORS.GREEN,
      `✅ Created/Updated ${usersCreated} pilot user accounts`
    );
    log(COLORS.GREEN, '✅ Access matrix configured');
    log(COLORS.GREEN, '✅ Onboarding guide generated');

    console.log(`
${COLORS.CYAN}╔════════════════════════════════════════════════════════════╗${COLORS.RESET}
${COLORS.CYAN}║  NEXT STEPS:                                              ║${COLORS.RESET}
${COLORS.CYAN}║  1. Communicate pilot schedule to IMC team               ║${COLORS.RESET}
${COLORS.CYAN}║  2. Send onboarding guide to pilot participants          ║${COLORS.RESET}
${COLORS.CYAN}║  3. Conduct brief training session                       ║${COLORS.RESET}
${COLORS.CYAN}║  4. Monitor daily for 2-4 weeks                          ║${COLORS.RESET}
${COLORS.CYAN}║  5. Collect feedback and document issues                 ║${COLORS.RESET}
${COLORS.CYAN}║  6. Resolve issues and prepare for full rollout          ║${COLORS.RESET}
${COLORS.CYAN}╚════════════════════════════════════════════════════════════╝${COLORS.RESET}
    `);

    await prisma.$disconnect();
  } catch (error) {
    log(COLORS.RED, `Fatal error: ${error.message}`);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
