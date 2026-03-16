import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { RepresentativesService } from "./representatives.service";

@ApiTags("Representatives")
@ApiBearerAuth()
@Controller("representatives")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RepresentativesController {
    constructor(private readonly service: RepresentativesService) { }

    @Get()
    @RequirePermissions("representatives.read")
    async listRepresentatives(
        @CurrentUser() user: AuthUser,
        @Query("patientId") patientId?: string,
    ) {
        return this.service.listRepresentatives(user.tenantId, patientId);
    }
}
