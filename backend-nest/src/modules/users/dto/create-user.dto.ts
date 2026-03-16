import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
    @IsOptional()
    @IsString()
    employeeCode?: string;

    @IsString()
    firstName!: string;

    @IsString()
    lastName!: string;

    @IsEmail()
    email!: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsString()
    @MinLength(8)
    password!: string;
}
