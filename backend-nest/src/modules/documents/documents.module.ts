import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DocumentStorageService } from "./document-storage.service";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";

@Module({
    imports: [AuditModule],
    controllers: [DocumentsController],
    providers: [DocumentsService, DocumentStorageService],
    exports: [DocumentsService, DocumentStorageService],
})
export class DocumentsModule { }
