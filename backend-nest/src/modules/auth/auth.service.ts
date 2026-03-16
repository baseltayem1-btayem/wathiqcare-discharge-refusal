import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../../prisma/prisma.service";
import { RolesPermissionsService } from "../roles-permissions/roles-permissions.service";
import { TenantsService } from "../tenants/tenants.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { AuthTokens, JwtPayload } from "./auth.types";

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly rolesPermissionsService: RolesPermissionsService,
        private readonly tenantsService: TenantsService,
    ) { }

    private async resolveTenantId(tenantCode?: string): Promise<string> {
        const resolvedCode =
            tenantCode || this.configService.get<string>("defaultTenantCode") || "wathiq-hospital";
        const tenant = await this.tenantsService.getByCode(resolvedCode);
        return tenant.id;
    }

    private async buildTokens(payload: JwtPayload): Promise<AuthTokens> {
        const accessExpiresIn = this.configService.get<string>("jwt.accessExpiresIn") || "15m";
        const refreshExpiresIn = this.configService.get<string>("jwt.refreshExpiresIn") || "7d";

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>("jwt.accessSecret"),
            expiresIn: accessExpiresIn as any,
        });

        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.configService.get<string>("jwt.refreshSecret"),
            expiresIn: refreshExpiresIn as any,
        });

        return {
            accessToken,
            refreshToken,
            expiresIn: accessExpiresIn,
        };
    }

    async login(dto: LoginDto) {
        const tenantId = await this.resolveTenantId(dto.tenantCode);
        const user = await this.prisma.user.findFirst({
            where: {
                tenantId,
                email: dto.email.trim().toLowerCase(),
            },
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException("Invalid credentials");
        }

        if (user.status !== "ACTIVE") {
            throw new UnauthorizedException("User account is not active");
        }

        const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
        if (!validPassword) {
            throw new UnauthorizedException("Invalid credentials");
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        const payload: JwtPayload = {
            sub: user.id,
            tenantId: user.tenantId,
            email: user.email,
            isSuperAdmin: user.isSuperAdmin,
        };

        const tokens = await this.buildTokens(payload);
        const authz = await this.rolesPermissionsService.getUserRolesAndPermissions(
            user.id,
            user.tenantId,
        );

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                tenantId: user.tenantId,
                isSuperAdmin: user.isSuperAdmin,
                roles: authz.roles,
                permissions: authz.permissions,
            },
            ...tokens,
        };
    }

    async refresh(dto: RefreshTokenDto) {
        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
                secret: this.configService.get<string>("jwt.refreshSecret"),
            });

            const user = await this.prisma.user.findFirst({
                where: {
                    id: payload.sub,
                    tenantId: payload.tenantId,
                    status: "ACTIVE",
                },
            });

            if (!user) {
                throw new UnauthorizedException("User not found or inactive");
            }

            return this.buildTokens({
                sub: user.id,
                tenantId: user.tenantId,
                email: user.email,
                isSuperAdmin: user.isSuperAdmin,
            });
        } catch (error) {
            throw new UnauthorizedException("Invalid refresh token");
        }
    }

    async me(userId: string, tenantId: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                id: userId,
                tenantId,
            },
        });
        if (!user) {
            throw new UnauthorizedException("User not found");
        }

        const authz = await this.rolesPermissionsService.getUserRolesAndPermissions(
            user.id,
            user.tenantId,
        );

        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            tenantId: user.tenantId,
            isSuperAdmin: user.isSuperAdmin,
            roles: authz.roles,
            permissions: authz.permissions,
        };
    }

    async logout(accessToken?: string) {
        if (!accessToken) {
            throw new BadRequestException("Missing access token");
        }

        return {
            invalidated: true,
            message:
                "Stateless JWT logout acknowledged. For immediate revocation, enable token denylist in Redis.",
        };
    }
}
