import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateRefusalCaseDto {
    @ApiProperty({ enum: ["DISCHARGE_REFUSAL", "OTHER"], example: "DISCHARGE_REFUSAL" })
    @IsEnum(["DISCHARGE_REFUSAL", "OTHER"])
    caseType!: "DISCHARGE_REFUSAL" | "OTHER";

    @ApiPropertyOptional({ enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], example: "HIGH" })
    @IsOptional()
    @IsEnum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

    @ApiProperty({ example: "facility-id" })
    @IsString()
    facilityId!: string;

    @ApiProperty({ example: "department-id" })
    @IsString()
    departmentId!: string;

    @ApiProperty({ example: "patient-id" })
    @IsString()
    patientId!: string;

    @ApiProperty({ example: "encounter-id" })
    @IsString()
    encounterId!: string;

    @ApiPropertyOptional({ example: "Patient declined discharge after counseling." })
    @IsOptional()
    @IsString()
    summary?: string;
}
