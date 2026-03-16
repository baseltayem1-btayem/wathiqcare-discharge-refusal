import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FacilitiesDepartmentsService {
    constructor(private readonly prisma: PrismaService) { }

    async listFacilities(tenantId: string) {
        return this.prisma.facility.findMany({
            where: { tenantId },
            orderBy: { nameEn: "asc" },
        });
    }

    async listDepartments(tenantId: string, facilityId?: string) {
        return this.prisma.department.findMany({
            where: {
                tenantId,
                ...(facilityId ? { facilityId } : {}),
            },
            orderBy: { nameEn: "asc" },
        });
    }
}
