import { IsBoolean, IsDateString, IsOptional, IsString } from "class-validator";

export class CreateDischargePlanItemDto {
    @IsString()
    dischargePlanId!: string;

    @IsString()
    itemType!: string;

    @IsString()
    status!: string;

    @IsBoolean()
    required!: boolean;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsDateString()
    dueAt?: string;
}
