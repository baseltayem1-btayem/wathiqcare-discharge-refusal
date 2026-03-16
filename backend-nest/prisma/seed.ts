import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ code: string; module: string; name: string }> = [
    { code: "tenants.read", module: "admin", name: "Read tenants" },
    { code: "tenants.settings.update", module: "admin", name: "Update tenant settings" },
    { code: "roles.read", module: "rbac", name: "Read roles" },
    { code: "permissions.read", module: "rbac", name: "Read permissions" },
    { code: "users.read", module: "users", name: "Read users" },
    { code: "users.create", module: "users", name: "Create users" },
    { code: "users.update", module: "users", name: "Update users" },
    { code: "users.assign_roles", module: "users", name: "Assign user roles" },
    { code: "facilities.read", module: "reference", name: "Read facilities" },
    { code: "departments.read", module: "reference", name: "Read departments" },
    { code: "patients.read", module: "patients", name: "Read patients" },
    { code: "patients.create", module: "patients", name: "Create patients" },
    { code: "patients.update", module: "patients", name: "Update patients" },
    { code: "representatives.read", module: "patients", name: "Read representatives" },
    { code: "representatives.create", module: "patients", name: "Create representatives" },
    { code: "encounters.read", module: "encounters", name: "Read encounters" },
    { code: "encounters.create", module: "encounters", name: "Create encounters" },
    { code: "cases.read", module: "cases", name: "Read cases" },
    { code: "cases.create", module: "cases", name: "Create cases" },
    { code: "cases.update", module: "cases", name: "Update cases" },
    { code: "cases.assign", module: "cases", name: "Assign case" },
    { code: "cases.close", module: "cases", name: "Close case" },
    { code: "refusal_events.read", module: "cases", name: "Read refusal events" },
    { code: "refusal_events.create", module: "cases", name: "Create refusal event" },
    { code: "acknowledgments.read", module: "ack", name: "Read acknowledgment" },
    { code: "acknowledgments.send", module: "ack", name: "Send acknowledgment" },
    { code: "acknowledgments.respond", module: "ack", name: "Respond acknowledgment" },
    { code: "discharge.decision.read", module: "discharge", name: "Read discharge decision" },
    { code: "discharge.decision.create", module: "discharge", name: "Create discharge decision" },
    { code: "discharge.decision.update", module: "discharge", name: "Update discharge decision" },
    { code: "discharge.decision.create.override", module: "discharge", name: "Override physician rule" },
    { code: "discharge.plan.create", module: "discharge", name: "Create discharge plan" },
    { code: "discharge.plan.update", module: "discharge", name: "Update discharge plan" },
    { code: "workflows.read", module: "workflow", name: "Read workflows" },
    { code: "workflows.transition.read", module: "workflow", name: "Read transitions" },
    { code: "workflows.transition.execute", module: "workflow", name: "Execute transitions" },
    { code: "tasks.read", module: "tasks", name: "Read tasks" },
    { code: "tasks.create", module: "tasks", name: "Create tasks" },
    { code: "tasks.update", module: "tasks", name: "Update tasks" },
    { code: "tasks.complete", module: "tasks", name: "Complete tasks" },
    { code: "tasks.reassign", module: "tasks", name: "Reassign tasks" },
    { code: "tasks.comment", module: "tasks", name: "Comment on tasks" },
    { code: "documents.read", module: "documents", name: "Read documents" },
    { code: "documents.upload", module: "documents", name: "Upload documents" },
    { code: "documents.generate", module: "documents", name: "Generate documents" },
    { code: "documents.download", module: "documents", name: "Download documents" },
    { code: "documents.delete", module: "documents", name: "Delete documents" },
    { code: "notifications.read", module: "notifications", name: "Read notifications" },
    { code: "notifications.test", module: "notifications", name: "Send test notifications" },
    { code: "otp.request", module: "otp", name: "Request OTP" },
    { code: "otp.verify", module: "otp", name: "Verify OTP" },
    { code: "legal.notes.read", module: "legal", name: "Read legal notes" },
    { code: "legal.notes.create", module: "legal", name: "Create legal notes" },
    { code: "legal.hold.create", module: "legal", name: "Create legal hold" },
    { code: "legal.hold.release", module: "legal", name: "Release legal hold" },
    { code: "audit.read", module: "audit", name: "Read audit logs" },
    { code: "reports.dashboard", module: "reports", name: "Read dashboard" },
    { code: "reports.cases_summary", module: "reports", name: "Read case summary" },
    { code: "reports.tasks_overdue", module: "reports", name: "Read overdue tasks" },
    { code: "reports.legal_escalations", module: "reports", name: "Read legal escalations" },
    { code: "reports.export", module: "reports", name: "Export reports" },
];

