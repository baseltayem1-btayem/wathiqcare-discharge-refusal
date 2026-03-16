import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuditService } from "../audit/audit.service";
import { DocumentStorageService } from "./document-storage.service";
import { GenerateDocumentDto } from "./dto/generate-document.dto";
import { UploadCaseDocumentDto } from "./dto/upload-case-document.dto";

const DEFAULT_ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024;
const FILENAME_SAFE_PATTERN = /^[A-Za-z0-9._ -]+$/;

@Injectable()
export class DocumentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
        private readonly storageService: DocumentStorageService,
        private readonly configService: ConfigService = new ConfigService(),
    ) { }

    private hasPermission(user: AuthUser, permission: string): boolean {
        return user.isSuperAdmin || user.permissions.includes(permission);
    }

    private getUploadPolicy() {
        const configuredMimeTypes = this.configService.get<string[]>("uploads.allowedMimeTypes") || [];
        const configuredMaxFileSize = this.configService.get<number>("uploads.maxFileSizeBytes");

        return {
            allowedMimeTypes:
                configuredMimeTypes.length > 0
                    ? new Set(configuredMimeTypes.map((item) => item.toLowerCase()))
                    : DEFAULT_ALLOWED_MIME_TYPES,
            maxFileSize:
                typeof configuredMaxFileSize === "number" && configuredMaxFileSize > 0
                    ? configuredMaxFileSize
                    : DEFAULT_MAX_FILE_SIZE,
        };
    }

    private sanitizeFileName(originalFileName: string): string {
        const normalized = originalFileName.trim();

        if (!normalized) {
            throw new BadRequestException("File name is required");
        }

        if (normalized.length > 255) {
            throw new BadRequestException("File name is too long");
        }

        if (normalized.includes("/") || normalized.includes("\\") || normalized.includes("..")) {
            throw new BadRequestException("File name contains invalid path characters");
        }

        if (!FILENAME_SAFE_PATTERN.test(normalized)) {
            throw new BadRequestException("File name contains unsupported characters");
        }

        return normalized;
    }

    private validateBase64Content(contentBase64: string, expectedFileSize: number, maxFileSize: number): number {
        if (!/^[A-Za-z0-9+/=\r\n]+$/.test(contentBase64)) {
            throw new BadRequestException("Invalid base64 file content");
        }

        let actualSize = 0;
        try {
            actualSize = Buffer.from(contentBase64, "base64").byteLength;
        } catch {
            throw new BadRequestException("Invalid base64 file content");
        }

        if (actualSize <= 0) {
            throw new BadRequestException("Empty file content is not allowed");
        }

        if (actualSize > maxFileSize) {
            throw new BadRequestException("File size exceeds allowed limit");
        }

        // Allow small transport rounding differences while rejecting suspicious mismatches.
        if (Math.abs(actualSize - expectedFileSize) > 1024) {
            throw new BadRequestException("File size metadata does not match uploaded content");
        }

        return actualSize;
    }

    private canViewGeneratedDocument(user: AuthUser, visibilityLevel: string): boolean {
        if (user.isSuperAdmin) {
            return true;
        }

        switch (visibilityLevel) {
            case "LEGAL":
                return this.hasPermission(user, "legal.notes.read") || this.hasPermission(user, "legal.hold.create");
            case "COMPLIANCE":
                return this.hasPermission(user, "audit.read");
            case "EXECUTIVE":
                return this.hasPermission(user, "reports.export") || this.hasPermission(user, "tenants.read");
            default:
                return true;
        }
    }

    private canViewAttachment(user: AuthUser, confidentialityLevel: string): boolean {
        if (user.isSuperAdmin) {
            return true;
        }

        switch (confidentialityLevel) {
            case "RESTRICTED":
                return this.hasPermission(user, "legal.notes.read") || this.hasPermission(user, "audit.read");
            case "SENSITIVE":
                return this.hasPermission(user, "documents.read");
            default:
                return true;
        }
    }

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

        const visibleGeneratedDocuments = generatedDocuments.filter((item) =>
            this.canViewGeneratedDocument(user, String(item.visibilityLevel || "INTERNAL")),
        );
        const visibleAttachments = attachments.filter((item) =>
            this.canViewAttachment(user, String(item.confidentialityLevel || "NORMAL")),
        );

        return {
            generatedDocuments: visibleGeneratedDocuments,
            attachments: visibleAttachments,
        };
    }

    async uploadCaseDocument(user: AuthUser, caseId: string, dto: UploadCaseDocumentDto) {
        await this.ensureCase(user.tenantId, caseId);

        const uploadPolicy = this.getUploadPolicy();
        const normalizedMimeType = dto.mimeType.trim().toLowerCase();
        const fileName = this.sanitizeFileName(dto.originalFileName);
        const category = dto.category.trim();

        if (!uploadPolicy.allowedMimeTypes.has(normalizedMimeType)) {
            throw new BadRequestException("Unsupported file type");
        }

        if (dto.fileSize > uploadPolicy.maxFileSize) {
            throw new BadRequestException("File size exceeds allowed limit");
        }

        if (!category) {
            throw new BadRequestException("Category is required");
        }

        if (dto.contentBase64) {
            this.validateBase64Content(dto.contentBase64, dto.fileSize, uploadPolicy.maxFileSize);
        }

        const storage = await this.storageService.putObject({
            tenantId: user.tenantId,
            refusalCaseId: caseId,
            fileName,
            contentBase64: dto.contentBase64,
        });

        const created = await this.prisma.$transaction(async (tx) => {
            const attachment = await tx.caseAttachment.create({
                data: {
                    tenantId: user.tenantId,
                    refusalCaseId: caseId,
                    category,
                    originalFileName: fileName,
                    storageKey: storage.storageKey,
                    mimeType: normalizedMimeType,
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

        const uploadPolicy = this.getUploadPolicy();
        const mimeType = (dto.mimeType || "application/pdf").trim().toLowerCase();
        if (!uploadPolicy.allowedMimeTypes.has(mimeType)) {
            throw new BadRequestException("Unsupported generated document MIME type");
        }

        const fileName = this.sanitizeFileName(dto.fileName);

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
            fileName,
        });

        const generated = await this.prisma.generatedDocument.create({
            data: {
                tenantId: user.tenantId,
                refusalCaseId: caseId,
                templateId: template.id,
                documentType: dto.documentType,
                fileName,
                storageKey: storage.storageKey,
                mimeType,
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
            if (!this.canViewGeneratedDocument(user, String(generated.visibilityLevel || "INTERNAL"))) {
                throw new ForbiddenException("You are not allowed to download this document");
            }

            const descriptor = await this.storageService.getDownloadDescriptor(generated.storageKey);

            await this.auditService.log({
                tenantId: user.tenantId,
                entityType: "refusal_case",
                entityId: generated.refusalCaseId,
                action: "document_downloaded",
                actorUserId: user.id,
                actorEmail: user.email,
                actorRoleSnapshot: user.roles.join(","),
                metadataJson: {
                    documentId: generated.id,
                    documentType: "generated_document",
                },
            });

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

        if (!this.canViewAttachment(user, String(attachment.confidentialityLevel || "NORMAL"))) {
            throw new ForbiddenException("You are not allowed to download this document");
        }

        const descriptor = await this.storageService.getDownloadDescriptor(attachment.storageKey);

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "refusal_case",
            entityId: attachment.refusalCaseId,
            action: "document_downloaded",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: {
                documentId: attachment.id,
                documentType: "attachment",
            },
        });

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
