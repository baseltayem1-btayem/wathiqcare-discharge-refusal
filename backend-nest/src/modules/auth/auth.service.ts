import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
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
        private readonly auditService: AuditService,
        private readonly rolesPermissionsService: RolesPermissionsService,
        private readonly tenantsService: TenantsService,
    ) { }

    private async logAuthEvent(input: {
        tenantId: string;
        action: string;
        entityId: string;
        actorUserId?: string | null;
        actorEmail?: string | null;
        metadataJson?: Record<string, unknown>;
    }) {
        try {
            await this.auditService.log({
                tenantId: input.tenantId,
                entityType: "auth_session",
                entityId: input.entityId,
                action: input.action,
                actorUserId: input.actorUserId,
                actorEmail: input.actorEmail,
                metadataJson: input.metadataJson,
            });
        } catch {
            // Never block authentication flow because audit logging failed.
        }
    }

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
        const normalizedEmail = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findFirst({
            where: {
                tenantId,
                email: normalizedEmail,
            },
        });

        if (!user || !user.passwordHash) {
            await this.logAuthEvent({
                tenantId,
                entityId: normalizedEmail,
                action: "auth_login_failed",
                actorEmail: normalizedEmail,
                metadataJson: { reason: "user_not_found_or_no_password" },
            });
            throw new UnauthorizedException("Invalid credentials");
        }

        if (user.status !== "ACTIVE") {
            await this.logAuthEvent({
                tenantId,
                entityId: user.id,
                action: "auth_login_failed",
                actorUserId: user.id,
                actorEmail: user.email,
                metadataJson: { reason: "inactive_user" },
            });
            throw new UnauthorizedException("User account is not active");
        }

        const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
        if (!validPassword) {
            await this.logAuthEvent({
                tenantId,
                entityId: user.id,
                action: "auth_login_failed",
                actorUserId: user.id,
                actorEmail: user.email,
                metadataJson: { reason: "invalid_password" },
            });
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

        await this.logAuthEvent({
            tenantId: user.tenantId,
            entityId: user.id,
            action: "auth_login_success",
            actorUserId: user.id,
            actorEmail: user.email,
        });

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

            await this.logAuthEvent({
                tenantId: user.tenantId,
                entityId: user.id,
                action: "auth_token_refreshed",
                actorUserId: user.id,
                actorEmail: user.email,
            });

            return this.buildTokens({
                sub: user.id,
                tenantId: user.tenantId,
                email: user.email,
                isSuperAdmin: user.isSuperAdmin,
            });
        } catch (error) {
            const defaultTenantCode = this.configService.get<string>("defaultTenantCode") || "wathiq-hospital";
            const tenant = await this.tenantsService.getByCode(defaultTenantCode).catch(() => null);
            if (tenant) {
                await this.logAuthEvent({
                    tenantId: tenant.id,
                    entityId: "refresh_token",
                    action: "auth_refresh_failed",
                    metadataJson: { reason: "invalid_or_expired_refresh_token" },
                });
            }
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

        try {
            const payload = await this.jwtService.verifyAsync<JwtPayload>(accessToken, {
                secret: this.configService.get<string>("jwt.accessSecret"),
                ignoreExpiration: true,
            });

            await this.logAuthEvent({
                tenantId: payload.tenantId,
                entityId: payload.sub,
                action: "auth_logout",
                actorUserId: payload.sub,
                actorEmail: payload.email,
            });
        } catch {
            // Ignore malformed token details; logout remains best-effort.
        }

        return {
            invalidated: true,
            message:
                "Stateless JWT logout acknowledged. For immediate revocation, enable token denylist in Redis.",
        };
    }
}
