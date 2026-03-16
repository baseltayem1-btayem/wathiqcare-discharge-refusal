import {
    Body,
    Controller,
    Get,
    Headers,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post("login")
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    @Post("refresh")
    async refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refresh(dto);
    }

    @Post("logout")
    async logout(@Headers("authorization") authHeader?: string) {
        const accessToken = authHeader?.replace(/^Bearer\s+/i, "");
        return this.authService.logout(accessToken);
    }

    @Get("me")
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    async me(@CurrentUser() user: AuthUser) {
        return this.authService.me(user.id, user.tenantId);
    }
}
