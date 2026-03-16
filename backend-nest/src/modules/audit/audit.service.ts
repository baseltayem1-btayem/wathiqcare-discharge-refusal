import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

type AuditInput = {
    tenantId: string;
    entityType: string;
    entityId: string;
    action: string;
    actorUserId?: string | null;
    actorEmail?: string | null;
    actorRoleSnapshot?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    beforeJson?: Record<string, unknown> | null;
    afterJson?: Record<string, unknown> | null;
    metadataJson?: Record<string, unknown> | null;
};

@Injectable()
export class AuditService {
    constructor(private readonly prisma: PrismaService) { }

    async log(input: AuditInput) {
        return this.prisma.auditLog.create({
            data: {
                tenantId: input.tenantId,
                entityType: input.entityType,
                entityId: input.entityId,
                action: input.action,
                actorUserId: input.actorUserId,
                actorEmail: input.actorEmail,
                actorRoleSnapshot: input.actorRoleSnapshot,
                ipAddress: input.ipAddress,
                userAgent: input.userAgent,
                beforeJson: (input.beforeJson ?? undefined) as any,
                afterJson: (input.afterJson ?? undefined) as any,
                metadataJson: (input.metadataJson ?? undefined) as any,
            },
        });
    }

    async caseAudit(tenantId: string, refusalCaseId: string) {
        return this.prisma.auditLog.findMany({
            where: {
                tenantId,
                entityType: "refusal_case",
                entityId: refusalCaseId,
            },
            orderBy: { occurredAt: "desc" },
        });
    }
}
