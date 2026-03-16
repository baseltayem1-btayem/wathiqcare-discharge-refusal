import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuditService } from "../audit/audit.service";
import { ExecuteTransitionDto } from "./dto/execute-transition.dto";

@Injectable()
export class WorkflowsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) { }

    async listWorkflows(tenantId: string) {
        return this.prisma.workflow.findMany({
            where: {
                OR: [{ tenantId }, { tenantId: null }],
            },
            orderBy: [{ tenantId: "desc" }, { code: "asc" }],
        });
    }

    async getWorkflowById(tenantId: string, id: string) {
        const row = await this.prisma.workflow.findFirst({
            where: {
                id,
                OR: [{ tenantId }, { tenantId: null }],
            },
        });
        if (!row) {
            throw new NotFoundException("Workflow not found");
        }
        return row;
    }

    private async getCaseOrThrow(tenantId: string, caseId: string) {
        const row = await this.prisma.refusalCase.findFirst({
            where: { tenantId, id: caseId },
        });
        if (!row) {
            throw new NotFoundException("Case not found");
        }
        return row;
    }

    private async roleIdsForUser(user: AuthUser) {
        if (user.roles.length === 0) {
            return [];
        }

        const roles = await this.prisma.role.findMany({
            where: {
                code: { in: user.roles },
                OR: [{ tenantId: user.tenantId }, { tenantId: null }],
            },
            select: { id: true },
        });

        return roles.map((row) => row.id);
    }

    async availableTransitions(user: AuthUser, caseId: string) {
        const caseRow = await this.getCaseOrThrow(user.tenantId, caseId);
        if (!caseRow.workflowVersionId || !caseRow.currentStageId) {
            return [];
        }

        const transitions = await this.prisma.workflowTransition.findMany({
            where: {
                workflowVersionId: caseRow.workflowVersionId,
                fromStageId: caseRow.currentStageId,
                active: true,
            },
            orderBy: { code: "asc" },
        });

        if (transitions.length === 0) {
            return [];
        }

        const roleIds = await this.roleIdsForUser(user);
        if (roleIds.length === 0 && !user.isSuperAdmin) {
            return [];
        }

        const transitionIds = transitions.map((item) => item.id);
        const roleRows = await this.prisma.workflowTransitionRole.findMany({
            where: {
                transitionId: { in: transitionIds },
            },
        });

        const transitionToRoles = new Map<string, string[]>();
        for (const row of roleRows) {
            const list = transitionToRoles.get(row.transitionId) || [];
            list.push(row.roleId);
            transitionToRoles.set(row.transitionId, list);
        }

        return transitions.filter((transition) => {
            if (user.isSuperAdmin) {
                return true;
            }

            const allowedRoles = transitionToRoles.get(transition.id) || [];
            if (allowedRoles.length === 0) {
                return true;
            }

            return allowedRoles.some((roleId) => roleIds.includes(roleId));
        });
    }

    async executeTransition(user: AuthUser, caseId: string, dto: ExecuteTransitionDto) {
        const caseRow = await this.getCaseOrThrow(user.tenantId, caseId);

        const available = await this.availableTransitions(user, caseId);
        const transition = available.find((item) => item.code === dto.transitionCode);
        if (!transition) {
            throw new BadRequestException("Transition is not available for current stage/role");
        }

        if (transition.requiresComment && !dto.comment) {
            throw new BadRequestException("Transition requires a comment");
        }

        if (transition.requiresReason && !dto.reason) {
            throw new BadRequestException("Transition requires a reason");
        }

        if (transition.requiresDocument && !dto.hasRequiredDocument) {
            throw new BadRequestException("Transition requires required document attachment");
        }

        const toStage = await this.prisma.workflowStage.findUnique({
            where: { id: transition.toStageId },
        });
        if (!toStage) {
            throw new BadRequestException("Transition destination stage not found");
        }

        const outcome = await this.prisma.$transaction(async (tx) => {
            const updatedCase = await tx.refusalCase.update({
                where: { id: caseId },
                data: {
                    currentStageId: toStage.id,
                    currentStageCode: toStage.code,
                    status: toStage.isTerminal ? "CLOSED" : "IN_PROGRESS",
                    closedAt: toStage.isTerminal ? new Date() : null,
                },
            });

            await tx.caseStageHistory.create({
                data: {
                    tenantId: user.tenantId,
                    refusalCaseId: caseId,
                    fromStageId: caseRow.currentStageId,
                    toStageId: toStage.id,
                    transitionId: transition.id,
                    changedByUserId: user.id,
                    comment: dto.comment,
                },
            });

            let createdTask: { id: string } | null = null;
            if (transition.autoCreateTask) {
                const transitionRoles = await tx.workflowTransitionRole.findMany({
                    where: { transitionId: transition.id },
                    take: 1,
                });

                createdTask = await tx.task.create({
                    data: {
                        tenantId: user.tenantId,
                        refusalCaseId: caseId,
                        taskType: "workflow_followup",
                        title: `Workflow follow-up: ${toStage.name}`,
                        description: dto.reason || dto.comment,
                        assignedToRoleId: transitionRoles[0]?.roleId,
                        status: "PENDING",
                        priority: "MEDIUM",
                        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        sourceTransitionId: transition.id,
                        createdByUserId: user.id,
                    },
                    select: { id: true },
                });

                await tx.notification.create({
                    data: {
                        tenantId: user.tenantId,
                        refusalCaseId: caseId,
                        taskId: createdTask.id,
                        channel: "IN_APP",
                        status: "PENDING",
                    },
                });
            }

            return {
                case: updatedCase,
                taskId: createdTask?.id,
            };
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "workflow_transition_executed",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: {
                transitionCode: dto.transitionCode,
                fromStageId: caseRow.currentStageId,
                toStageId: transition.toStageId,
                taskId: outcome.taskId || null,
            },
        });

        return outcome;
    }
}
