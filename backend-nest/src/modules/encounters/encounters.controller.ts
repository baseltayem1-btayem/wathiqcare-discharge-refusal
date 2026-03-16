import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CreateEncounterDto } from "./dto/create-encounter.dto";
import { EncountersService } from "./encounters.service";

@ApiTags("Encounters")
@ApiBearerAuth()
@Controller("encounters")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EncountersController {
    constructor(private readonly encountersService: EncountersService) { }

    @Get()
    @RequirePermissions("encounters.read")
    async listEncounters(
        @CurrentUser() user: AuthUser,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.encountersService.listEncounters(user, page, pageSize);
    }

    @Post()
    @RequirePermissions("encounters.create")
    async createEncounter(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateEncounterDto,
    ) {
        return this.encountersService.createEncounter(user, dto);
    }

    @Get(":id")
    @RequirePermissions("encounters.read")
    async getEncounterById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.encountersService.getEncounterById(user, id);
    }
}
