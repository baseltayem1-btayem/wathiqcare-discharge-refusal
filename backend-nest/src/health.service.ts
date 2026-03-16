import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { DocumentStorageService } from "./modules/documents/document-storage.service";
import { OtpCacheService } from "./modules/otp/otp-cache.service";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class HealthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly otpCacheService: OtpCacheService,
        private readonly documentStorageService: DocumentStorageService,
        private readonly configService: ConfigService,
    ) { }

    async live() {
        return {
            ok: true,
            service: "backend-nest",
            timestamp: new Date().toISOString(),
        };
    }

    async ready() {
        const startedAt = Date.now();

        const database = await this.checkDatabase();
        const redis = await this.otpCacheService.health();
        const objectStorage = await this.documentStorageService.checkConnectivity();
        const redisRequired = Boolean(this.configService.get<string>("redisUrl"));
        const s3Required = Boolean(this.configService.get<string>("s3.endpoint"));

        const ready =
            database.ok &&
            (!redisRequired || redis.ok) &&
            (!s3Required || objectStorage.ok);

        return {
            ok: ready,
            service: "backend-nest",
            timestamp: new Date().toISOString(),
            checks: {
                database,
                redis: {
                    ...redis,
                    required: redisRequired,
                },
                objectStorage: {
                    ...objectStorage,
                    required: s3Required,
                },
            },
            durationMs: Date.now() - startedAt,
        };
    }

    async summary() {
        const [live, ready] = await Promise.all([this.live(), this.ready()]);
        return {
            ...live,
            readiness: ready,
        };
    }

    private async checkDatabase(): Promise<{ ok: boolean; error?: string }> {
        try {
            await this.prisma.$queryRawUnsafe("SELECT 1");
            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}