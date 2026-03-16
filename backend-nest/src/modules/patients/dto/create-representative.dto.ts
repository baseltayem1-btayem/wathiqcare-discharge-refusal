import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateRepresentativeDto {
    @IsString()
    representativeType!: string;

    @IsString()
    fullName!: string;

    @IsString()
    relationshipToPatient!: string;

    @IsOptional()
    @IsString()
    idType?: string;

    @IsOptional()
    @IsString()
    idNumber?: string;

    @IsOptional()
    @IsString()
    authorityBasis?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}
