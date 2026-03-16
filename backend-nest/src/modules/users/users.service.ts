import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AssignUserRolesDto } from "./dto/assign-user-roles.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async listUsers(user: AuthUser) {
        return this.prisma.user.findMany({
            where: {
                tenantId: user.tenantId,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async createUser(user: AuthUser, dto: CreateUserDto) {
        const email = dto.email.trim().toLowerCase();

        const exists = await this.prisma.user.findFirst({
            where: {
                tenantId: user.tenantId,
                email,
            },
        });

        if (exists) {
            throw new BadRequestException("A user with this email already exists");
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const fullName = `${dto.firstName} ${dto.lastName}`;

        return this.prisma.user.create({
            data: {
                tenantId: user.tenantId,
                employeeCode: dto.employeeCode,
                firstName: dto.firstName,
                lastName: dto.lastName,
                fullName,
                email,
                phone: dto.phone,
                passwordHash,
                status: "ACTIVE",
            },
        });
    }

    async getUserById(user: AuthUser, id: string) {
        const row = await this.prisma.user.findFirst({
            where: {
                id,
                tenantId: user.tenantId,
            },
        });
        if (!row) {
            throw new NotFoundException("User not found");
        }
        return row;
    }

    async updateUser(user: AuthUser, id: string, dto: UpdateUserDto) {
        await this.getUserById(user, id);

        const patch: Record<string, unknown> = {};
        if (dto.firstName !== undefined) patch.firstName = dto.firstName;
        if (dto.lastName !== undefined) patch.lastName = dto.lastName;
        if (dto.fullName !== undefined) patch.fullName = dto.fullName;
        if (dto.phone !== undefined) patch.phone = dto.phone;
        if (dto.status !== undefined) patch.status = dto.status;

        if (dto.firstName || dto.lastName) {
            const existing = await this.prisma.user.findUniqueOrThrow({ where: { id } });
            patch.fullName = `${dto.firstName || existing.firstName} ${dto.lastName || existing.lastName}`;
        }

        return this.prisma.user.update({
            where: { id },
            data: patch,
        });
    }

    async assignRoles(user: AuthUser, userId: string, dto: AssignUserRolesDto) {
        await this.getUserById(user, userId);

        return this.prisma.$transaction(async (tx) => {
            await tx.userRole.deleteMany({
                where: {
                    tenantId: user.tenantId,
                    userId,
                },
            });

            if (dto.roleIds.length === 0) {
                return [];
            }

            await tx.userRole.createMany({
                data: dto.roleIds.map((roleId) => ({
                    tenantId: user.tenantId,
                    userId,
                    roleId,
                    facilityId: dto.facilityId,
                    departmentId: dto.departmentId,
                })),
            });

            return tx.userRole.findMany({
                where: {
                    tenantId: user.tenantId,
                    userId,
                },
            });
        });
    }
}
