import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { RolesPermissionsModule } from "../roles-permissions/roles-permissions.module";
import { TenantsModule } from "../tenants/tenants.module";
import { AuditModule } from "../audit/audit.module";

@Module({
    imports: [
        ConfigModule,
        PassportModule,
        RolesPermissionsModule,
        TenantsModule,
        AuditModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>("jwt.accessSecret") || "access-secret",
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService],
})
export class AuthModule { }
