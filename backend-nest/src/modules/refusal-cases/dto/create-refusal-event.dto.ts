import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsBoolean,
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
} from "class-validator";

export class CreateRefusalEventDto {
    @ApiProperty({ example: "2026-03-16" })
    @IsDateString()
    refusalDate!: string;

    @ApiProperty({ example: "11:00" })
    @IsString()
    @IsNotEmpty()
    refusalTime!: string;

    @ApiProperty({ example: "Ahmad Saleh" })
    @IsString()
    @IsNotEmpty()
    refusingPersonName!: string;

    @ApiProperty({ example: "self" })
    @IsString()
    @IsNotEmpty()
    refusingPersonRelationship!: string;

    @ApiPropertyOptional({ example: "representative-id" })
    @IsOptional()
    @IsString()
    representativeId?: string;

    @ApiProperty({ example: "reason-category-id" })
    @IsString()
    @IsNotEmpty()
    reasonCategoryId!: string;

    @ApiPropertyOptional({ example: "Patient requested additional time due to financial concerns." })
    @IsOptional()
    @IsString()
    detailedReason?: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    consequencesExplained!: boolean;

    @ApiPropertyOptional({ example: "user-id" })
    @IsOptional()
    @IsString()
    explanationProvidedByUserId?: string;

    @ApiProperty({ example: false })
    @IsBoolean()
    immediateEscalationRequired!: boolean;

    @ApiPropertyOptional({ example: "medium" })
    @IsOptional()
    @IsString()
    riskIndicator?: string;

    @ApiPropertyOptional({ example: "Counseling initiated and documented." })
    @IsOptional()
    @IsString()
    notes?: string;
}
