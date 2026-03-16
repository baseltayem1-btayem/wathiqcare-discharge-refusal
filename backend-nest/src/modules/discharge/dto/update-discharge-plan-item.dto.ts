import { IsDateString, IsOptional, IsString } from "class-validator";

export class UpdateDischargePlanItemDto {
    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsDateString()
    completedAt?: string;
}
