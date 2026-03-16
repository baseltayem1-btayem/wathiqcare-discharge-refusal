import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
} from "class-validator";

export class RespondAcknowledgmentDto {
    @IsEnum([
        "ACCEPTED",
        "REFUSED",
        "PENDING",
        "NO_RESPONSE",
        "REPRESENTATIVE_UNAVAILABLE",
        "AUTHORITY_DISPUTED",
        "SIGNATURE_DECLINED",
        "TECHNICAL_FAILURE",
    ])
    outcome!:
        | "ACCEPTED"
        | "REFUSED"
        | "PENDING"
        | "NO_RESPONSE"
        | "REPRESENTATIVE_UNAVAILABLE"
        | "AUTHORITY_DISPUTED"
        | "SIGNATURE_DECLINED"
        | "TECHNICAL_FAILURE";

    @IsDateString()
    responseDate!: string;

    @IsString()
    responseTime!: string;

    @IsString()
    method!: string;

    @IsBoolean()
    signatureCaptured!: boolean;

    @IsBoolean()
    otpVerified!: boolean;

    @IsOptional()
    @IsString()
    witnessName?: string;

    @IsOptional()
    @IsString()
    witnessRole?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
