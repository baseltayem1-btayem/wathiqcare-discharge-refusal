import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { RefusalCasesController } from "./refusal-cases.controller";
import { RefusalCasesService } from "./refusal-cases.service";

@Module({
    imports: [AuditModule],
    controllers: [RefusalCasesController],
    providers: [RefusalCasesService],
    exports: [RefusalCasesService],
})
export class RefusalCasesModule { }
