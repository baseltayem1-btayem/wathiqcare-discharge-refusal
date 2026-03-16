import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePrivilegedNoteDto {
    @ApiPropertyOptional({ example: "Counsel legal review" })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    title?: string;

    @ApiProperty({ example: "Detailed privileged legal note content." })
    @IsString()
    @MinLength(5)
    @MaxLength(4000)
    content!: string;

    @ApiProperty({ enum: ["LEGAL_ONLY", "COMPLIANCE_ONLY", "LEGAL_AND_COMPLIANCE"], example: "LEGAL_ONLY" })
    @IsString()
    @IsIn(["LEGAL_ONLY", "COMPLIANCE_ONLY", "LEGAL_AND_COMPLIANCE"])
    visibilityScope!: "LEGAL_ONLY" | "COMPLIANCE_ONLY" | "LEGAL_AND_COMPLIANCE";
}
