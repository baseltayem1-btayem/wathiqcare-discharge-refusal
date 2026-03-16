import { Module } from "@nestjs/common";
import { RolesPermissionsController } from "./roles-permissions.controller";
import { RolesPermissionsService } from "./roles-permissions.service";

@Module({
    controllers: [RolesPermissionsController],
    providers: [RolesPermissionsService],
    exports: [RolesPermissionsService],
})
export class RolesPermissionsModule { }
