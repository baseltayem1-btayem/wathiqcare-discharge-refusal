import { ForbiddenException } from "@nestjs/common";

import { AuditService } from "../src/modules/audit/audit.service";
import { DischargeService } from "../src/modules/discharge/discharge.service";
import { DocumentStorageService } from "../src/modules/documents/document-storage.service";
import { DocumentsService } from "../src/modules/documents/documents.service";
import { RefusalCasesService } from "../src/modules/refusal-cases/refusal-cases.service";
import { WorkflowsService } from "../src/modules/workflows/workflows.service";

type AnyRow = Record<string, any>;

function buildInMemoryPrisma() {
    const state = {
        patient: { id: "patient1", tenantId: "t1" },
        encounter: { id: "enc1", tenantId: "t1" },
        workflow: { id: "wf1", tenantId: "t1", code: "refusal_case_default", active: true },
        workflowVersion: { id: "wv1", workflowId: "wf1", status: "PUBLISHED", versionNumber: 1 },
        stages: [
            { id: "s1", workflowVersionId: "wv1", code: "initial_assessment", name: "Initial", isInitial: true, isTerminal: false },
            { id: "s2", workflowVersionId: "wv1", code: "patient_relations_review", name: "Relations", isInitial: false, isTerminal: false },
            { id: "s3", workflowVersionId: "wv1", code: "legal_review", name: "Legal", isInitial: false, isTerminal: false },
        ],
        transitions: [
            {
                id: "tr1",
                workflowVersionId: "wv1",
                code: "to_patient_relations",
                fromStageId: "s1",
                toStageId: "s2",
                requiresComment: true,
                requiresReason: false,
                requiresDocument: false,
                autoCreateTask: true,
                active: true,
            },
            {
                id: "tr2",
                workflowVersionId: "wv1",
                code: "to_legal",
                fromStageId: "s2",
                toStageId: "s3",
                requiresComment: true,
                requiresReason: true,
                requiresDocument: true,
                autoCreateTask: true,
                active: true,
            },
        ],
        roleRows: [
            { id: "r_rel", code: "patient_relations", tenantId: "t1" },
            { id: "r_leg", code: "legal_officer", tenantId: "t1" },
        ],
        transitionRoles: [
            { transitionId: "tr1", roleId: "r_rel" },
            { transitionId: "tr2", roleId: "r_leg" },
        ],
        reasonCategory: { id: "reason1", tenantId: "t1", active: true },
        template: { id: "tmpl1", tenantId: "t1", active: true },
        refusalCases: [] as AnyRow[],
        dischargeDecisions: [] as AnyRow[],
        acknowledgmentRequests: [] as AnyRow[],
        refusalEvents: [] as AnyRow[],
        caseStageHistory: [] as AnyRow[],
        tasks: [] as AnyRow[],
        notifications: [] as AnyRow[],
        attachments: [] as AnyRow[],
        attachmentVersions: [] as AnyRow[],
        generatedDocuments: [] as AnyRow[],
        audits: [] as AnyRow[],
    };

    const prisma: any = {
        $transaction: async (arg: any) => {
            if (typeof arg === "function") {
                return arg(prisma);
            }
            return Promise.all(arg);
        },

        patient: {
            findFirst: async ({ where }: any) =>
                where.id === state.patient.id && where.tenantId === state.patient.tenantId
                    ? state.patient
                    : null,
        },
        encounter: {
            findFirst: async ({ where }: any) =>
                where.id === state.encounter.id && where.tenantId === state.encounter.tenantId
                    ? state.encounter
                    : null,
        },
        workflow: {
            findFirst: async () => state.workflow,
            findMany: async () => [state.workflow],
        },
        workflowVersion: {
            findFirst: async () => state.workflowVersion,
        },
        workflowStage: {
            findFirst: async ({ where }: any) =>
                state.stages.find((s) => s.workflowVersionId === where.workflowVersionId && s.isInitial === where.isInitial) || null,
            findUnique: async ({ where }: any) =>
                state.stages.find((s) => s.id === where.id) || null,
        },
        workflowTransition: {
            findMany: async ({ where }: any) =>
                state.transitions.filter(
                    (t) =>
                        t.workflowVersionId === where.workflowVersionId &&
                        t.fromStageId === where.fromStageId &&
                        t.active === where.active,
                ),
        },
        workflowTransitionRole: {
            findMany: async ({ where }: any) => {
                if (where.transitionId?.in) {
                    return state.transitionRoles.filter((tr) => where.transitionId.in.includes(tr.transitionId));
                }
                if (where.transitionId) {
                    return state.transitionRoles.filter((tr) => tr.transitionId === where.transitionId);
                }
                return state.transitionRoles;
            },
        },
        role: {
            findMany: async ({ where }: any) =>
                state.roleRows.filter((r) => where.code.in.includes(r.code)),
        },
        refusalCase: {
            count: async ({ where }: any) =>
                state.refusalCases.filter((c) => c.tenantId === where.tenantId).length,
            create: async ({ data }: any) => {
                const row = {
                    id: `case-${state.refusalCases.length + 1}`,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    ...data,
                };
                state.refusalCases.push(row);
                return row;
            },
            findFirst: async ({ where }: any) =>
                state.refusalCases.find((c) => c.id === where.id && c.tenantId === where.tenantId) || null,
            update: async ({ where, data }: any) => {
                const row = state.refusalCases.find((c) => c.id === where.id);
                if (!row) throw new Error("Case not found");
                Object.assign(row, data, { updatedAt: new Date() });
                return row;
            },
            findMany: async ({ where }: any) =>
                state.refusalCases.filter((c) => c.tenantId === where.tenantId),
        },
        caseStageHistory: {
            create: async ({ data }: any) => {
                const row = { id: `h-${state.caseStageHistory.length + 1}`, ...data };
                state.caseStageHistory.push(row);
                return row;
            },
            findMany: async ({ where }: any) =>
                state.caseStageHistory.filter(
                    (h) => h.tenantId === where.tenantId && h.refusalCaseId === where.refusalCaseId,
                ),
        },
        dischargeDecision: {
            findFirst: async ({ where }: any) =>
                state.dischargeDecisions.find(
                    (d) => d.tenantId === where.tenantId && d.refusalCaseId === where.refusalCaseId,
                ) || null,
            create: async ({ data }: any) => {
                const row = { id: `dd-${state.dischargeDecisions.length + 1}`, ...data };
                state.dischargeDecisions.push(row);
                return row;
            },
            update: async ({ where, data }: any) => {
                const row = state.dischargeDecisions.find((d) => d.id === where.id);
                if (!row) throw new Error("Decision not found");
                Object.assign(row, data);
                return row;
            },
        },
        acknowledgmentRequest: {
            create: async ({ data }: any) => {
                const row = { id: `ack-${state.acknowledgmentRequests.length + 1}`, ...data };
                state.acknowledgmentRequests.push(row);
                return row;
            },
            findMany: async ({ where }: any) =>
                state.acknowledgmentRequests.filter(
                    (r) => r.tenantId === where.tenantId && r.refusalCaseId === where.refusalCaseId,
                ),
            findFirst: async ({ where }: any) =>
                state.acknowledgmentRequests.find(
                    (r) => r.id === where.id && r.tenantId === where.tenantId,
                ) || null,
            update: async ({ where, data }: any) => {
                const row = state.acknowledgmentRequests.find((r) => r.id === where.id);
                if (!row) throw new Error("Ack not found");
                Object.assign(row, data);
                return row;
            },
        },
        acknowledgmentResponse: {
            create: async ({ data }: any) => ({ id: "ack-resp-1", ...data }),
        },
        refusalReasonCategory: {
            findFirst: async () => state.reasonCategory,
        },
        refusalEvent: {
            create: async ({ data }: any) => {
                const row = { id: `re-${state.refusalEvents.length + 1}`, ...data };
                state.refusalEvents.push(row);
                return row;
            },
            findMany: async ({ where }: any) =>
                state.refusalEvents.filter(
                    (e) => e.tenantId === where.tenantId && e.refusalCaseId === where.refusalCaseId,
                ),
        },
        task: {
            create: async ({ data }: any) => {
                const row = { id: `task-${state.tasks.length + 1}`, ...data };
                state.tasks.push(row);
                return row;
            },
            findMany: async ({ where }: any) =>
                state.tasks.filter(
                    (t) =>
                        t.tenantId === where.tenantId &&
                        (!where.refusalCaseId || t.refusalCaseId === where.refusalCaseId),
                ),
            count: async ({ where }: any) =>
                state.tasks.filter((t) => t.tenantId === where.tenantId).length,
            update: async ({ where, data }: any) => {
                const row = state.tasks.find((t) => t.id === where.id);
                if (!row) throw new Error("Task not found");
                Object.assign(row, data);
                return row;
            },
        },
        notification: {
            create: async ({ data }: any) => {
                const row = { id: `n-${state.notifications.length + 1}`, ...data };
                state.notifications.push(row);
                return row;
            },
            findMany: async ({ where }: any) =>
                state.notifications.filter((n) => n.tenantId === where.tenantId),
            count: async ({ where }: any) =>
                state.notifications.filter((n) => n.tenantId === where.tenantId).length,
        },
        documentTemplate: {
            findFirst: async () => state.template,
        },
        caseAttachment: {
            create: async ({ data }: any) => {
                const row = { id: `att-${state.attachments.length + 1}`, deletedAt: null, ...data };
                state.attachments.push(row);
                return row;
            },
            findMany: async ({ where }: any) =>
                state.attachments.filter(
                    (a) =>
                        a.tenantId === where.tenantId &&
                        a.refusalCaseId === where.refusalCaseId &&
                        a.deletedAt === null,
                ),
            count: async ({ where }: any) =>
                state.attachments.filter(
                    (a) =>
                        a.tenantId === where.tenantId &&
                        a.refusalCaseId === where.refusalCaseId &&
                        a.deletedAt === (where.deletedAt ?? null),
                ).length,
            findFirst: async ({ where }: any) =>
                state.attachments.find(
                    (a) => a.id === where.id && a.tenantId === where.tenantId && a.deletedAt === null,
                ) || null,
            update: async ({ where, data }: any) => {
                const row = state.attachments.find((a) => a.id === where.id);
                if (!row) throw new Error("Attachment not found");
                Object.assign(row, data);
                return row;
            },
        },
        attachmentVersion: {
            create: async ({ data }: any) => {
                const row = { id: `av-${state.attachmentVersions.length + 1}`, ...data };
                state.attachmentVersions.push(row);
                return row;
            },
        },
        generatedDocument: {
            create: async ({ data }: any) => {
                const row = { id: `gd-${state.generatedDocuments.length + 1}`, ...data };
                state.generatedDocuments.push(row);
                return row;
            },
            findMany: async ({ where }: any) =>
                state.generatedDocuments.filter(
                    (d) => d.tenantId === where.tenantId && d.refusalCaseId === where.refusalCaseId,
                ),
            count: async ({ where }: any) =>
                state.generatedDocuments.filter(
                    (d) => d.tenantId === where.tenantId && d.refusalCaseId === where.refusalCaseId,
                ).length,
            findFirst: async ({ where }: any) =>
                state.generatedDocuments.find((d) => d.id === where.id && d.tenantId === where.tenantId) ||
                null,
        },
        legalHold: {
            findFirst: async () => null,
        },
        escalationEvent: {
            findMany: async () => [],
        },
        auditLog: {
            create: async ({ data }: any) => {
                const row = { id: `audit-${state.audits.length + 1}`, ...data };
                state.audits.push(row);
                return row;
            },
            findMany: async ({ where }: any) =>
                state.audits.filter(
                    (a) => a.tenantId === where.tenantId && a.entityType === where.entityType && a.entityId === where.entityId,
                ),
            count: async () => state.audits.length,
        },
    };

    return { prisma, state };
}

