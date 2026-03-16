import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsOptional, IsString } from "class-validator";

export class CreateDischargeDecisionDto {
    @ApiProperty({ example: "issued" })
    @IsString()
    decisionStatus!: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    dischargeMedicallyAppropriate!: boolean;

    @ApiProperty({ example: "2026-03-16" })
    @IsDateString()
    decisionDate!: string;

    @ApiProperty({ example: "10:45" })
    @IsString()
    decisionTime!: string;

    @ApiPropertyOptional({ example: "Patient stable for discharge." })
    @IsOptional()
    @IsString()
    clinicalRemarks?: string;
}
