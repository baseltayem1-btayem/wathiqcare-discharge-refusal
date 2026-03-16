import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CreateDischargeDecisionDto } from "./dto/create-discharge-decision.dto";
import { CreateDischargePlanDto } from "./dto/create-discharge-plan.dto";
import { CreateDischargePlanItemDto } from "./dto/create-discharge-plan-item.dto";
import { UpdateDischargeDecisionDto } from "./dto/update-discharge-decision.dto";
import { UpdateDischargePlanItemDto } from "./dto/update-discharge-plan-item.dto";
import { DischargeService } from "./discharge.service";

@ApiTags("Discharge")
@ApiBearerAuth()
@Controller("cases")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DischargeController {
    constructor(private readonly service: DischargeService) { }

    @Post(":id/discharge-decision")
    @RequirePermissions("discharge.decision.create")
    async createDischargeDecision(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: CreateDischargeDecisionDto,
    ) {
        return this.service.createDischargeDecision(user, id, dto);
    }

    @Get(":id/discharge-decision")
    @RequirePermissions("discharge.decision.read")
    async getDischargeDecision(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.getDischargeDecision(user, id);
    }

    @Patch(":id/discharge-decision")
    @RequirePermissions("discharge.decision.update")
    async patchDischargeDecision(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateDischargeDecisionDto,
    ) {
        return this.service.updateDischargeDecision(user, id, dto);
    }

    @Post(":id/discharge-plan")
    @RequirePermissions("discharge.plan.create")
    async createDischargePlan(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: CreateDischargePlanDto,
    ) {
        return this.service.createDischargePlan(user, id, dto);
    }

    @Post(":id/discharge-plan/items")
    @RequirePermissions("discharge.plan.update")
    async createDischargePlanItem(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: CreateDischargePlanItemDto,
    ) {
        return this.service.createDischargePlanItem(user, id, dto);
    }

    @Patch(":id/discharge-plan/items/:itemId")
    @RequirePermissions("discharge.plan.update")
    async patchDischargePlanItem(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Param("itemId") itemId: string,
        @Body() dto: UpdateDischargePlanItemDto,
    ) {
        return this.service.updateDischargePlanItem(user, id, itemId, dto);
    }
}
