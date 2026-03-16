import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateDischargePlanDto {
    @ApiProperty({ example: "home" })
    @IsString()
    destination!: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    instructionsProvided!: boolean;

    @ApiPropertyOptional({ example: "Discharge education completed." })
    @IsOptional()
    @IsString()
    notes?: string;
}
