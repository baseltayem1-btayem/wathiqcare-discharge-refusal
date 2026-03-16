import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { DocumentsService } from "./documents.service";
import { GenerateDocumentDto } from "./dto/generate-document.dto";
import { UploadCaseDocumentDto } from "./dto/upload-case-document.dto";

@ApiTags("Documents")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
    constructor(private readonly service: DocumentsService) { }

    @Get("cases/:id/documents")
    @RequirePermissions("documents.read")
    async listCaseDocuments(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.listCaseDocuments(user, id);
    }

    @Post("cases/:id/documents/upload")
    @RequirePermissions("documents.upload")
    async uploadCaseDocument(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UploadCaseDocumentDto,
    ) {
        return this.service.uploadCaseDocument(user, id, dto);
    }

    @Post("cases/:id/documents/generate")
    @RequirePermissions("documents.generate")
    async generateCaseDocument(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: GenerateDocumentDto,
    ) {
        return this.service.generateCaseDocument(user, id, dto);
    }

    @Get("documents/:id/download")
    @RequirePermissions("documents.download")
    async downloadDocument(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.downloadDocument(user, id);
    }

    @Delete("documents/:id")
    @RequirePermissions("documents.delete")
    async deleteDocument(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.deleteDocument(user, id);
    }
}
