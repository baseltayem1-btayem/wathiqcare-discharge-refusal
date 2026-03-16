import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CreateLegalHoldDto } from "./dto/create-legal-hold.dto";
import { CreatePrivilegedNoteDto } from "./dto/create-privileged-note.dto";
import { ReleaseLegalHoldDto } from "./dto/release-legal-hold.dto";
import { LegalComplianceService } from "./legal-compliance.service";

@ApiTags("Legal & Compliance")
@ApiBearerAuth()
@Controller("cases")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LegalComplianceController {
    constructor(private readonly service: LegalComplianceService) { }

    @Get(":id/legal-notes")
    @RequirePermissions("legal.notes.read")
    async listLegalNotes(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.listLegalNotes(user, id);
    }

    @Post(":id/legal-notes")
    @RequirePermissions("legal.notes.create")
    async createLegalNote(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: CreatePrivilegedNoteDto,
    ) {
        return this.service.createLegalNote(user, id, dto);
    }

    @Get(":id/audit")
    @RequirePermissions("audit.read")
    async caseAudit(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.caseAudit(user, id);
    }

    @Post(":id/legal-hold")
    @RequirePermissions("legal.hold.create")
    async createLegalHold(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: CreateLegalHoldDto,
    ) {
        return this.service.createLegalHold(user, id, dto);
    }

    @Patch(":id/legal-hold/:holdId/release")
    @RequirePermissions("legal.hold.release")
    async releaseLegalHold(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Param("holdId") holdId: string,
        @Body() dto: ReleaseLegalHoldDto,
    ) {
        return this.service.releaseLegalHold(user, id, holdId, dto);
    }
}
