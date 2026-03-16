import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RolesPermissionsService {
    constructor(private readonly prisma: PrismaService) { }

    async listRoles(tenantId: string) {
        return this.prisma.role.findMany({
            where: {
                OR: [{ tenantId }, { tenantId: null }],
            },
            orderBy: [{ isSystemRole: "desc" }, { code: "asc" }],
        });
    }

    async listPermissions() {
        return this.prisma.permission.findMany({
            orderBy: [{ module: "asc" }, { code: "asc" }],
        });
    }

    async getUserRolesAndPermissions(userId: string, tenantId: string) {
        const userRoles = await this.prisma.userRole.findMany({
            where: {
                tenantId,
                userId,
            },
        });

        const roleIds = userRoles.map((item) => item.roleId);
        if (roleIds.length === 0) {
            return {
                roles: [],
                permissions: [],
            };
        }

        const roles = await this.prisma.role.findMany({
            where: {
                id: { in: roleIds },
            },
            select: { id: true, code: true },
        });

        const rolePermissions = await this.prisma.rolePermission.findMany({
            where: {
                roleId: { in: roleIds },
            },
            select: { permissionId: true },
        });

        const permissionIds = [...new Set(rolePermissions.map((item) => item.permissionId))];
        const permissions =
            permissionIds.length === 0
                ? []
                : await this.prisma.permission.findMany({
                    where: { id: { in: permissionIds } },
                    select: { code: true },
                });

        return {
            roles: roles.map((item) => item.code),
            permissions: permissions.map((item) => item.code),
        };
    }
}
