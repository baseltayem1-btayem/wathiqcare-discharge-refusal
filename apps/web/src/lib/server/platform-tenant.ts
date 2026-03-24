import { ApiError } from "@/lib/server/http";
import { prisma } from "@/lib/server/prisma";

const PLATFORM_TENANT_CODE = "wathiqcare";
const PLATFORM_TENANT_NAME = "WathiqCare Platform";

export type PlatformTenant = {
    id: string;
    name: string;
};

/**
 * Returns the platform tenant, creating it automatically if it does not yet
 * exist (bootstrap / first-run behaviour).
 *
 * Using upsert guarantees idempotency — concurrent calls and repeated deploys
 * are both safe.
 *
 * Throws ApiError(503) only when the database itself cannot be reached, so
 * callers always get a clear, user-facing error rather than a raw 500.
 */
export async function getPlatformTenant(): Promise<PlatformTenant> {
    try {
        const tenant = await prisma.tenant.upsert({
            where: { code: PLATFORM_TENANT_CODE },
            // Only mark the row as a platform tenant on conflict; do NOT force-reactivate
            // an intentionally deactivated platform tenant.
            update: { isPlatform: true },
            create: {
                name: PLATFORM_TENANT_NAME,
                code: PLATFORM_TENANT_CODE,
                isActive: true,
                isPlatform: true,
            },
            select: { id: true, name: true },
        });

        return tenant;
    } catch (error) {
        console.error("getPlatformTenant: failed to bootstrap platform tenant", error);
        throw new ApiError(
            503,
            "Platform configuration is incomplete. Please initialize platform settings. / إعدادات المنصة غير مكتملة. يرجى تهيئة النظام أولاً.",
        );
    }
}
