import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenantsService {
    constructor(private readonly prisma: PrismaService) { }

    async getByCode(code: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { code },
        });
        if (!tenant) {
            throw new NotFoundException(`Tenant not found for code: ${code}`);
        }
        return tenant;
    }

    async getById(id: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
        });
        if (!tenant) {
            throw new NotFoundException(`Tenant not found: ${id}`);
        }
        return tenant;
    }

    async list() {
        return this.prisma.tenant.findMany({
            orderBy: { createdAt: "desc" },
        });
    }
}
