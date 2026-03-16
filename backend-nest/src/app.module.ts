import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import appConfig from "./config/app.config";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AdminModule } from "./modules/admin/admin.module";
import { UsersModule } from "./modules/users/users.module";
import { RolesPermissionsModule } from "./modules/roles-permissions/roles-permissions.module";
import { FacilitiesDepartmentsModule } from "./modules/facilities-departments/facilities-departments.module";
import { PatientsModule } from "./modules/patients/patients.module";
import { EncountersModule } from "./modules/encounters/encounters.module";
import { RefusalCasesModule } from "./modules/refusal-cases/refusal-cases.module";
import { DischargeModule } from "./modules/discharge/discharge.module";
import { RepresentativesModule } from "./modules/representatives/representatives.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OtpModule } from "./modules/otp/otp.module";
import { AuditModule } from "./modules/audit/audit.module";
import { LegalComplianceModule } from "./modules/legal-compliance/legal-compliance.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig],
            validate: validateEnv,
        }),
        PrismaModule,
        AuthModule,
        AdminModule,
        UsersModule,
        RolesPermissionsModule,
        FacilitiesDepartmentsModule,
        PatientsModule,
        EncountersModule,
        RefusalCasesModule,
        DischargeModule,
        RepresentativesModule,
        WorkflowsModule,
        TasksModule,
        DocumentsModule,
        NotificationsModule,
        OtpModule,
        AuditModule,
        LegalComplianceModule,
        ReportsModule,
        TenantsModule,
    ],
    controllers: [HealthController],
    providers: [HealthService],
})
export class AppModule { }
