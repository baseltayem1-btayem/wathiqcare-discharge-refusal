import { IsEnum, IsOptional, IsString } from "class-validator";

export class SendTestNotificationDto {
    @IsEnum(["IN_APP", "SMS", "EMAIL", "WHATSAPP"])
    channel!: "IN_APP" | "SMS" | "EMAIL" | "WHATSAPP";

    @IsOptional()
    @IsString()
    recipientUserId?: string;

    @IsOptional()
    @IsString()
    recipientPhone?: string;

    @IsOptional()
    @IsString()
    recipientEmail?: string;

    @IsString()
    message!: string;
}
