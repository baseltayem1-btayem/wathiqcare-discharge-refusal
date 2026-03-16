import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { LegalComplianceController } from "./legal-compliance.controller";
import { LegalComplianceService } from "./legal-compliance.service";

@Module({
    imports: [AuditModule],
    controllers: [LegalComplianceController],
    providers: [LegalComplianceService],
    exports: [LegalComplianceService],
})
export class LegalComplianceModule { }
