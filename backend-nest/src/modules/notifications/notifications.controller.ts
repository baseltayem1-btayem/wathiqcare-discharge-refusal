import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { SendTestNotificationDto } from "./dto/send-test-notification.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
    constructor(private readonly service: NotificationsService) { }

    @Get()
    @RequirePermissions("notifications.read")
    async listNotifications(
        @CurrentUser() user: AuthUser,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
    ) {
        return this.service.listNotifications(user, page, pageSize);
    }

    @Post("test")
    @RequirePermissions("notifications.test")
    async sendTest(
        @CurrentUser() user: AuthUser,
        @Body() dto: SendTestNotificationDto,
    ) {
        return this.service.sendTest(user, dto);
    }
}
