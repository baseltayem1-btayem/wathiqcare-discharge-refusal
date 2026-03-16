import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuditService } from "../audit/audit.service";
import { AssignCaseDto } from "./dto/assign-case.dto";
import { CloseCaseDto } from "./dto/close-case.dto";
import { CreateRefusalCaseDto } from "./dto/create-refusal-case.dto";
import { CreateRefusalEventDto } from "./dto/create-refusal-event.dto";
import { RespondAcknowledgmentDto } from "./dto/respond-acknowledgment.dto";
import { SendAcknowledgmentDto } from "./dto/send-acknowledgment.dto";
import { UpdateRefusalCaseDto } from "./dto/update-refusal-case.dto";

type ListCaseFilters = {
    status?: string;
    department?: string;
    facility?: string;
    patient?: string;
    caseType?: string;
    escalatedToLegal?: string;
    overdue?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
};

@Injectable()
export class RefusalCasesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) { }

    private async getCaseOrThrow(tenantId: string, caseId: string) {
        const row = await this.prisma.refusalCase.findFirst({
            where: {
                tenantId,
                id: caseId,
            },
        });

        if (!row) {
            throw new NotFoundException("Refusal case not found");
        }

        return row;
    }

    private async nextCaseNumber(tenantId: string): Promise<string> {
        const count = await this.prisma.refusalCase.count({ where: { tenantId } });
        const year = new Date().getFullYear();
        return `RC-${year}-${String(count + 1).padStart(6, "0")}`;
    }

    async listCases(user: AuthUser, filters: ListCaseFilters) {
        const page = Math.max(Number(filters.page || 1), 1);
        const pageSize = Math.min(Math.max(Number(filters.pageSize || 20), 1), 100);
        const skip = (page - 1) * pageSize;

        const where: Record<string, unknown> = {
            tenantId: user.tenantId,
        };

        if (filters.status) where.status = filters.status;
        if (filters.department) where.departmentId = filters.department;
        if (filters.facility) where.facilityId = filters.facility;
        if (filters.patient) where.patientId = filters.patient;
        if (filters.caseType) where.caseType = filters.caseType;
        if (filters.escalatedToLegal === "true") where.escalatedToLegal = true;
        if (filters.escalatedToLegal === "false") where.escalatedToLegal = false;

        if (filters.dateFrom || filters.dateTo) {
            where.createdAt = {
                ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
                ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
            };
        }

        if (filters.overdue === "true") {
            const overdueTaskCaseIds = await this.prisma.task.findMany({
                where: {
                    tenantId: user.tenantId,
                    dueAt: { lt: new Date() },
                    status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] },
                },
                select: { refusalCaseId: true },
            });
            const caseIds = [...new Set(overdueTaskCaseIds.map((item) => item.refusalCaseId))];
            where.id = { in: caseIds.length ? caseIds : ["__none__"] };
        }

        const [items, total] = await this.prisma.$transaction([
            this.prisma.refusalCase.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.refusalCase.count({ where }),
        ]);

        return { items, total, page, pageSize };
    }

    async listRefusalReasonCategories(user: AuthUser) {
        return this.prisma.refusalReasonCategory.findMany({
            where: {
                active: true,
                OR: [{ tenantId: user.tenantId }, { tenantId: null }],
            },
            orderBy: [{ tenantId: "desc" }, { nameEn: "asc" }],
        });
    }

    async createCase(user: AuthUser, dto: CreateRefusalCaseDto) {
        const [patient, encounter] = await this.prisma.$transaction([
            this.prisma.patient.findFirst({
                where: { tenantId: user.tenantId, id: dto.patientId },
            }),
            this.prisma.encounter.findFirst({
                where: { tenantId: user.tenantId, id: dto.encounterId },
            }),
        ]);

        if (!patient || !encounter) {
            throw new BadRequestException("Patient or encounter not found in tenant scope");
        }

        const workflow = await this.prisma.workflow.findFirst({
            where: {
                OR: [{ tenantId: user.tenantId }, { tenantId: null }],
                code: "refusal_case_default",
                active: true,
            },
            orderBy: [{ tenantId: "desc" }],
        });

        let workflowVersionId: string | undefined;
        let initialStage: { id: string; code: string } | null = null;
        if (workflow) {
            const workflowVersion = await this.prisma.workflowVersion.findFirst({
                where: {
                    workflowId: workflow.id,
                    status: "PUBLISHED",
                },
                orderBy: { versionNumber: "desc" },
            });

            if (workflowVersion) {
                workflowVersionId = workflowVersion.id;
                initialStage = await this.prisma.workflowStage.findFirst({
                    where: {
                        workflowVersionId: workflowVersion.id,
                        isInitial: true,
                    },
                    select: { id: true, code: true },
                });
            }
        }

        const caseNumber = await this.nextCaseNumber(user.tenantId);

        const created = await this.prisma.$transaction(async (tx) => {
            const row = await tx.refusalCase.create({
                data: {
                    tenantId: user.tenantId,
                    caseNumber,
                    caseType: dto.caseType,
                    status: "OPEN",
                    priority: dto.priority,
                    facilityId: dto.facilityId,
                    departmentId: dto.departmentId,
                    patientId: dto.patientId,
                    encounterId: dto.encounterId,
                    initiatedByUserId: user.id,
                    summary: dto.summary,
                    workflowVersionId,
                    currentStageId: initialStage?.id,
                    currentStageCode: initialStage?.code,
                },
            });

            if (initialStage) {
                await tx.caseStageHistory.create({
                    data: {
                        tenantId: user.tenantId,
                        refusalCaseId: row.id,
                        toStageId: initialStage.id,
                        changedByUserId: user.id,
                        comment: "Case initialized",
                    },
                });
            }

            return row;
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: created.id,
            action: "case_created",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            afterJson: created as unknown as Record<string, unknown>,
        });

        return created;
    }

    async getCaseById(user: AuthUser, caseId: string) {
        return this.getCaseOrThrow(user.tenantId, caseId);
    }

    async updateCase(user: AuthUser, caseId: string, dto: UpdateRefusalCaseDto) {
        const existing = await this.getCaseOrThrow(user.tenantId, caseId);

        const updated = await this.prisma.refusalCase.update({
            where: { id: caseId },
            data: {
                ...dto,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "case_updated",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            beforeJson: existing as unknown as Record<string, unknown>,
            afterJson: updated as unknown as Record<string, unknown>,
        });

        return updated;
    }

    async assignCase(user: AuthUser, caseId: string, dto: AssignCaseDto) {
        const before = await this.getCaseOrThrow(user.tenantId, caseId);

        const updated = await this.prisma.refusalCase.update({
            where: { id: caseId },
            data: {
                currentOwnerUserId: dto.userId,
                currentOwnerDepartmentId: dto.departmentId,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "case_assigned",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            beforeJson: before as unknown as Record<string, unknown>,
            afterJson: updated as unknown as Record<string, unknown>,
            metadataJson: { note: dto.note || null },
        });

        return updated;
    }

    async closeCase(user: AuthUser, caseId: string, dto: CloseCaseDto) {
        const before = await this.getCaseOrThrow(user.tenantId, caseId);

        const [documentCount, attachmentCount] = await this.prisma.$transaction([
            this.prisma.generatedDocument.count({
                where: {
                    tenantId: user.tenantId,
                    refusalCaseId: caseId,
                },
            }),
            this.prisma.caseAttachment.count({
                where: {
                    tenantId: user.tenantId,
                    refusalCaseId: caseId,
                    deletedAt: null,
                },
            }),
        ]);

        if (documentCount + attachmentCount === 0) {
            throw new BadRequestException(
                "Case closure requires at least one generated document or attachment",
            );
        }

        const updated = await this.prisma.refusalCase.update({
            where: { id: caseId },
            data: {
                status: "CLOSED",
                closedAt: new Date(),
                closureReason: dto.closureReason,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "case_closed",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            beforeJson: before as unknown as Record<string, unknown>,
            afterJson: updated as unknown as Record<string, unknown>,
            metadataJson: { note: dto.note || null },
        });

        return updated;
    }

    async timeline(user: AuthUser, caseId: string) {
        await this.getCaseOrThrow(user.tenantId, caseId);

        const [
            stageHistory,
            refusalEvents,
            ackRequests,
            tasks,
            escalations,
        ] = await this.prisma.$transaction([
            this.prisma.caseStageHistory.findMany({
                where: { tenantId: user.tenantId, refusalCaseId: caseId },
                orderBy: { changedAt: "asc" },
            }),
            this.prisma.refusalEvent.findMany({
                where: { tenantId: user.tenantId, refusalCaseId: caseId },
                orderBy: { createdAt: "asc" },
            }),
            this.prisma.acknowledgmentRequest.findMany({
                where: { tenantId: user.tenantId, refusalCaseId: caseId },
                orderBy: { createdAt: "asc" },
            }),
            this.prisma.task.findMany({
                where: { tenantId: user.tenantId, refusalCaseId: caseId },
                orderBy: { createdAt: "asc" },
            }),
            this.prisma.escalationEvent.findMany({
                where: { tenantId: user.tenantId, refusalCaseId: caseId },
                orderBy: { escalatedAt: "asc" },
            }),
        ]);

        const audits = await this.auditService.caseAudit(user.tenantId, caseId);

        return {
            stageHistory,
            refusalEvents,
            acknowledgmentRequests: ackRequests,
            tasks,
            escalationEvents: escalations,
            audit: audits,
        };
    }

    async createRefusalEvent(user: AuthUser, caseId: string, dto: CreateRefusalEventDto) {
        await this.getCaseOrThrow(user.tenantId, caseId);

        const reasonCategory = await this.prisma.refusalReasonCategory.findFirst({
            where: {
                id: dto.reasonCategoryId,
                OR: [{ tenantId: user.tenantId }, { tenantId: null }],
                active: true,
            },
        });

        if (!reasonCategory) {
            throw new BadRequestException("Invalid reason category");
        }

        const created = await this.prisma.refusalEvent.create({
            data: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
                refusalRecorded: true,
                refusalDate: new Date(dto.refusalDate),
                refusalTime: dto.refusalTime,
                refusingPersonName: dto.refusingPersonName,
                refusingPersonRelationship: dto.refusingPersonRelationship,
                representativeId: dto.representativeId,
                reasonCategoryId: dto.reasonCategoryId,
                detailedReason: dto.detailedReason,
                consequencesExplained: dto.consequencesExplained,
                explanationProvidedByUserId:
                    dto.explanationProvidedByUserId || user.id,
                immediateEscalationRequired: dto.immediateEscalationRequired,
                riskIndicator: dto.riskIndicator,
                notes: dto.notes,
                createdByUserId: user.id,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "refusal_event_created",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            afterJson: created as unknown as Record<string, unknown>,
        });

        return created;
    }

    async listRefusalEvents(user: AuthUser, caseId: string) {
        await this.getCaseOrThrow(user.tenantId, caseId);

        return this.prisma.refusalEvent.findMany({
            where: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async sendAcknowledgment(user: AuthUser, caseId: string, dto: SendAcknowledgmentDto) {
        const caseRow = await this.getCaseOrThrow(user.tenantId, caseId);

        const dischargeDecision = await this.prisma.dischargeDecision.findFirst({
            where: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
            },
        });

        if (!dischargeDecision) {
            throw new BadRequestException(
                "Case cannot move to acknowledgment without discharge decision",
            );
        }

        const request = await this.prisma.acknowledgmentRequest.create({
            data: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
                recipientType: dto.recipientType,
                patientId: dto.patientId || caseRow.patientId,
                representativeId: dto.representativeId,
                recipientName: dto.recipientName,
                relationshipToPatient: dto.relationshipToPatient,
                deliveryMethod: dto.deliveryMethod,
                status: "SENT",
                sentAt: new Date(),
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                createdByUserId: user.id,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "acknowledgment_sent",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            afterJson: request as unknown as Record<string, unknown>,
        });

        return request;
    }

    async listAcknowledgmentRequests(user: AuthUser, caseId: string) {
        await this.getCaseOrThrow(user.tenantId, caseId);

        return this.prisma.acknowledgmentRequest.findMany({
            where: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async respondAcknowledgment(
        user: AuthUser,
        acknowledgmentRequestId: string,
        dto: RespondAcknowledgmentDto,
    ) {
        const request = await this.prisma.acknowledgmentRequest.findFirst({
            where: {
                id: acknowledgmentRequestId,
                tenantId: user.tenantId,
            },
        });

        if (!request) {
            throw new NotFoundException("Acknowledgment request not found");
        }

        if (request.recipientType === "REPRESENTATIVE" && !request.representativeId) {
            throw new BadRequestException(
                "Representative response requires an authorized representative on request",
            );
        }

        const result = await this.prisma.$transaction(async (tx) => {
            const response = await tx.acknowledgmentResponse.create({
                data: {
                    tenantId: user.tenantId,
                    acknowledgmentRequestId,
                    outcome: dto.outcome,
                    responseDate: new Date(dto.responseDate),
                    responseTime: dto.responseTime,
                    method: dto.method,
                    signatureCaptured: dto.signatureCaptured,
                    otpVerified: dto.otpVerified,
                    witnessName: dto.witnessName,
                    witnessRole: dto.witnessRole,
                    notes: dto.notes,
                    capturedByUserId: user.id,
                },
            });

            await tx.acknowledgmentRequest.update({
                where: { id: acknowledgmentRequestId },
                data: {
                    status: "RESPONDED",
                },
            });

            return response;
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: request.refusalCaseId,
            action: "acknowledgment_responded",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            afterJson: result as unknown as Record<string, unknown>,
        });

        return result;
    }
}
