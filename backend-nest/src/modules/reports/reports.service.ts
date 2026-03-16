import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { ExportReportDto } from "./dto/export-report.dto";

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async dashboard(user: AuthUser) {
        const [openCases, inProgressCases, escalatedCases, closedCases, overdueTasks] =
            await this.prisma.$transaction([
                this.prisma.refusalCase.count({
                    where: { tenantId: user.tenantId, status: "OPEN" },
                }),
                this.prisma.refusalCase.count({
                    where: { tenantId: user.tenantId, status: "IN_PROGRESS" },
                }),
                this.prisma.refusalCase.count({
                    where: { tenantId: user.tenantId, status: "ESCALATED" },
                }),
                this.prisma.refusalCase.count({
                    where: { tenantId: user.tenantId, status: "CLOSED" },
                }),
                this.prisma.task.count({
                    where: {
                        tenantId: user.tenantId,
                        status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] },
                        dueAt: { lt: new Date() },
                    },
                }),
            ]);

        return {
            openCases,
            inProgressCases,
            escalatedCases,
            closedCases,
            overdueTasks,
        };
    }

    async casesSummary(user: AuthUser) {
        const grouped = await this.prisma.refusalCase.groupBy({
            by: ["status", "caseType"],
            where: {
                tenantId: user.tenantId,
            },
            _count: {
                id: true,
            },
        });

        return grouped;
    }

    async tasksOverdue(user: AuthUser) {
        return this.prisma.task.findMany({
            where: {
                tenantId: user.tenantId,
                status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] },
                dueAt: { lt: new Date() },
            },
            orderBy: { dueAt: "asc" },
            take: 500,
        });
    }

    async legalEscalations(user: AuthUser) {
        return this.prisma.escalationEvent.findMany({
            where: {
                tenantId: user.tenantId,
            },
            orderBy: { escalatedAt: "desc" },
            take: 500,
        });
    }

    async exportReport(user: AuthUser, dto: ExportReportDto) {
        const fileKey = `${user.tenantId}/reports/${dto.reportType}-${Date.now()}.json`;
        return this.prisma.reportExport.create({
            data: {
                tenantId: user.tenantId,
                requestedByUserId: user.id,
                reportType: dto.reportType,
                filtersJson: (dto.filtersJson ?? undefined) as any,
                fileKey,
                status: "COMPLETED",
                completedAt: new Date(),
            },
        });
    }
}
