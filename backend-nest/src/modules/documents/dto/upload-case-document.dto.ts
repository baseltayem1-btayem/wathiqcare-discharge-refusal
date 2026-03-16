import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Min } from "class-validator";

export class UploadCaseDocumentDto {
    @ApiProperty({ example: "legal" })
    @IsString()
    category!: string;

    @ApiProperty({ example: "smoke-test.pdf" })
    @IsString()
    originalFileName!: string;

    @ApiProperty({ example: "application/pdf" })
    @IsString()
    mimeType!: string;

    @ApiProperty({ example: 512, minimum: 1 })
    @Min(1)
    fileSize!: number;

    @ApiPropertyOptional({ example: "NORMAL" })
    @IsOptional()
    @IsString()
    confidentialityLevel?: string;

    @ApiPropertyOptional({ example: "c21va2UgdGVzdCBjb250ZW50" })
    @IsOptional()
    @IsString()
    contentBase64?: string;
}
