import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class OtpCacheService implements OnModuleDestroy {
    private readonly logger = new Logger(OtpCacheService.name);
    private readonly redis?: Redis;
    private readonly fallback = new Map<string, string>();
    private readonly allowInMemoryFallback: boolean;

    constructor(private readonly configService: ConfigService) {
        this.allowInMemoryFallback =
            this.configService.get<boolean>("otp.allowInMemoryFallback") ??
            this.configService.get<string>("env") !== "production";

        const url = this.configService.get<string>("redisUrl") || process.env.REDIS_URL;
        if (url) {
            this.redis = new Redis(url, {
                lazyConnect: true,
                maxRetriesPerRequest: 1,
            });
            this.redis.connect().catch((error) => {
                if (this.allowInMemoryFallback) {
                    this.logger.warn(`Redis unavailable, falling back to memory: ${String(error)}`);
                    return;
                }

                this.logger.error(`Redis unavailable and fallback disabled: ${String(error)}`);
            });
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.redis) {
            await this.redis.quit().catch(() => undefined);
        }
    }

    async get(key: string): Promise<string | null> {
        if (this.redis && this.redis.status === "ready") {
            return this.redis.get(key);
        }

        if (!this.allowInMemoryFallback) {
            throw new Error("OTP cache unavailable: Redis is not ready and in-memory fallback is disabled");
        }

        return this.fallback.get(key) || null;
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        if (this.redis && this.redis.status === "ready") {
            await this.redis.set(key, value, "EX", ttlSeconds);
            return;
        }

        if (!this.allowInMemoryFallback) {
            throw new Error("OTP cache unavailable: Redis is not ready and in-memory fallback is disabled");
        }

        this.fallback.set(key, value);
        setTimeout(() => this.fallback.delete(key), ttlSeconds * 1000).unref();
    }

    async health(): Promise<{
        ok: boolean;
        mode: "redis" | "memory";
        status: string;
        error?: string;
    }> {
        if (this.redis) {
            try {
                const pong = await this.redis.ping();
                return {
                    ok: pong === "PONG",
                    mode: "redis",
                    status: this.redis.status,
                };
            } catch (error) {
                return {
                    ok: this.allowInMemoryFallback,
                    mode: this.allowInMemoryFallback ? "memory" : "redis",
                    status: this.redis.status,
                    error: error instanceof Error ? error.message : String(error),
                };
            }
        }

        return {
            ok: this.allowInMemoryFallback,
            mode: "memory",
            status: this.allowInMemoryFallback ? "fallback" : "disabled",
            error: this.allowInMemoryFallback
                ? undefined
                : "Redis is not configured and in-memory OTP fallback is disabled",
        };
    }
}
