import { IsArray, IsOptional, IsString } from "class-validator";

export class AssignUserRolesDto {
    @IsArray()
    @IsString({ each: true })
    roleIds!: string[];

    @IsOptional()
    @IsString()
    facilityId?: string;

    @IsOptional()
    @IsString()
    departmentId?: string;
}
