import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { RolesPermissionsService } from "./roles-permissions.service";

@ApiTags("Roles & Permissions")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesPermissionsController {
    constructor(private readonly service: RolesPermissionsService) { }

    @Get("roles")
    @RequirePermissions("roles.read")
    async getRoles(@CurrentUser() user: AuthUser) {
        return this.service.listRoles(user.tenantId);
    }

    @Get("permissions")
    @RequirePermissions("permissions.read")
    async getPermissions() {
        return this.service.listPermissions();
    }
}
