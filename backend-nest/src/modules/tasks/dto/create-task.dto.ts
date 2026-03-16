import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateTaskDto {
    @IsString()
    refusalCaseId!: string;

    @IsString()
    taskType!: string;

    @IsString()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

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
    priority?: string;

    @IsOptional()
    @IsDateString()
    dueAt?: string;
}
