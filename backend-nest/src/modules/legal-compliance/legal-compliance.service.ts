import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuditService } from "../audit/audit.service";
import { CreateLegalHoldDto } from "./dto/create-legal-hold.dto";
import { CreatePrivilegedNoteDto } from "./dto/create-privileged-note.dto";
import { ReleaseLegalHoldDto } from "./dto/release-legal-hold.dto";

@Injectable()
export class LegalComplianceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
    ) { }

    private async ensureCase(tenantId: string, caseId: string) {
        const row = await this.prisma.refusalCase.findFirst({
            where: { tenantId, id: caseId },
        });
        if (!row) {
            throw new NotFoundException("Case not found");
        }
        return row;
    }

    async listLegalNotes(user: AuthUser, caseId: string) {
        await this.ensureCase(user.tenantId, caseId);

        return this.prisma.privilegedNote.findMany({
            where: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async createLegalNote(
        user: AuthUser,
        caseId: string,
        dto: CreatePrivilegedNoteDto,
    ) {
        await this.ensureCase(user.tenantId, caseId);

        const created = await this.prisma.privilegedNote.create({
            data: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
                title: dto.title,
                content: dto.content,
                visibilityScope: dto.visibilityScope as any,
                createdByUserId: user.id,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "legal_note_created",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: { legalNoteId: created.id },
        });

        return created;
    }

    async caseAudit(user: AuthUser, caseId: string) {
        await this.ensureCase(user.tenantId, caseId);
        return this.auditService.caseAudit(user.tenantId, caseId);
    }

    async createLegalHold(user: AuthUser, caseId: string, dto: CreateLegalHoldDto) {
        await this.ensureCase(user.tenantId, caseId);

        const existingActive = await this.prisma.legalHold.findFirst({
            where: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
                active: true,
            },
        });

        if (existingActive) {
            throw new BadRequestException("Case already has an active legal hold");
        }

        const created = await this.prisma.legalHold.create({
            data: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
                reason: dto.reason,
                active: true,
                createdByUserId: user.id,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "legal_hold_created",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: { legalHoldId: created.id },
        });

        return created;
    }

    async releaseLegalHold(
        user: AuthUser,
        caseId: string,
        holdId: string,
        dto: ReleaseLegalHoldDto,
    ) {
        await this.ensureCase(user.tenantId, caseId);

        const hold = await this.prisma.legalHold.findFirst({
            where: {
                id: holdId,
                tenantId: user.tenantId,
                refusalCaseId: caseId,
            },
        });

        if (!hold) {
            throw new NotFoundException("Legal hold not found");
        }

        const updated = await this.prisma.legalHold.update({
            where: { id: holdId },
            data: {
                active: false,
                releasedAt: new Date(),
                releasedByUserId: user.id,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "legal_hold_released",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: {
                legalHoldId: holdId,
                note: dto.note || null,
            },
        });

        return updated;
    }
}
