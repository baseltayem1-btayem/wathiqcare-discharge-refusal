import { IsEnum, IsOptional, IsString } from "class-validator";

export class UpdateRefusalCaseDto {
    @IsOptional()
    @IsEnum(["OPEN", "IN_PROGRESS", "ESCALATED", "CLOSED"])
    status?: "OPEN" | "IN_PROGRESS" | "ESCALATED" | "CLOSED";

    @IsOptional()
    @IsEnum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

    @IsOptional()
    @IsString()
    currentOwnerUserId?: string;

    @IsOptional()
    @IsString()
    currentOwnerDepartmentId?: string;

    @IsOptional()
    @IsString()
    summary?: string;
}
