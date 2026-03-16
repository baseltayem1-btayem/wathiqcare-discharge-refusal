import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuditService } from "../audit/audit.service";
import { DocumentStorageService } from "./document-storage.service";
import { GenerateDocumentDto } from "./dto/generate-document.dto";
import { UploadCaseDocumentDto } from "./dto/upload-case-document.dto";

const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024;

@Injectable()
export class DocumentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
        private readonly storageService: DocumentStorageService,
    ) { }

    private async ensureCase(tenantId: string, caseId: string) {
        const row = await this.prisma.refusalCase.findFirst({
            where: {
                tenantId,
                id: caseId,
            },
        });
        if (!row) throw new NotFoundException("Case not found");
        return row;
    }

    async listCaseDocuments(user: AuthUser, caseId: string) {
        await this.ensureCase(user.tenantId, caseId);

        const [generatedDocuments, attachments] = await this.prisma.$transaction([
            this.prisma.generatedDocument.findMany({
                where: {
                    tenantId: user.tenantId,
                    refusalCaseId: caseId,
                },
                orderBy: { generatedAt: "desc" },
            }),
            this.prisma.caseAttachment.findMany({
                where: {
                    tenantId: user.tenantId,
                    refusalCaseId: caseId,
                    deletedAt: null,
                },
                orderBy: { uploadedAt: "desc" },
            }),
        ]);

        return { generatedDocuments, attachments };
    }

    async uploadCaseDocument(user: AuthUser, caseId: string, dto: UploadCaseDocumentDto) {
        await this.ensureCase(user.tenantId, caseId);

        if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
            throw new BadRequestException("Unsupported file type");
        }

        if (dto.fileSize > MAX_FILE_SIZE) {
            throw new BadRequestException("File size exceeds allowed limit");
        }

        if (!dto.category.trim()) {
            throw new BadRequestException("Category is required");
        }

        const storage = await this.storageService.putObject({
            tenantId: user.tenantId,
            refusalCaseId: caseId,
            fileName: dto.originalFileName,
            contentBase64: dto.contentBase64,
        });

        const created = await this.prisma.$transaction(async (tx) => {
            const attachment = await tx.caseAttachment.create({
                data: {
                    tenantId: user.tenantId,
                    refusalCaseId: caseId,
                    category: dto.category,
                    originalFileName: dto.originalFileName,
                    storageKey: storage.storageKey,
                    mimeType: dto.mimeType,
                    fileSize: BigInt(dto.fileSize),
                    confidentialityLevel: (dto.confidentialityLevel || "NORMAL") as any,
                    uploadedByUserId: user.id,
                },
            });

            await tx.attachmentVersion.create({
                data: {
                    tenantId: user.tenantId,
                    caseAttachmentId: attachment.id,
                    versionNumber: 1,
                    storageKey: storage.storageKey,
                    uploadedByUserId: user.id,
                },
            });

            return attachment;
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "document_uploaded",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: {
                attachmentId: created.id,
                category: created.category,
            },
        });

        return created;
    }

    async generateCaseDocument(user: AuthUser, caseId: string, dto: GenerateDocumentDto) {
        await this.ensureCase(user.tenantId, caseId);

        const template = await this.prisma.documentTemplate.findFirst({
            where: {
                id: dto.templateId,
                OR: [{ tenantId: user.tenantId }, { tenantId: null }],
                active: true,
            },
        });

        if (!template) {
            throw new BadRequestException("Document template not found or inactive");
        }

        const storage = await this.storageService.putObject({
            tenantId: user.tenantId,
            refusalCaseId: caseId,
            fileName: dto.fileName,
        });

        const generated = await this.prisma.generatedDocument.create({
            data: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
                templateId: template.id,
                documentType: dto.documentType,
                fileName: dto.fileName,
                storageKey: storage.storageKey,
                mimeType: dto.mimeType || "application/pdf",
                fileSize: BigInt(storage.persistedSize),
                generatedByUserId: user.id,
                visibilityLevel: "INTERNAL",
                metadataJson: (dto.metadataJson ?? undefined) as any,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: caseId,
            action: "document_generated",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: {
                generatedDocumentId: generated.id,
                templateId: template.id,
            },
        });

        return generated;
    }

    async downloadDocument(user: AuthUser, documentId: string) {
        const generated = await this.prisma.generatedDocument.findFirst({
            where: { id: documentId, tenantId: user.tenantId },
        });

        if (generated) {
            const descriptor = await this.storageService.getDownloadDescriptor(generated.storageKey);
            return {
                id: generated.id,
                type: "generated_document",
                fileName: generated.fileName,
                mimeType: generated.mimeType,
                ...descriptor,
            };
        }

        const attachment = await this.prisma.caseAttachment.findFirst({
            where: {
                id: documentId,
                tenantId: user.tenantId,
                deletedAt: null,
            },
        });

        if (!attachment) {
            throw new NotFoundException("Document not found");
        }

        const descriptor = await this.storageService.getDownloadDescriptor(attachment.storageKey);
        return {
            id: attachment.id,
            type: "attachment",
            fileName: attachment.originalFileName,
            mimeType: attachment.mimeType,
            ...descriptor,
        };
    }

    async deleteDocument(user: AuthUser, documentId: string) {
        const attachment = await this.prisma.caseAttachment.findFirst({
            where: {
                tenantId: user.tenantId,
                id: documentId,
                deletedAt: null,
            },
        });

        if (!attachment) {
            throw new NotFoundException("Only case attachments can be deleted");
        }

        const hold = await this.prisma.legalHold.findFirst({
            where: {
                tenantId: user.tenantId,
                refusalCaseId: attachment.refusalCaseId,
                active: true,
            },
        });

        if (hold) {
            throw new ForbiddenException("Document cannot be deleted while legal hold is active");
        }

        const updated = await this.prisma.caseAttachment.update({
            where: { id: attachment.id },
            data: {
                deletedAt: new Date(),
                deletedByUserId: user.id,
            },
        });

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: attachment.refusalCaseId,
            action: "document_deleted",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: {
                attachmentId: attachment.id,
            },
        });

        return updated;
    }
}
