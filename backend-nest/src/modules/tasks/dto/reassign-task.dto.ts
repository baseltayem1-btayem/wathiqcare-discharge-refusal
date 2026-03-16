import { IsOptional, IsString } from "class-validator";

export class ReassignTaskDto {
    @IsOptional()
    @IsString()
    assignedToUserId?: string;

    @IsOptional()
    @IsString()
    assignedToRoleId?: string;

    @IsOptional()
    @IsString()
    assignedToDepartmentId?: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
