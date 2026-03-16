import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuditService } from "../audit/audit.service";
import { CompleteTaskDto } from "./dto/complete-task.dto";
import { CreateTaskDto } from "./dto/create-task.dto";
import { ReassignTaskDto } from "./dto/reassign-task.dto";
import { TaskCommentDto } from "./dto/task-comment.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";

@Injectable()
export class TasksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) { }

    async listTasks(
        user: AuthUser,
        page = 1,
        pageSize = 20,
        status?: string,
        refusalCaseId?: string,
    ) {
        const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(pageSize), 100);
        const take = Math.min(Number(pageSize), 100);

        const where = {
            tenantId: user.tenantId,
            ...(status ? { status: status as any } : {}),
            ...(refusalCaseId ? { refusalCaseId } : {}),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.task.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.task.count({ where }),
        ]);

        return { items, total, page: Number(page), pageSize: take };
    }

    async getTaskById(user: AuthUser, id: string) {
        const task = await this.prisma.task.findFirst({
            where: {
                tenantId: user.tenantId,
                id,
            },
        });

        if (!task) {
            throw new NotFoundException("Task not found");
        }

        return task;
    }

    async createTask(user: AuthUser, dto: CreateTaskDto) {
        const row = await this.prisma.task.create({
            data: {
                tenantId: user.tenantId,
                refusalCaseId: dto.refusalCaseId,
                taskType: dto.taskType,
                title: dto.title,
                description: dto.description,
                assignedToUserId: dto.assignedToUserId,
                assignedToRoleId: dto.assignedToRoleId,
                assignedToDepartmentId: dto.assignedToDepartmentId,
                status: "PENDING",
                priority: (dto.priority || "MEDIUM") as any,
                dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
                createdByUserId: user.id,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "task",
            entityId: row.id,
            action: "task_created",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            afterJson: row as unknown as Record<string, unknown>,
        });

        return row;
    }

    async updateTask(user: AuthUser, id: string, dto: UpdateTaskDto) {
        await this.getTaskById(user, id);

        const patch: Record<string, unknown> = {};
        if (dto.title !== undefined) patch.title = dto.title;
        if (dto.description !== undefined) patch.description = dto.description;
        if (dto.status !== undefined) patch.status = dto.status as any;
        if (dto.priority !== undefined) patch.priority = dto.priority as any;
        if (dto.dueAt !== undefined) patch.dueAt = new Date(dto.dueAt);

        return this.prisma.task.update({
            where: { id },
            data: patch as any,
        });
    }

    async completeTask(user: AuthUser, id: string, dto: CompleteTaskDto) {
        const before = await this.getTaskById(user, id);

        const updated = await this.prisma.task.update({
            where: { id },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
                completedByUserId: user.id,
            },
        });

        if (dto.comment) {
            await this.prisma.taskComment.create({
                data: {
                    tenantId: user.tenantId,
                    taskId: id,
                    comment: dto.comment,
                    createdByUserId: user.id,
                },
            });
        }

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "task",
            entityId: id,
            action: "task_completed",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            beforeJson: before as unknown as Record<string, unknown>,
            afterJson: updated as unknown as Record<string, unknown>,
        });

        return updated;
    }

    async reassignTask(user: AuthUser, id: string, dto: ReassignTaskDto) {
        const before = await this.getTaskById(user, id);

        const updated = await this.prisma.task.update({
            where: { id },
            data: {
                assignedToUserId: dto.assignedToUserId,
                assignedToRoleId: dto.assignedToRoleId,
                assignedToDepartmentId: dto.assignedToDepartmentId,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "task",
            entityId: id,
            action: "task_reassigned",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            beforeJson: before as unknown as Record<string, unknown>,
            afterJson: updated as unknown as Record<string, unknown>,
            metadataJson: { reason: dto.reason || null },
        });

        return updated;
    }

    async addComment(user: AuthUser, id: string, dto: TaskCommentDto) {
        await this.getTaskById(user, id);

        return this.prisma.taskComment.create({
            data: {
                tenantId: user.tenantId,
                taskId: id,
                comment: dto.comment,
                createdByUserId: user.id,
            },
        });
    }
}
