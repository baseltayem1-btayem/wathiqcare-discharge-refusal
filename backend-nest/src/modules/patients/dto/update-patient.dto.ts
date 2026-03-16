import { IsDateString, IsEmail, IsOptional, IsString } from "class-validator";

export class UpdatePatientDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    fullName?: string;

    @IsOptional()
    @IsString()
    nationalId?: string;

    @IsOptional()
    @IsDateString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    nationality?: string;

    @IsOptional()
    @IsString()
    preferredLanguage?: string;

    @IsOptional()
    @IsString()
    primaryPhone?: string;

    @IsOptional()
    @IsString()
    secondaryPhone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;
}
