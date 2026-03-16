import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ExecuteTransitionDto {
    @ApiProperty({ example: "to_patient_relations" })
    @IsString()
    transitionCode!: string;

    @ApiPropertyOptional({ example: "Escalating for patient relations follow-up." })
    @IsOptional()
    @IsString()
    comment?: string;

    @ApiPropertyOptional({ example: "Persistent refusal after counseling." })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    hasRequiredDocument?: boolean;
}
