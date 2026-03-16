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
import { CreatePatientDto } from "./dto/create-patient.dto";
import { CreateRepresentativeDto } from "./dto/create-representative.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";
import { PatientsService } from "./patients.service";

@ApiTags("Patients")
@ApiBearerAuth()
@Controller("patients")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
    constructor(private readonly patientsService: PatientsService) { }

    @Get()
    @RequirePermissions("patients.read")
    async listPatients(
        @CurrentUser() user: AuthUser,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("search") search?: string,
    ) {
        return this.patientsService.listPatients(user, page, pageSize, search);
    }

    @Post()
    @RequirePermissions("patients.create")
    async createPatient(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreatePatientDto,
    ) {
        return this.patientsService.createPatient(user, dto);
    }

    @Get(":id")
    @RequirePermissions("patients.read")
    async getPatientById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.patientsService.getPatientById(user, id);
    }

    @Patch(":id")
    @RequirePermissions("patients.update")
    async updatePatient(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdatePatientDto,
    ) {
        return this.patientsService.updatePatient(user, id, dto);
    }

    @Get(":id/representatives")
    @RequirePermissions("representatives.read")
    async listRepresentatives(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
    ) {
        return this.patientsService.listRepresentatives(user, id);
    }

    @Post(":id/representatives")
    @RequirePermissions("representatives.create")
    async addRepresentative(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: CreateRepresentativeDto,
    ) {
        return this.patientsService.addRepresentative(user, id, dto);
    }
}
