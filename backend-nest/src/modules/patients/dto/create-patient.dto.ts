import { IsDateString, IsEmail, IsOptional, IsString } from "class-validator";

export class CreatePatientDto {
    @IsString()
    mrn!: string;

    @IsString()
    firstName!: string;

    @IsString()
    lastName!: string;

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
