import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";

@Module({
    imports: [AuditModule],
    controllers: [WorkflowsController],
    providers: [WorkflowsService],
    exports: [WorkflowsService],
})
export class WorkflowsModule { }
