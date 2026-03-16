import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CreateEncounterDto } from "./dto/create-encounter.dto";

@Injectable()
export class EncountersService {
    constructor(private readonly prisma: PrismaService) { }

    async listEncounters(user: AuthUser, page = 1, pageSize = 20) {
        const skip = (Math.max(page, 1) - 1) * Math.min(pageSize, 100);
        const take = Math.min(pageSize, 100);

        const where = { tenantId: user.tenantId };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.encounter.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.encounter.count({ where }),
        ]);

        return { items, page, pageSize: take, total };
    }

    async createEncounter(user: AuthUser, dto: CreateEncounterDto) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                tenantId: user.tenantId,
                id: dto.patientId,
            },
        });

        if (!patient) {
            throw new BadRequestException("Patient not found in tenant scope");
        }

        const exists = await this.prisma.encounter.findFirst({
            where: {
                tenantId: user.tenantId,
                encounterNumber: dto.encounterNumber,
            },
        });

        if (exists) {
            throw new BadRequestException("Encounter number already exists");
        }

        return this.prisma.encounter.create({
            data: {
                tenantId: user.tenantId,
                patientId: dto.patientId,
                encounterNumber: dto.encounterNumber,
                facilityId: dto.facilityId,
                departmentId: dto.departmentId,
                admissionType: dto.admissionType,
                admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null,
                dischargeExpectedDate: dto.dischargeExpectedDate
                    ? new Date(dto.dischargeExpectedDate)
                    : null,
                attendingPhysicianName: dto.attendingPhysicianName,
                attendingPhysicianUserId: dto.attendingPhysicianUserId,
                room: dto.room,
                bed: dto.bed,
                status: dto.status,
            },
        });
    }

    async getEncounterById(user: AuthUser, id: string) {
        const encounter = await this.prisma.encounter.findFirst({
            where: {
                tenantId: user.tenantId,
                id,
            },
        });
        if (!encounter) {
            throw new NotFoundException("Encounter not found");
        }

        return encounter;
    }
}
