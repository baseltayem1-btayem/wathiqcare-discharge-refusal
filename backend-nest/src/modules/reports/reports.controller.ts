import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { ExportReportDto } from "./dto/export-report.dto";
import { ReportsService } from "./reports.service";

@ApiTags("Reports")
@ApiBearerAuth()
@Controller("reports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
    constructor(private readonly service: ReportsService) { }

    @Get("dashboard")
    @RequirePermissions("reports.dashboard")
    async dashboard(@CurrentUser() user: AuthUser) {
        return this.service.dashboard(user);
    }

    @Get("cases-summary")
    @RequirePermissions("reports.cases_summary")
    async casesSummary(@CurrentUser() user: AuthUser) {
        return this.service.casesSummary(user);
    }

    @Get("tasks-overdue")
    @RequirePermissions("reports.tasks_overdue")
    async tasksOverdue(@CurrentUser() user: AuthUser) {
        return this.service.tasksOverdue(user);
    }

    @Get("legal-escalations")
    @RequirePermissions("reports.legal_escalations")
    async legalEscalations(@CurrentUser() user: AuthUser) {
        return this.service.legalEscalations(user);
    }

    @Post("export")
    @RequirePermissions("reports.export")
    async exportReport(@CurrentUser() user: AuthUser, @Body() dto: ExportReportDto) {
        return this.service.exportReport(user, dto);
    }
}
