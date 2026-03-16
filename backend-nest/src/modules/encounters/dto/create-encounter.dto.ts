import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateEncounterDto {
    @IsString()
    patientId!: string;

    @IsString()
    encounterNumber!: string;

    @IsString()
    facilityId!: string;

    @IsOptional()
    @IsString()
    departmentId?: string;

    @IsOptional()
    @IsString()
    admissionType?: string;

    @IsOptional()
    @IsDateString()
    admissionDate?: string;

    @IsOptional()
    @IsDateString()
    dischargeExpectedDate?: string;

    @IsOptional()
    @IsString()
    attendingPhysicianName?: string;

    @IsOptional()
    @IsString()
    attendingPhysicianUserId?: string;

    @IsOptional()
    @IsString()
    room?: string;

    @IsOptional()
    @IsString()
    bed?: string;

    @IsString()
    status!: string;
}
