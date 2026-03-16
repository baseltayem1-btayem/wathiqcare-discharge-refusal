import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuditService } from "../audit/audit.service";
import { CreateDischargeDecisionDto } from "./dto/create-discharge-decision.dto";
import { CreateDischargePlanDto } from "./dto/create-discharge-plan.dto";
import { CreateDischargePlanItemDto } from "./dto/create-discharge-plan-item.dto";
import { UpdateDischargeDecisionDto } from "./dto/update-discharge-decision.dto";
import { UpdateDischargePlanItemDto } from "./dto/update-discharge-plan-item.dto";

@Injectable()
export class DischargeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) { }

    private ensurePhysicianRole(user: AuthUser): void {
        const isPhysician = user.roles.includes("physician");
        const hasOverride = user.permissions.includes("discharge.decision.create.override");
        if (!isPhysician && !hasOverride) {
            throw new ForbiddenException(
                "Only authorized physician role can create discharge decision",
            );
        }
    }

    private async getCaseOrThrow(tenantId: string, caseId: string) {
        const row = await this.prisma.refusalCase.findFirst({
            where: { tenantId, id: caseId },
        });
        if (!row) throw new NotFoundException("Case not found");
        return row;
    }

    async createDischargeDecision(
        user: AuthUser,
        caseId: string,
        dto: CreateDischargeDecisionDto,
    ) {
        this.ensurePhysicianRole(user);
        const caseRow = await this.getCaseOrThrow(user.tenantId, caseId);

        const existing = await this.prisma.dischargeDecision.findFirst({
            where: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
            },
        });

        if (existing) {
            throw new BadRequestException("Discharge decision already exists for this case");
        }

        const created = await this.prisma.dischargeDecision.create({
            data: {
                tenantId: user.tenantId,
                encounterId: caseRow.encounterId,
                refusalCaseId: caseId,
                decisionStatus: dto.decisionStatus,
                dischargeMedicallyAppropriate: dto.dischargeMedicallyAppropriate,
                decisionDate: new Date(dto.decisionDate),
                decisionTime: dto.decisionTime,
                issuedByUserId: user.id,
                clinicalRemarks: dto.clinicalRemarks,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "discharge_decision_created",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            afterJson: created as unknown as Record<string, unknown>,
        });

        return created;
    }

    async getDischargeDecision(user: AuthUser, caseId: string) {
        await this.getCaseOrThrow(user.tenantId, caseId);

        return this.prisma.dischargeDecision.findFirst({
            where: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
            },
        });
    }

    async updateDischargeDecision(
        user: AuthUser,
        caseId: string,
        dto: UpdateDischargeDecisionDto,
    ) {
        const existing = await this.prisma.dischargeDecision.findFirst({
            where: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
            },
        });
        if (!existing) {
            throw new NotFoundException("Discharge decision not found");
        }

        const updated = await this.prisma.dischargeDecision.update({
            where: { id: existing.id },
            data: {
                ...dto,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "discharge_decision_updated",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            beforeJson: existing as unknown as Record<string, unknown>,
            afterJson: updated as unknown as Record<string, unknown>,
        });

        return updated;
    }

    async createDischargePlan(user: AuthUser, caseId: string, dto: CreateDischargePlanDto) {
        const caseRow = await this.getCaseOrThrow(user.tenantId, caseId);

        const created = await this.prisma.dischargePlan.create({
            data: {
                tenantId: user.tenantId,
                encounterId: caseRow.encounterId,
                refusalCaseId: caseId,
                destination: dto.destination,
                instructionsProvided: dto.instructionsProvided,
                notes: dto.notes,
                createdByUserId: user.id,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "discharge_plan_created",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            afterJson: created as unknown as Record<string, unknown>,
        });

        return created;
    }

    async createDischargePlanItem(
        user: AuthUser,
        caseId: string,
        dto: CreateDischargePlanItemDto,
    ) {
        await this.getCaseOrThrow(user.tenantId, caseId);

        const plan = await this.prisma.dischargePlan.findFirst({
            where: {
                id: dto.dischargePlanId,
                tenantId: user.tenantId,
                refusalCaseId: caseId,
            },
        });

        if (!plan) {
            throw new BadRequestException("Invalid discharge plan for case");
        }

        return this.prisma.dischargePlanItem.create({
            data: {
                tenantId: user.tenantId,
                dischargePlanId: dto.dischargePlanId,
                itemType: dto.itemType,
                status: dto.status,
                required: dto.required,
                notes: dto.notes,
                dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
            },
        });
    }

    async updateDischargePlanItem(
        user: AuthUser,
        caseId: string,
        itemId: string,
        dto: UpdateDischargePlanItemDto,
    ) {
        await this.getCaseOrThrow(user.tenantId, caseId);

        const existing = await this.prisma.dischargePlanItem.findFirst({
            where: {
                id: itemId,
                tenantId: user.tenantId,
            },
        });

        if (!existing) {
            throw new NotFoundException("Discharge plan item not found");
        }

        return this.prisma.dischargePlanItem.update({
            where: { id: itemId },
            data: {
                status: dto.status,
                notes: dto.notes,
                completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
            },
        });
    }
}
