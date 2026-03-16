import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { FacilitiesDepartmentsService } from "./facilities-departments.service";

@ApiTags("Facilities & Departments")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FacilitiesDepartmentsController {
    constructor(private readonly service: FacilitiesDepartmentsService) { }

    @Get("facilities")
    @RequirePermissions("facilities.read")
    async getFacilities(@CurrentUser() user: AuthUser) {
        return this.service.listFacilities(user.tenantId);
    }

    @Get("departments")
    @RequirePermissions("departments.read")
    async getDepartments(
        @CurrentUser() user: AuthUser,
        @Query("facilityId") facilityId?: string,
    ) {
        return this.service.listDepartments(user.tenantId, facilityId);
    }
}
