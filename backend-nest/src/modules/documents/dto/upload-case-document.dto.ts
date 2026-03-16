import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, MaxLength } from "class-validator";

export class UploadCaseDocumentDto {
    @ApiProperty({ example: "legal" })
    @IsNotEmpty()
    @MaxLength(64)
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    category!: string;

    @ApiProperty({ example: "smoke-test.pdf" })
    @IsNotEmpty()
    @MaxLength(255)
    @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    originalFileName!: string;

    @ApiProperty({ example: "application/pdf" })
    @Transform(({ value }) =>
        typeof value === "string" ? value.trim().toLowerCase() : value,
    )
    @IsString()
    @IsNotEmpty()
    mimeType!: string;

    @ApiProperty({ example: 512, minimum: 1 })
    @IsInt()
    @Min(1)
    fileSize!: number;

    @ApiPropertyOptional({ example: "NORMAL" })
    @Transform(({ value }) =>
        typeof value === "string" ? value.trim().toUpperCase() : value,
    )
    @IsOptional()
    @IsString()
    @IsIn(["NORMAL", "SENSITIVE", "RESTRICTED"])
    confidentialityLevel?: string;

    @ApiPropertyOptional({ example: "c21va2UgdGVzdCBjb250ZW50" })
    @IsOptional()
    @IsString()
    contentBase64?: string;
}
