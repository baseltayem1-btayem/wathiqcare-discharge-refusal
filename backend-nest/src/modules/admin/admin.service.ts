import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateTenantSettingDto } from "./dto/update-tenant-setting.dto";

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) { }

    async listTenants() {
        return this.prisma.tenant.findMany({
            orderBy: { createdAt: "desc" },
        });
    }

    async getTenant(id: string) {
        return this.prisma.tenant.findUniqueOrThrow({
            where: { id },
        });
    }

    async updateTenantSetting(tenantId: string, dto: UpdateTenantSettingDto) {
        return this.prisma.tenantSetting.upsert({
            where: {
                tenantId_configKey: {
                    tenantId,
                    configKey: dto.configKey,
                },
            },
            create: {
                tenantId,
                configKey: dto.configKey,
                configValue: dto.configValueJson as any,
            },
            update: {
                configValue: dto.configValueJson as any,
            },
        });
    }
}
