import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AssignUserRolesDto } from "./dto/assign-user-roles.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    @RequirePermissions("users.read")
    async listUsers(@CurrentUser() user: AuthUser) {
        return this.usersService.listUsers(user);
    }

    @Post()
    @RequirePermissions("users.create")
    async createUser(@CurrentUser() user: AuthUser, @Body() dto: CreateUserDto) {
        return this.usersService.createUser(user, dto);
    }

    @Get(":id")
    @RequirePermissions("users.read")
    async getUserById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.usersService.getUserById(user, id);
    }

    @Patch(":id")
    @RequirePermissions("users.update")
    async updateUser(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateUserDto,
    ) {
        return this.usersService.updateUser(user, id, dto);
    }

    @Post(":id/roles")
    @RequirePermissions("users.assign_roles")
    async assignRoles(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: AssignUserRolesDto,
    ) {
        return this.usersService.assignRoles(user, id, dto);
    }
}
