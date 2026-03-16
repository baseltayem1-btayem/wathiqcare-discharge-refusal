import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { ExecuteTransitionDto } from "./dto/execute-transition.dto";
import { WorkflowsService } from "./workflows.service";

@ApiTags("Workflows")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkflowsController {
    constructor(private readonly service: WorkflowsService) { }

    @Get("workflows")
    @RequirePermissions("workflows.read")
    async getWorkflows(@CurrentUser() user: AuthUser) {
        return this.service.listWorkflows(user.tenantId);
    }

    @Get("workflows/:id")
    @RequirePermissions("workflows.read")
    async getWorkflowById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.getWorkflowById(user.tenantId, id);
    }

    @Get("cases/:id/available-transitions")
    @RequirePermissions("workflows.transition.read")
    async getAvailableTransitions(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
    ) {
        return this.service.availableTransitions(user, id);
    }

    @Post("cases/:id/transition")
    @RequirePermissions("workflows.transition.execute")
    async transitionCase(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: ExecuteTransitionDto,
    ) {
        return this.service.executeTransition(user, id, dto);
    }
}
