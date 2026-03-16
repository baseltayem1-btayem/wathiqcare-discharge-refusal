import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { CreatePatientDto } from "./dto/create-patient.dto";
import { CreateRepresentativeDto } from "./dto/create-representative.dto";
import { UpdatePatientDto } from "./dto/update-patient.dto";

@Injectable()
export class PatientsService {
    constructor(private readonly prisma: PrismaService) { }

    async listPatients(user: AuthUser, page = 1, pageSize = 20, search?: string) {
        const skip = (Math.max(page, 1) - 1) * Math.min(pageSize, 100);
        const take = Math.min(pageSize, 100);

        const where = {
            tenantId: user.tenantId,
            ...(search
                ? {
                    OR: [
                        { fullName: { contains: search, mode: "insensitive" as const } },
                        { mrn: { contains: search, mode: "insensitive" as const } },
                        { nationalId: { contains: search, mode: "insensitive" as const } },
                    ],
                }
                : {}),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.patient.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: "desc" },
            }),
            this.prisma.patient.count({ where }),
        ]);

        return {
            items,
            page,
            pageSize: take,
            total,
        };
    }

    async createPatient(user: AuthUser, dto: CreatePatientDto) {
        const existing = await this.prisma.patient.findFirst({
            where: {
                tenantId: user.tenantId,
                mrn: dto.mrn,
            },
        });

        if (existing) {
            throw new BadRequestException("Patient MRN already exists");
        }

        return this.prisma.patient.create({
            data: {
                tenantId: user.tenantId,
                mrn: dto.mrn,
                firstName: dto.firstName,
                lastName: dto.lastName,
                fullName: `${dto.firstName} ${dto.lastName}`,
                nationalId: dto.nationalId,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                gender: dto.gender,
                nationality: dto.nationality,
                preferredLanguage: dto.preferredLanguage,
                primaryPhone: dto.primaryPhone,
                secondaryPhone: dto.secondaryPhone,
                email: dto.email,
            },
        });
    }

    async getPatientById(user: AuthUser, id: string) {
        const patient = await this.prisma.patient.findFirst({
            where: {
                id,
                tenantId: user.tenantId,
            },
        });

        if (!patient) {
            throw new NotFoundException("Patient not found");
        }

        return patient;
    }

    async updatePatient(user: AuthUser, id: string, dto: UpdatePatientDto) {
        await this.getPatientById(user, id);

        return this.prisma.patient.update({
            where: { id },
            data: {
                ...dto,
                dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            },
        });
    }

    async listRepresentatives(user: AuthUser, patientId: string) {
        await this.getPatientById(user, patientId);

        return this.prisma.patientRepresentative.findMany({
            where: {
                tenantId: user.tenantId,
                patientId,
                active: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async addRepresentative(
        user: AuthUser,
        patientId: string,
        dto: CreateRepresentativeDto,
    ) {
        await this.getPatientById(user, patientId);

        return this.prisma.patientRepresentative.create({
            data: {
                tenantId: user.tenantId,
                patientId,
                representativeType: dto.representativeType,
                fullName: dto.fullName,
                relationshipToPatient: dto.relationshipToPatient,
                idType: dto.idType,
                idNumber: dto.idNumber,
                authorityBasis: dto.authorityBasis,
                phone: dto.phone,
                email: dto.email,
                isPrimary: dto.isPrimary ?? false,
                active: true,
            },
        });
    }
}
