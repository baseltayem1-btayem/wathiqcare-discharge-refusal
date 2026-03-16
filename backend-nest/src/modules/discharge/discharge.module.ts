import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DischargeController } from "./discharge.controller";
import { DischargeService } from "./discharge.service";

@Module({
    imports: [AuditModule],
    controllers: [DischargeController],
    providers: [DischargeService],
    exports: [DischargeService],
})
export class DischargeModule { }
