import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AssignCaseDto } from "./dto/assign-case.dto";
import { CloseCaseDto } from "./dto/close-case.dto";
import { CreateRefusalCaseDto } from "./dto/create-refusal-case.dto";
import { CreateRefusalEventDto } from "./dto/create-refusal-event.dto";
import { RespondAcknowledgmentDto } from "./dto/respond-acknowledgment.dto";
import { SendAcknowledgmentDto } from "./dto/send-acknowledgment.dto";
import { UpdateRefusalCaseDto } from "./dto/update-refusal-case.dto";
import { RefusalCasesService } from "./refusal-cases.service";

@ApiTags("Refusal Cases")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RefusalCasesController {
    constructor(private readonly service: RefusalCasesService) { }

    @Get("refusal-reason-categories")
    @RequirePermissions("refusal_events.create")
    async listRefusalReasonCategories(@CurrentUser() user: AuthUser) {
        return this.service.listRefusalReasonCategories(user);
    }

    @Get("cases")
    @RequirePermissions("cases.read")
    async listCases(
        @CurrentUser() user: AuthUser,
        @Query("status") status?: string,
        @Query("department") department?: string,
        @Query("facility") facility?: string,
        @Query("patient") patient?: string,
        @Query("dateFrom") dateFrom?: string,
        @Query("dateTo") dateTo?: string,
        @Query("escalated_to_legal") escalatedToLegal?: string,
        @Query("overdue") overdue?: string,
        @Query("case_type") caseType?: string,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.service.listCases(user, {
            status,
            department,
            facility,
            patient,
            dateFrom,
            dateTo,
            escalatedToLegal,
            overdue,
            caseType,
            page,
            pageSize,
        });
    }

    @Post("cases")
    @RequirePermissions("cases.create")
    async createCase(@CurrentUser() user: AuthUser, @Body() dto: CreateRefusalCaseDto) {
        return this.service.createCase(user, dto);
    }

    @Get("cases/:id")
    @RequirePermissions("cases.read")
    async getCaseById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.getCaseById(user, id);
    }

    @Patch("cases/:id")
    @RequirePermissions("cases.update")
    async updateCase(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateRefusalCaseDto,
    ) {
        return this.service.updateCase(user, id, dto);
    }

    @Post("cases/:id/assign")
    @RequirePermissions("cases.assign")
    async assignCase(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: AssignCaseDto,
    ) {
        return this.service.assignCase(user, id, dto);
    }

    @Post("cases/:id/close")
    @RequirePermissions("cases.close")
    async closeCase(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: CloseCaseDto,
    ) {
        return this.service.closeCase(user, id, dto);
    }

    @Get("cases/:id/timeline")
    @RequirePermissions("cases.read")
    async timeline(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.timeline(user, id);
    }

    @Post("cases/:id/refusal-events")
    @RequirePermissions("refusal_events.create")
    async createRefusalEvent(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: CreateRefusalEventDto,
    ) {
        return this.service.createRefusalEvent(user, id, dto);
    }

    @Get("cases/:id/refusal-events")
    @RequirePermissions("refusal_events.read")
    async getRefusalEvents(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.listRefusalEvents(user, id);
    }

    @Post("cases/:id/acknowledgment/send")
    @RequirePermissions("acknowledgments.send")
    async sendAcknowledgment(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: SendAcknowledgmentDto,
    ) {
        return this.service.sendAcknowledgment(user, id, dto);
    }

    @Get("cases/:id/acknowledgment-requests")
    @RequirePermissions("acknowledgments.read")
    async listAcknowledgmentRequests(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
    ) {
        return this.service.listAcknowledgmentRequests(user, id);
    }

    @Post("acknowledgments/:id/respond")
    @RequirePermissions("acknowledgments.respond")
    async respondAcknowledgment(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: RespondAcknowledgmentDto,
    ) {
        return this.service.respondAcknowledgment(user, id, dto);
    }
}
