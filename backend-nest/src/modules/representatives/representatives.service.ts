import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RepresentativesService {
    constructor(private readonly prisma: PrismaService) { }

    async listRepresentatives(tenantId: string, patientId?: string) {
        return this.prisma.patientRepresentative.findMany({
            where: {
                tenantId,
                ...(patientId ? { patientId } : {}),
                active: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }
}
