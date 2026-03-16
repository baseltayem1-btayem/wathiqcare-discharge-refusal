import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CompleteTaskDto } from "./dto/complete-task.dto";
import { CreateTaskDto } from "./dto/create-task.dto";
import { ReassignTaskDto } from "./dto/reassign-task.dto";
import { TaskCommentDto } from "./dto/task-comment.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@ApiTags("Tasks")
@ApiBearerAuth()
@Controller("tasks")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TasksController {
    constructor(private readonly service: TasksService) { }

    @Get()
    @RequirePermissions("tasks.read")
    async listTasks(
        @CurrentUser() user: AuthUser,
        @Query("page") page?: number,
        @Query("pageSize") pageSize?: number,
        @Query("status") status?: string,
        @Query("refusalCaseId") refusalCaseId?: string,
    ) {
        return this.service.listTasks(user, page, pageSize, status, refusalCaseId);
    }

    @Get(":id")
    @RequirePermissions("tasks.read")
    async getTaskById(@CurrentUser() user: AuthUser, @Param("id") id: string) {
        return this.service.getTaskById(user, id);
    }

    @Post()
    @RequirePermissions("tasks.create")
    async createTask(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
        return this.service.createTask(user, dto);
    }

    @Patch(":id")
    @RequirePermissions("tasks.update")
    async patchTask(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: UpdateTaskDto,
    ) {
        return this.service.updateTask(user, id, dto);
    }

    @Post(":id/complete")
    @RequirePermissions("tasks.complete")
    async completeTask(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: CompleteTaskDto,
    ) {
        return this.service.completeTask(user, id, dto);
    }

    @Post(":id/reassign")
    @RequirePermissions("tasks.reassign")
    async reassignTask(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: ReassignTaskDto,
    ) {
        return this.service.reassignTask(user, id, dto);
    }

    @Post(":id/comments")
    @RequirePermissions("tasks.comment")
    async addComment(
        @CurrentUser() user: AuthUser,
        @Param("id") id: string,
        @Body() dto: TaskCommentDto,
    ) {
        return this.service.addComment(user, id, dto);
    }
}
