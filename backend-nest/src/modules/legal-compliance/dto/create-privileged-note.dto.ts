import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreatePrivilegedNoteDto {
    @ApiPropertyOptional({ example: "Counsel legal review" })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ example: "Detailed privileged legal note content." })
    @IsString()
    content!: string;

    @ApiProperty({ enum: ["LEGAL_ONLY", "COMPLIANCE_ONLY", "LEGAL_AND_COMPLIANCE"], example: "LEGAL_ONLY" })
    @IsString()
    visibilityScope!: "LEGAL_ONLY" | "COMPLIANCE_ONLY" | "LEGAL_AND_COMPLIANCE";
}
