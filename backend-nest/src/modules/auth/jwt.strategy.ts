import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { PrismaService } from "../../prisma/prisma.service";
import { RolesPermissionsService } from "../roles-permissions/roles-permissions.service";
import { JwtPayload } from "./auth.types";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly rolesPermissionsService: RolesPermissionsService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>("jwt.accessSecret") || "access-secret",
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findFirst({
            where: {
                id: payload.sub,
                tenantId: payload.tenantId,
                status: "ACTIVE",
            },
        });

        if (!user) {
            throw new UnauthorizedException("Invalid token subject");
        }

        const authz = await this.rolesPermissionsService.getUserRolesAndPermissions(
            user.id,
            user.tenantId,
        );

        return {
            id: user.id,
            tenantId: user.tenantId,
            email: user.email,
            isSuperAdmin: user.isSuperAdmin,
            roles: authz.roles,
            permissions: authz.permissions,
        };
    }
}
