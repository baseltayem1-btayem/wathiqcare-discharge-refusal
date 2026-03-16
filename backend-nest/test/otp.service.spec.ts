import { BadRequestException } from "@nestjs/common";

import { AuditService } from "../src/modules/audit/audit.service";
import { OtpCacheService } from "../src/modules/otp/otp-cache.service";
import { OtpService } from "../src/modules/otp/otp.service";

describe("OtpService", () => {
    const user = {
        id: "u1",
        tenantId: "t1",
        email: "user@example.com",
        isSuperAdmin: false,
        roles: ["nurse"],
        permissions: ["otp.verify"],
    };

    it("fails when OTP is expired", async () => {
        const prisma: any = {
            otpRequest: {
                findFirst: jest.fn().mockResolvedValue({
                    id: "otp1",
                    tenantId: "t1",
                    status: "PENDING",
                    otpHash: "hash",
                    expiresAt: new Date(Date.now() - 1000),
                    attemptsCount: 0,
                    maxAttempts: 5,
                    purpose: "ack",
                }),
                update: jest.fn().mockResolvedValue({}),
            },
            otpAttempt: {
                create: jest.fn().mockResolvedValue({}),
            },
        };

        const cache = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
        };

        const audit = {
            log: jest.fn().mockResolvedValue({}),
        };

        const service = new OtpService(
            prisma as any,
            audit as unknown as AuditService,
            cache as unknown as OtpCacheService,
        );

        await expect(
            service.verifyOtp(user as any, { otpRequestId: "otp1", otpCode: "123456" }),
        ).rejects.toThrow(BadRequestException);
    });

    it("locks OTP after max attempts", async () => {
        const prisma: any = {
            otpRequest: {
                findFirst: jest.fn().mockResolvedValue({
                    id: "otp2",
                    tenantId: "t1",
                    status: "PENDING",
                    otpHash: "known-hash",
                    expiresAt: new Date(Date.now() + 60_000),
                    attemptsCount: 1,
                    maxAttempts: 2,
                    purpose: "ack",
                }),
            },
            otpAttempt: {
                create: jest.fn().mockResolvedValue({}),
            },
            $transaction: jest.fn().mockResolvedValue([]),
            otpRequestUpdateCalls: [] as unknown[],
            otpRequestCreateCalls: [] as unknown[],
            otpRequest_count: 0,
            otpRequest_deleteMany: jest.fn(),
            otpRequest_updateMany: jest.fn(),
            otpRequest_createMany: jest.fn(),
            otpRequest_update: jest.fn().mockResolvedValue({}),
            otpRequest_create: jest.fn().mockResolvedValue({}),
            otpRequest_delete: jest.fn(),
            otpRequest_upsert: jest.fn(),
            otpRequest_findMany: jest.fn(),
            otpRequest_countMany: jest.fn(),
            otpRequest_aggregate: jest.fn(),
            otpRequest_groupBy: jest.fn(),
            otpRequest_findUnique: jest.fn(),
            otpRequest_findUniqueOrThrow: jest.fn(),
            otpRequest_findFirstOrThrow: jest.fn(),
            otpRequest_deleteManyRaw: jest.fn(),
            otpRequest_updateManyRaw: jest.fn(),
        };

        prisma.$transaction = jest.fn().mockImplementation(async (ops: any[]) =>
            Promise.all(ops),
        );

        prisma.otpRequest.update = jest.fn().mockResolvedValue({});
        prisma.otpAttempt.create = jest.fn().mockResolvedValue({});

        const cache = {
            get: jest.fn().mockResolvedValue("1"),
            set: jest.fn().mockResolvedValue(undefined),
        };

        const audit = {
            log: jest.fn().mockResolvedValue({}),
        };

        const service = new OtpService(
            prisma as any,
            audit as unknown as AuditService,
            cache as unknown as OtpCacheService,
        );

        await expect(
            service.verifyOtp(user as any, { otpRequestId: "otp2", otpCode: "111111" }),
        ).rejects.toThrow(BadRequestException);
    });
});
