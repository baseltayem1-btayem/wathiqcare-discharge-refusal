import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { OtpService } from "./otp.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

@ApiTags("OTP")
@ApiBearerAuth()
@Controller("otp")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OtpController {
    constructor(private readonly otpService: OtpService) { }

    @Post("request")
    @RequirePermissions("otp.request")
    async requestOtp(@CurrentUser() user: AuthUser, @Body() dto: RequestOtpDto) {
        return this.otpService.requestOtp(user, dto);
    }

    @Post("verify")
    @RequirePermissions("otp.verify")
    async verifyOtp(@CurrentUser() user: AuthUser, @Body() dto: VerifyOtpDto) {
        return this.otpService.verifyOtp(user, dto);
    }
}