async function main() {
    const adminPasswordHash = await bcrypt.hash("Admin@12345", 10);
    const userPasswordHash = await bcrypt.hash("User@12345", 10);

    const tenant = await prisma.tenant.upsert({
        where: { code: "wathiq-hospital" },
        update: {
            nameEn: "WathiqCare Demo Hospital",
            nameAr: "مستشفى واثق كير التجريبي",
            status: "ACTIVE",
        },
        create: {
            code: "wathiq-hospital",
            nameEn: "WathiqCare Demo Hospital",
            nameAr: "مستشفى واثق كير التجريبي",
            status: "ACTIVE",
            timezone: "Asia/Riyadh",
            defaultLanguage: "ar",
        },
    });

    await prisma.tenantSetting.upsert({
        where: {
            tenantId_configKey: {
                tenantId: tenant.id,
                configKey: "workflow.default",
            },
        },
        update: {
            configValue: { workflowCode: "refusal_case_default" } as any,
        },
        create: {
            tenantId: tenant.id,
            configKey: "workflow.default",
            configValue: { workflowCode: "refusal_case_default" } as any,
        },
    });

    const facility = await prisma.facility.upsert({
        where: {
            tenantId_code: {
                tenantId: tenant.id,
                code: "MAIN-HOSPITAL",
            },
        },
        update: {
            nameEn: "Main Hospital",
            nameAr: "المستشفى الرئيسي",
            status: "ACTIVE",
        },
        create: {
            tenantId: tenant.id,
            code: "MAIN-HOSPITAL",
            nameEn: "Main Hospital",
            nameAr: "المستشفى الرئيسي",
            status: "ACTIVE",
        },
    });

    const departmentsSeed = [
        { code: "nursing", nameEn: "Nursing", nameAr: "التمريض", type: "clinical" },
        { code: "physician", nameEn: "Physician", nameAr: "الأطباء", type: "clinical" },
        { code: "patient_relations", nameEn: "Patient Relations", nameAr: "علاقات المرضى", type: "operational" },
        { code: "social_work", nameEn: "Social Work", nameAr: "الخدمة الاجتماعية", type: "operational" },
        { code: "finance", nameEn: "Finance", nameAr: "المالية", type: "finance" },
        { code: "legal", nameEn: "Legal", nameAr: "الشؤون القانونية", type: "legal" },
        { code: "admin", nameEn: "Administration", nameAr: "الإدارة", type: "administrative" },
    ];

    const departments = new Map<string, string>();
    for (const item of departmentsSeed) {
        const row = await prisma.department.upsert({
            where: {
                tenantId_facilityId_code: {
                    tenantId: tenant.id,
                    facilityId: facility.id,
                    code: item.code,
                },
            },
            update: {
                nameEn: item.nameEn,
                nameAr: item.nameAr,
                type: item.type,
                status: "ACTIVE",
            },
            create: {
                tenantId: tenant.id,
                facilityId: facility.id,
                code: item.code,
                nameEn: item.nameEn,
                nameAr: item.nameAr,
                type: item.type,
                status: "ACTIVE",
            },
        });
        departments.set(item.code, row.id);
    }

    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { code: permission.code },
            update: {
                name: permission.name,
                module: permission.module,
            },
            create: {
                code: permission.code,
                name: permission.name,
                module: permission.module,
            },
        });
    }

    const roles = [
        { code: "admin", name: "Admin", description: "Tenant administrator" },
        { code: "nurse", name: "Nurse", description: "Nursing role" },
        { code: "physician", name: "Physician", description: "Physician role" },
        { code: "patient_relations", name: "Patient Relations", description: "Patient relations officer" },
        { code: "social_worker", name: "Social Worker", description: "Social worker" },
        { code: "finance_officer", name: "Finance Officer", description: "Finance role" },
        { code: "legal_officer", name: "Legal Officer", description: "Legal role" },
    ];

    const roleMap = new Map<string, string>();
    for (const role of roles) {
        const row = await prisma.role.upsert({
            where: {
                tenantId_code: {
                    tenantId: tenant.id,
                    code: role.code,
                },
            },
            update: {
                name: role.name,
                description: role.description,
                isSystemRole: false,
            },
            create: {
                tenantId: tenant.id,
                code: role.code,
                name: role.name,
                description: role.description,
                isSystemRole: false,
            },
        });
        roleMap.set(role.code, row.id);
    }

    const permissions = await prisma.permission.findMany();
    const permissionMap = new Map(permissions.map((item) => [item.code, item.id]));

    const rolePermissions: Record<string, string[]> = {
        admin: PERMISSIONS.map((item) => item.code),
        nurse: [
            "patients.read",
            "encounters.read",
            "cases.read",
            "cases.create",
            "refusal_events.create",
            "acknowledgments.send",
            "tasks.read",
            "tasks.complete",
            "documents.upload",
            "documents.read",
        ],
        physician: [
            "patients.read",
            "encounters.read",
            "cases.read",
            "discharge.decision.read",
            "discharge.decision.create",
            "discharge.decision.update",
            "discharge.plan.create",
            "discharge.plan.update",
            "documents.read",
        ],
        patient_relations: [
            "cases.read",
            "acknowledgments.read",
            "acknowledgments.respond",
            "workflows.transition.read",
            "workflows.transition.execute",
            "tasks.read",
            "tasks.complete",
            "documents.read",
        ],
        social_worker: ["cases.read", "tasks.read", "tasks.complete", "documents.read"],
        finance_officer: ["cases.read", "tasks.read", "documents.read", "documents.generate"],
        legal_officer: [
            "cases.read",
            "legal.notes.read",
            "legal.notes.create",
            "legal.hold.create",
            "legal.hold.release",
            "audit.read",
            "documents.read",
            "workflows.transition.read",
            "workflows.transition.execute",
        ],
    };

    for (const [roleCode, permCodes] of Object.entries(rolePermissions)) {
        const roleId = roleMap.get(roleCode);
        if (!roleId) continue;

        for (const permCode of permCodes) {
            const permissionId = permissionMap.get(permCode);
            if (!permissionId) continue;
            await prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId,
                        permissionId,
                    },
                },
                update: {},
                create: {
                    roleId,
                    permissionId,
                },
            });
        }
    }

    const adminUser = await prisma.user.upsert({
        where: {
            tenantId_email: {
                tenantId: tenant.id,
                email: "admin@wathiqcare.local",
            },
        },
        update: {
            firstName: "System",
            lastName: "Admin",
            fullName: "System Admin",
            passwordHash: adminPasswordHash,
            status: "ACTIVE",
        },
        create: {
            tenantId: tenant.id,
            employeeCode: "EMP-0001",
            firstName: "System",
            lastName: "Admin",
            fullName: "System Admin",
            email: "admin@wathiqcare.local",
            passwordHash: adminPasswordHash,
            status: "ACTIVE",
            isSuperAdmin: false,
        },
    });

    const physicianUser = await prisma.user.upsert({
        where: {
            tenantId_email: {
                tenantId: tenant.id,
                email: "physician@wathiqcare.local",
            },
        },
        update: {
            firstName: "Hadi",
            lastName: "Physician",
            fullName: "Hadi Physician",
            passwordHash: userPasswordHash,
            status: "ACTIVE",
        },
        create: {
            tenantId: tenant.id,
            employeeCode: "EMP-0100",
            firstName: "Hadi",
            lastName: "Physician",
            fullName: "Hadi Physician",
            email: "physician@wathiqcare.local",
            passwordHash: userPasswordHash,
            status: "ACTIVE",
        },
    });

    const nurseUser = await prisma.user.upsert({
        where: {
            tenantId_email: {
                tenantId: tenant.id,
                email: "nurse@wathiqcare.local",
            },
        },
        update: {
            firstName: "Noor",
            lastName: "Nurse",
            fullName: "Noor Nurse",
            passwordHash: userPasswordHash,
            status: "ACTIVE",
        },
        create: {
            tenantId: tenant.id,
            employeeCode: "EMP-0200",
            firstName: "Noor",
            lastName: "Nurse",
            fullName: "Noor Nurse",
            email: "nurse@wathiqcare.local",
            passwordHash: userPasswordHash,
            status: "ACTIVE",
        },
    });

    const legalUser = await prisma.user.upsert({
        where: {
            tenantId_email: {
                tenantId: tenant.id,
                email: "legal@wathiqcare.local",
            },
        },
        update: {
            firstName: "Lina",
            lastName: "Legal",
            fullName: "Lina Legal",
            passwordHash: userPasswordHash,
            status: "ACTIVE",
        },
        create: {
            tenantId: tenant.id,
            employeeCode: "EMP-0300",
            firstName: "Lina",
            lastName: "Legal",
            fullName: "Lina Legal",
            email: "legal@wathiqcare.local",
            passwordHash: userPasswordHash,
            status: "ACTIVE",
        },
    });

    const assignRole = async (
        userId: string,
        roleCode: string,
        departmentCode: string,
    ) => {
        const roleId = roleMap.get(roleCode);
        const departmentId = departments.get(departmentCode);
        if (!roleId || !departmentId) return;

        const exists = await prisma.userRole.findFirst({
            where: {
                tenantId: tenant.id,
                userId,
                roleId,
                facilityId: facility.id,
                departmentId,
            },
        });

        if (!exists) {
            await prisma.userRole.create({
                data: {
                    tenantId: tenant.id,
                    userId,
                    roleId,
                    facilityId: facility.id,
                    departmentId,
                },
            });
        }
    };

    await assignRole(adminUser.id, "admin", "admin");
    await assignRole(physicianUser.id, "physician", "physician");
    await assignRole(nurseUser.id, "nurse", "nursing");
    await assignRole(legalUser.id, "legal_officer", "legal");

    const patient = await prisma.patient.upsert({
        where: {
            tenantId_mrn: {
                tenantId: tenant.id,
                mrn: "MRN-100001",
            },
        },
        update: {
            firstName: "Ahmad",
            lastName: "Saleh",
            fullName: "Ahmad Saleh",
            primaryPhone: "+966500000001",
            preferredLanguage: "ar",
        },
        create: {
            tenantId: tenant.id,
            mrn: "MRN-100001",
            firstName: "Ahmad",
            lastName: "Saleh",
            fullName: "Ahmad Saleh",
            nationalId: "1234567890",
            preferredLanguage: "ar",
            primaryPhone: "+966500000001",
            gender: "male",
        },
    });

    const representative = await prisma.patientRepresentative.create({
        data: {
            tenantId: tenant.id,
            patientId: patient.id,
            representativeType: "guardian",
            fullName: "Fahad Saleh",
            relationshipToPatient: "father",
            authorityBasis: "family_guardian",
            phone: "+966500000002",
            isPrimary: true,
            active: true,
        },
    }).catch(async () => {
        return prisma.patientRepresentative.findFirstOrThrow({
            where: {
                tenantId: tenant.id,
                patientId: patient.id,
                fullName: "Fahad Saleh",
            },
        });
    });

    const encounter = await prisma.encounter.upsert({
        where: {
            tenantId_encounterNumber: {
                tenantId: tenant.id,
                encounterNumber: "ENC-2026-0001",
            },
        },
        update: {
            status: "active",
            attendingPhysicianUserId: physicianUser.id,
            attendingPhysicianName: physicianUser.fullName || physicianUser.firstName,
        },
        create: {
            tenantId: tenant.id,
            patientId: patient.id,
            encounterNumber: "ENC-2026-0001",
            facilityId: facility.id,
            departmentId: departments.get("physician"),
            admissionType: "emergency",
            admissionDate: new Date("2026-03-10T08:00:00.000Z"),
            dischargeExpectedDate: new Date("2026-03-15T08:00:00.000Z"),
            attendingPhysicianName: physicianUser.fullName || physicianUser.firstName,
            attendingPhysicianUserId: physicianUser.id,
            room: "305",
            bed: "B",
            status: "active",
        },
    });

    const workflow = await prisma.workflow.upsert({
        where: {
            tenantId_code: {
                tenantId: tenant.id,
                code: "refusal_case_default",
            },
        },
        update: {
            name: "Refusal Case Workflow",
            active: true,
        },
        create: {
            tenantId: tenant.id,
            code: "refusal_case_default",
            name: "Refusal Case Workflow",
            entityType: "REFUSAL_CASE",
            active: true,
        },
    });

    const workflowVersion = await prisma.workflowVersion.upsert({
        where: {
            workflowId_versionNumber: {
                workflowId: workflow.id,
                versionNumber: 1,
            },
        },
        update: {
            status: "PUBLISHED",
            publishedAt: new Date(),
        },
        create: {
            workflowId: workflow.id,
            versionNumber: 1,
            status: "PUBLISHED",
            publishedAt: new Date(),
        },
    });

    const stageInitial = await prisma.workflowStage.upsert({
        where: {
            workflowVersionId_code: {
                workflowVersionId: workflowVersion.id,
                code: "initial_assessment",
            },
        },
        update: {
            name: "Initial Assessment",
            sequence: 1,
            isInitial: true,
            isTerminal: false,
        },
        create: {
            workflowVersionId: workflowVersion.id,
            code: "initial_assessment",
            name: "Initial Assessment",
            sequence: 1,
            isInitial: true,
            isTerminal: false,
        },
    });

    const stageRelations = await prisma.workflowStage.upsert({
        where: {
            workflowVersionId_code: {
                workflowVersionId: workflowVersion.id,
                code: "patient_relations_review",
            },
        },
        update: {
            name: "Patient Relations Review",
            sequence: 2,
            isInitial: false,
            isTerminal: false,
        },
        create: {
            workflowVersionId: workflowVersion.id,
            code: "patient_relations_review",
            name: "Patient Relations Review",
            sequence: 2,
            isInitial: false,
            isTerminal: false,
        },
    });

    const stageLegal = await prisma.workflowStage.upsert({
        where: {
            workflowVersionId_code: {
                workflowVersionId: workflowVersion.id,
                code: "legal_review",
            },
        },
        update: {
            name: "Legal Review",
            sequence: 3,
            isInitial: false,
            isTerminal: false,
        },
        create: {
            workflowVersionId: workflowVersion.id,
            code: "legal_review",
            name: "Legal Review",
            sequence: 3,
            isInitial: false,
            isTerminal: false,
        },
    });

    const stageClosed = await prisma.workflowStage.upsert({
        where: {
            workflowVersionId_code: {
                workflowVersionId: workflowVersion.id,
                code: "case_closed",
            },
        },
        update: {
            name: "Case Closed",
            sequence: 4,
            isInitial: false,
            isTerminal: true,
        },
        create: {
            workflowVersionId: workflowVersion.id,
            code: "case_closed",
            name: "Case Closed",
            sequence: 4,
            isInitial: false,
            isTerminal: true,
        },
    });

    const transitionToRelations = await prisma.workflowTransition.upsert({
        where: {
            workflowVersionId_code: {
                workflowVersionId: workflowVersion.id,
                code: "to_patient_relations",
            },
        },
        update: {
            fromStageId: stageInitial.id,
            toStageId: stageRelations.id,
            name: "Move to patient relations",
            requiresComment: true,
            requiresReason: false,
            requiresDocument: false,
            autoCreateTask: true,
            active: true,
        },
        create: {
            workflowVersionId: workflowVersion.id,
            fromStageId: stageInitial.id,
            toStageId: stageRelations.id,
            code: "to_patient_relations",
            name: "Move to patient relations",
            requiresComment: true,
            requiresReason: false,
            requiresDocument: false,
            autoCreateTask: true,
            active: true,
        },
    });

    const transitionToLegal = await prisma.workflowTransition.upsert({
        where: {
            workflowVersionId_code: {
                workflowVersionId: workflowVersion.id,
                code: "to_legal",
            },
        },
        update: {
            fromStageId: stageRelations.id,
            toStageId: stageLegal.id,
            name: "Escalate to legal",
            requiresComment: true,
            requiresReason: true,
            requiresDocument: true,
            autoCreateTask: true,
            active: true,
        },
        create: {
            workflowVersionId: workflowVersion.id,
            fromStageId: stageRelations.id,
            toStageId: stageLegal.id,
            code: "to_legal",
            name: "Escalate to legal",
            requiresComment: true,
            requiresReason: true,
            requiresDocument: true,
            autoCreateTask: true,
            active: true,
        },
    });

    const transitionClose = await prisma.workflowTransition.upsert({
        where: {
            workflowVersionId_code: {
                workflowVersionId: workflowVersion.id,
                code: "close_case",
            },
        },
        update: {
            fromStageId: stageLegal.id,
            toStageId: stageClosed.id,
            name: "Close case",
            requiresComment: true,
            requiresReason: false,
            requiresDocument: true,
            autoCreateTask: false,
            active: true,
        },
        create: {
            workflowVersionId: workflowVersion.id,
            fromStageId: stageLegal.id,
            toStageId: stageClosed.id,
            code: "close_case",
            name: "Close case",
            requiresComment: true,
            requiresReason: false,
            requiresDocument: true,
            autoCreateTask: false,
            active: true,
        },
    });

    const patientRelationsRoleId = roleMap.get("patient_relations");
    const legalRoleId = roleMap.get("legal_officer");

    if (patientRelationsRoleId) {
        await prisma.workflowTransitionRole.upsert({
            where: {
                transitionId_roleId: {
                    transitionId: transitionToRelations.id,
                    roleId: patientRelationsRoleId,
                },
            },
            update: {},
            create: {
                transitionId: transitionToRelations.id,
                roleId: patientRelationsRoleId,
            },
        });
    }

    if (legalRoleId) {
        await prisma.workflowTransitionRole.upsert({
            where: {
                transitionId_roleId: {
                    transitionId: transitionToLegal.id,
                    roleId: legalRoleId,
                },
            },
            update: {},
            create: {
                transitionId: transitionToLegal.id,
                roleId: legalRoleId,
            },
        });

        await prisma.workflowTransitionRole.upsert({
            where: {
                transitionId_roleId: {
                    transitionId: transitionClose.id,
                    roleId: legalRoleId,
                },
            },
            update: {},
            create: {
                transitionId: transitionClose.id,
                roleId: legalRoleId,
            },
        });
    }

    const refusalCase = await prisma.refusalCase.upsert({
        where: {
            tenantId_caseNumber: {
                tenantId: tenant.id,
                caseNumber: "RC-2026-000001",
            },
        },
        update: {
            status: "IN_PROGRESS",
            priority: "HIGH",
            currentStageId: stageInitial.id,
            currentStageCode: stageInitial.code,
            workflowVersionId: workflowVersion.id,
            initiatedByUserId: nurseUser.id,
        },
        create: {
            tenantId: tenant.id,
            caseNumber: "RC-2026-000001",
            caseType: "DISCHARGE_REFUSAL",
            status: "IN_PROGRESS",
            priority: "HIGH",
            facilityId: facility.id,
            departmentId: departments.get("nursing")!,
            patientId: patient.id,
            encounterId: encounter.id,
            currentOwnerUserId: nurseUser.id,
            currentOwnerDepartmentId: departments.get("nursing"),
            initiatedByUserId: nurseUser.id,
            summary: "Patient declined discharge after medical decision.",
            workflowVersionId: workflowVersion.id,
            currentStageId: stageInitial.id,
            currentStageCode: stageInitial.code,
        },
    });

    await prisma.caseStageHistory.create({
        data: {
            tenantId: tenant.id,
            refusalCaseId: refusalCase.id,
            toStageId: stageInitial.id,
            changedByUserId: nurseUser.id,
            comment: "Case initialized from seed",
        },
    }).catch(() => undefined);

    await prisma.dischargeDecision.create({
        data: {
            tenantId: tenant.id,
            encounterId: encounter.id,
            refusalCaseId: refusalCase.id,
            decisionStatus: "issued",
            dischargeMedicallyAppropriate: true,
            decisionDate: new Date("2026-03-15"),
            decisionTime: "10:30",
            issuedByUserId: physicianUser.id,
            clinicalRemarks: "Condition stable for discharge with follow-up.",
        },
    }).catch(() => undefined);

    const plan = await prisma.dischargePlan.create({
        data: {
            tenantId: tenant.id,
            encounterId: encounter.id,
            refusalCaseId: refusalCase.id,
            destination: "home",
            instructionsProvided: true,
            notes: "Home care and medication adherence instructions provided.",
            createdByUserId: physicianUser.id,
        },
    }).catch(async () => {
        return prisma.dischargePlan.findFirstOrThrow({
            where: {
                tenantId: tenant.id,
                refusalCaseId: refusalCase.id,
            },
        });
    });

    await prisma.dischargePlanItem.createMany({
        data: [
            {
                tenantId: tenant.id,
                dischargePlanId: plan.id,
                itemType: "medication",
                status: "pending",
                required: true,
            },
            {
                tenantId: tenant.id,
                dischargePlanId: plan.id,
                itemType: "home_healthcare",
                status: "pending",
                required: true,
            },
        ],
        skipDuplicates: true,
    });

    const reasonCategory = await prisma.refusalReasonCategory.upsert({
        where: {
            tenantId_code: {
                tenantId: tenant.id,
                code: "financial_concern",
            },
        },
        update: {
            nameEn: "Financial Concern",
            nameAr: "مخاوف مالية",
            active: true,
        },
        create: {
            tenantId: tenant.id,
            code: "financial_concern",
            nameEn: "Financial Concern",
            nameAr: "مخاوف مالية",
            active: true,
        },
    });

    await prisma.refusalEvent.create({
        data: {
            tenantId: tenant.id,
            refusalCaseId: refusalCase.id,
            refusalRecorded: true,
            refusalDate: new Date("2026-03-15"),
            refusalTime: "11:00",
            refusingPersonName: patient.fullName,
            refusingPersonRelationship: "self",
            representativeId: representative.id,
            reasonCategoryId: reasonCategory.id,
            detailedReason: "Patient requested more time due to financial concerns.",
            consequencesExplained: true,
            explanationProvidedByUserId: nurseUser.id,
            immediateEscalationRequired: false,
            riskIndicator: "medium",
            notes: "Counseling initiated",
            createdByUserId: nurseUser.id,
        },
    }).catch(() => undefined);

    await prisma.acknowledgmentRequest.create({
        data: {
            tenantId: tenant.id,
            refusalCaseId: refusalCase.id,
            recipientType: "PATIENT",
            patientId: patient.id,
            recipientName: patient.fullName,
            deliveryMethod: "SMS",
            status: "SENT",
            sentAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            createdByUserId: nurseUser.id,
        },
    }).catch(() => undefined);

    await prisma.task.create({
        data: {
            tenantId: tenant.id,
            refusalCaseId: refusalCase.id,
            taskType: "patient_relations_followup",
            title: "Engage patient relations",
            description: "Coordinate counseling and explain discharge implications.",
            assignedToDepartmentId: departments.get("patient_relations"),
            status: "PENDING",
            priority: "HIGH",
            dueAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
            createdByUserId: nurseUser.id,
        },
    }).catch(() => undefined);

    await prisma.documentTemplate.upsert({
        where: {
            tenantId_code_version: {
                tenantId: tenant.id,
                code: "refusal_form",
                version: "1.0",
            },
        },
        update: {
            active: true,
            approvalStatus: "APPROVED",
            templateSourcePath: "templates/refusal_form_v1.html",
        },
        create: {
            tenantId: tenant.id,
            code: "refusal_form",
            nameEn: "Refusal of Discharge Form",
            nameAr: "نموذج رفض الخروج",
            category: "legal",
            version: "1.0",
            active: true,
            templateSourcePath: "templates/refusal_form_v1.html",
            approvalStatus: "APPROVED",
        },
    });

    console.log("Seed completed successfully");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
