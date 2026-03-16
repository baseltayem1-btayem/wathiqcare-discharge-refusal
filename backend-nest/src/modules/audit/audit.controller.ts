import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("Audit")
@ApiBearerAuth()
@Controller("audit")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
    constructor(private readonly prisma: PrismaService) { }

    @Get("logs")
    @RequirePermissions("audit.read")
    async listLogs(
        @CurrentUser() user: AuthUser,
        @Query("entityType") entityType?: string,
        @Query("entityId") entityId?: string,
        @Query("page") page = 1,
        @Query("pageSize") pageSize = 50,
    ) {
        const skip = (Math.max(Number(page), 1) - 1) * Math.min(Number(pageSize), 100);
        const take = Math.min(Number(pageSize), 100);

        const where = {
            tenantId: user.tenantId,
            ...(entityType ? { entityType } : {}),
            ...(entityId ? { entityId } : {}),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take,
                orderBy: { occurredAt: "desc" },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return { items, total, page: Number(page), pageSize: take };
    }
}
