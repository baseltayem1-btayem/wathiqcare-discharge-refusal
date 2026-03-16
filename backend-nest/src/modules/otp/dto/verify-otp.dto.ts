import { IsString } from "class-validator";

export class VerifyOtpDto {
    @IsString()
    otpRequestId!: string;

    @IsString()
    otpCode!: string;
}
