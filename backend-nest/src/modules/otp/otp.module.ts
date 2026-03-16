import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { OtpController } from "./otp.controller";
import { OtpCacheService } from "./otp-cache.service";
import { OtpService } from "./otp.service";

@Module({
    imports: [AuditModule],
    controllers: [OtpController],
    providers: [OtpService, OtpCacheService],
    exports: [OtpService, OtpCacheService],
})
export class OtpModule { }
