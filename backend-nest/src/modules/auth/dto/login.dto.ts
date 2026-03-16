import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: "admin@wathiqcare.local" })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: "Admin@12345", minLength: 8 })
    @IsString()
    @MinLength(8)
    password!: string;

    @ApiPropertyOptional({ example: "wathiq-hospital" })
    @IsOptional()
    @IsString()
    tenantCode?: string;
}
