import { IsObject, IsOptional, IsString } from "class-validator";

export class GenerateDocumentDto {
    @IsString()
    templateId!: string;

    @IsString()
    documentType!: string;

    @IsString()
    fileName!: string;

    @IsOptional()
    @IsString()
    mimeType?: string;

    @IsOptional()
    @IsObject()
    metadataJson?: Record<string, unknown>;
}
