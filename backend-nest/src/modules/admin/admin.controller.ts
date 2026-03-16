import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AdminService } from "./admin.service";
import { UpdateTenantSettingDto } from "./dto/update-tenant-setting.dto";

@ApiTags("Admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get("tenants")
    @RequirePermissions("tenants.read")
    async getTenants() {
        return this.adminService.listTenants();
    }

    @Get("tenants/:id")
    @RequirePermissions("tenants.read")
    async getTenant(@Param("id") id: string) {
        return this.adminService.getTenant(id);
    }

    @Patch("tenants/:id/settings")
    @RequirePermissions("tenants.settings.update")
    async patchTenantSettings(
        @Param("id") id: string,
        @Body() dto: UpdateTenantSettingDto,
    ) {
        return this.adminService.updateTenantSetting(id, dto);
    }
}
