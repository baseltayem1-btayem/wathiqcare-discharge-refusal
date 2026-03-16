import { IsOptional, IsString } from "class-validator";

export class AssignCaseDto {
    @IsOptional()
    @IsString()
    userId?: string;

    @IsOptional()
    @IsString()
    departmentId?: string;

    @IsOptional()
    @IsString()
    note?: string;
}