describe("Refusal Lifecycle Integration", () => {
    it("runs end-to-end core lifecycle sequence", async () => {
        const { prisma, state } = buildInMemoryPrisma();

        const auditService = new AuditService(prisma as any);
        const refusalCasesService = new RefusalCasesService(prisma as any, auditService);
        const dischargeService = new DischargeService(prisma as any, auditService);
        const workflowsService = new WorkflowsService(prisma as any, auditService);
        const documentsService = new DocumentsService(
            prisma as any,
            auditService,
            new DocumentStorageService({
                get: jest.fn().mockReturnValue("http://minio.test"),
            } as any),
        );

        const nurseUser = {
            id: "u-nurse",
            tenantId: "t1",
            email: "nurse@example.com",
            isSuperAdmin: false,
            roles: ["nurse"],
            permissions: [
                "cases.create",
                "cases.read",
                "acknowledgments.send",
                "refusal_events.create",
                "documents.upload",
            ],
        };

        const physicianUser = {
            id: "u-phys",
            tenantId: "t1",
            email: "physician@example.com",
            isSuperAdmin: false,
            roles: ["physician"],
            permissions: ["discharge.decision.create", "discharge.decision.read"],
        };

        const transitionUser = {
            id: "u-trans",
            tenantId: "t1",
            email: "transitions@example.com",
            isSuperAdmin: false,
            roles: ["patient_relations", "legal_officer"],
            permissions: ["workflows.transition.execute"],
        };

        const caseRow = await refusalCasesService.createCase(nurseUser as any, {
            caseType: "DISCHARGE_REFUSAL",
            priority: "HIGH",
            facilityId: "facility1",
            departmentId: "dept1",
            patientId: "patient1",
            encounterId: "enc1",
            summary: "integration case",
        });

        await dischargeService.createDischargeDecision(physicianUser as any, caseRow.id, {
            decisionStatus: "issued",
            dischargeMedicallyAppropriate: true,
            decisionDate: "2026-03-15",
            decisionTime: "10:45",
            clinicalRemarks: "ready",
        });

        await refusalCasesService.sendAcknowledgment(nurseUser as any, caseRow.id, {
            recipientType: "PATIENT",
            recipientName: "Ahmad Saleh",
            deliveryMethod: "SMS",
            expiresAt: "2026-03-16T10:45:00.000Z",
        });

        await refusalCasesService.createRefusalEvent(nurseUser as any, caseRow.id, {
            refusalDate: "2026-03-15",
            refusalTime: "11:00",
            refusingPersonName: "Ahmad Saleh",
            refusingPersonRelationship: "self",
            reasonCategoryId: "reason1",
            detailedReason: "Concern",
            consequencesExplained: true,
            immediateEscalationRequired: false,
        });

        await workflowsService.executeTransition(transitionUser as any, caseRow.id, {
            transitionCode: "to_patient_relations",
            comment: "Move to relations",
        });

        await documentsService.uploadCaseDocument(nurseUser as any, caseRow.id, {
            category: "legal",
            originalFileName: "evidence.pdf",
            mimeType: "application/pdf",
            fileSize: 1024,
            contentBase64: Buffer.from("content").toString("base64"),
        });

        await workflowsService.executeTransition(transitionUser as any, caseRow.id, {
            transitionCode: "to_legal",
            comment: "Escalating",
            reason: "Persistent refusal",
            hasRequiredDocument: true,
        });

        const closed = await refusalCasesService.closeCase(nurseUser as any, caseRow.id, {
            closureReason: "finalized",
            note: "closed in integration test",
        });

        expect(closed.status).toBe("CLOSED");
        expect(state.acknowledgmentRequests.length).toBeGreaterThan(0);
        expect(state.refusalEvents.length).toBeGreaterThan(0);
        expect(state.tasks.length).toBeGreaterThan(0);
        expect(state.notifications.length).toBeGreaterThan(0);
        expect(state.attachments.length).toBeGreaterThan(0);
        expect(state.audits.length).toBeGreaterThan(0);
    });

    it("denies discharge decision for unauthorized role", async () => {
        const { prisma } = buildInMemoryPrisma();

        const auditService = new AuditService(prisma as any);
        const dischargeService = new DischargeService(prisma as any, auditService);

        const unauthorizedUser = {
            id: "u-no",
            tenantId: "t1",
            email: "unauthorized@example.com",
            isSuperAdmin: false,
            roles: ["nurse"],
            permissions: ["discharge.decision.create"],
        };

        await prisma.refusalCase.create({
            data: {
                tenantId: "t1",
                caseNumber: "RC-1",
                caseType: "DISCHARGE_REFUSAL",
                status: "OPEN",
                facilityId: "facility1",
                departmentId: "dept1",
                patientId: "patient1",
                encounterId: "enc1",
                initiatedByUserId: "u-no",
            },
        });

        const caseId = (await prisma.refusalCase.findMany({ where: { tenantId: "t1" } }))[0].id;

        await expect(
            dischargeService.createDischargeDecision(unauthorizedUser as any, caseId, {
                decisionStatus: "issued",
                dischargeMedicallyAppropriate: true,
                decisionDate: "2026-03-15",
                decisionTime: "09:00",
            }),
        ).rejects.toThrow(ForbiddenException);
    });
});
