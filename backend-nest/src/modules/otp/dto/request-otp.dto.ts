import { IsOptional, IsString } from "class-validator";

export class RequestOtpDto {
    @IsOptional()
    @IsString()
    refusalCaseId?: string;

    @IsOptional()
    @IsString()
    acknowledgmentRequestId?: string;

    @IsString()
    recipientPhone!: string;

    @IsString()
    purpose!: string;
}
