import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateDischargeDecisionDto {
    @IsOptional()
    @IsString()
    decisionStatus?: string;

    @IsOptional()
    @IsBoolean()
    dischargeMedicallyAppropriate?: boolean;

    @IsOptional()
    @IsString()
    clinicalRemarks?: string;

    @IsOptional()
    @IsBoolean()
    reversalIndicator?: boolean;

    @IsOptional()
    @IsString()
    reversalReason?: string;
}
