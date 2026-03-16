import { BadRequestException } from "@nestjs/common";

import { AuditService } from "../src/modules/audit/audit.service";
import { WorkflowsService } from "../src/modules/workflows/workflows.service";

function baseMocks() {
    const prisma: any = {
        refusalCase: {
            findFirst: jest.fn().mockResolvedValue({
                id: "case1",
                tenantId: "t1",
                workflowVersionId: "wv1",
                currentStageId: "s1",
            }),
            update: jest.fn().mockImplementation(async ({ data }: any) => ({
                id: "case1",
                ...data,
            })),
        },
        workflowTransition: {
            findMany: jest.fn().mockResolvedValue([
                {
                    id: "tr1",
                    code: "to_next",
                    fromStageId: "s1",
                    toStageId: "s2",
                    requiresComment: true,
                    requiresReason: false,
                    requiresDocument: false,
                    autoCreateTask: true,
                    active: true,
                },
            ]),
        },
        workflowTransitionRole: {
            findMany: jest.fn().mockResolvedValue([{ transitionId: "tr1", roleId: "r1" }]),
        },
        role: {
            findMany: jest.fn().mockResolvedValue([{ id: "r1", code: "patient_relations" }]),
        },
        workflowStage: {
            findUnique: jest.fn().mockResolvedValue({ id: "s2", code: "next", name: "Next", isTerminal: false }),
        },
        caseStageHistory: {
            create: jest.fn().mockResolvedValue({ id: "h1" }),
        },
        task: {
            create: jest.fn().mockResolvedValue({ id: "task1" }),
        },
        notification: {
            create: jest.fn().mockResolvedValue({ id: "n1" }),
        },
        $transaction: jest.fn().mockImplementation(async (arg: any) => {
            if (typeof arg === "function") {
                return arg(prisma);
            }
            return Promise.all(arg);
        }),
    };

    const audit = {
        log: jest.fn().mockResolvedValue({ id: "a1" }),
    };

    const service = new WorkflowsService(prisma as any, audit as unknown as AuditService);

    const user = {
        id: "u1",
        tenantId: "t1",
        email: "user@example.com",
        isSuperAdmin: false,
        roles: ["patient_relations"],
        permissions: ["workflows.transition.execute"],
    };

    return { prisma, audit, service, user };
}

describe("WorkflowsService", () => {
    it("validates required comment", async () => {
        const { service, user } = baseMocks();

        await expect(
            service.executeTransition(user as any, "case1", {
                transitionCode: "to_next",
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it("creates task side effect when transition configured", async () => {
        const { service, user, prisma, audit } = baseMocks();

        const result = await service.executeTransition(user as any, "case1", {
            transitionCode: "to_next",
            comment: "Move case",
            hasRequiredDocument: true,
        });

        expect(prisma.task.create).toHaveBeenCalledTimes(1);
        expect(prisma.notification.create).toHaveBeenCalledTimes(1);
        expect(audit.log).toHaveBeenCalledTimes(1);
        expect(result.taskId).toBe("task1");
    });
});
