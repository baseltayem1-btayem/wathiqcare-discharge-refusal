import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { createHash, randomInt } from "crypto";

import { PrismaService } from "../../prisma/prisma.service";
import { AuthUser } from "../../common/interfaces/auth-user.interface";
import { AuditService } from "../audit/audit.service";
import { OtpCacheService } from "./otp-cache.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";

const OTP_EXPIRES_SECONDS = 300;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
        private readonly cache: OtpCacheService,
    ) { }

    private hashOtp(code: string): string {
        return createHash("sha256").update(code).digest("hex");
    }

    private generateOtpCode(): string {
        return String(randomInt(100000, 1000000));
    }

    async requestOtp(user: AuthUser, dto: RequestOtpDto) {
        const code = this.generateOtpCode();
        const otpHash = this.hashOtp(code);
        const expiresAt = new Date(Date.now() + OTP_EXPIRES_SECONDS * 1000);

        const created = await this.prisma.otpRequest.create({
            data: {
                tenantId: user.tenantId,
                refusalCaseId: dto.refusalCaseId,
                acknowledgmentRequestId: dto.acknowledgmentRequestId,
                recipientPhone: dto.recipientPhone,
                purpose: dto.purpose,
                otpHash,
                status: "PENDING",
                expiresAt,
                attemptsCount: 0,
                maxAttempts: OTP_MAX_ATTEMPTS,
            },
        });

        await this.cache.set(`otp:${created.id}:attempts`, "0", OTP_EXPIRES_SECONDS);

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "otp_request",
            entityId: created.id,
            action: "otp_requested",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: {
                purpose: dto.purpose,
                recipientPhone: dto.recipientPhone,
            },
        });

        return {
            otpRequestId: created.id,
            expiresAt: created.expiresAt,
            maxAttempts: created.maxAttempts,
            debugOtp: process.env.NODE_ENV === "development" ? code : undefined,
        };
    }

    async verifyOtp(user: AuthUser, dto: VerifyOtpDto) {
        const req = await this.prisma.otpRequest.findFirst({
            where: {
                id: dto.otpRequestId,
                tenantId: user.tenantId,
            },
        });

        if (!req) {
            throw new NotFoundException("OTP request not found");
        }

        if (req.status === "LOCKED") {
            throw new BadRequestException("OTP request is locked");
        }

        if (req.status === "VERIFIED") {
            return { verified: true, alreadyVerified: true };
        }

        if (req.expiresAt.getTime() < Date.now()) {
            await this.prisma.otpRequest.update({
                where: { id: req.id },
                data: { status: "EXPIRED" },
            });

            await this.prisma.otpAttempt.create({
                data: {
                    tenantId: user.tenantId,
                    otpRequestId: req.id,
                    attemptResult: "EXPIRED",
                },
            });

            throw new BadRequestException("OTP expired");
        }

        const cacheAttempts = await this.cache.get(`otp:${req.id}:attempts`);
        const priorAttempts = cacheAttempts ? Number(cacheAttempts) : req.attemptsCount;

        const isValid = req.otpHash === this.hashOtp(dto.otpCode);

        if (!isValid) {
            const attemptsCount = priorAttempts + 1;
            const locked = attemptsCount >= req.maxAttempts;

            await this.prisma.$transaction([
                this.prisma.otpRequest.update({
                    where: { id: req.id },
                    data: {
                        attemptsCount,
                        status: locked ? "LOCKED" : "FAILED",
                        lockedAt: locked ? new Date() : null,
                    },
                }),
                this.prisma.otpAttempt.create({
                    data: {
                        tenantId: user.tenantId,
                        otpRequestId: req.id,
                        attemptResult: locked ? "LOCKED" : "FAILURE",
                    },
                }),
            ]);

            await this.cache.set(
                `otp:${req.id}:attempts`,
                String(attemptsCount),
                Math.max(Math.floor((req.expiresAt.getTime() - Date.now()) / 1000), 1),
            );

            throw new BadRequestException(
                locked ? "OTP locked after max attempts" : "Invalid OTP",
            );
        }

        await this.prisma.$transaction([
            this.prisma.otpRequest.update({
                where: { id: req.id },
                data: {
                    status: "VERIFIED",
                    verifiedAt: new Date(),
                },
            }),
            this.prisma.otpAttempt.create({
                data: {
                    tenantId: user.tenantId,
                    otpRequestId: req.id,
                    attemptResult: "SUCCESS",
                },
            }),
        ]);

        await this.auditService.log({
            tenantId: user.tenantId,
            entityType: "otp_request",
            entityId: req.id,
            action: "otp_verified",
            actorUserId: user.id,
            actorEmail: user.email,
            actorRoleSnapshot: user.roles.join(","),
            metadataJson: {
                purpose: req.purpose,
            },
        });

        return { verified: true };
    }
}
