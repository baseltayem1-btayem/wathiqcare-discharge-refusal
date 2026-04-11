import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

const PLATFORM_TENANT_CODE = "wathiqcare";
const PLATFORM_TENANT_NAME = "WathiqCare Platform";

export type PlatformTenant = {
    id: string;
    name: string;
};

export async function getPlatformTenant(): Promise<PlatformTenant> {
    const prisma = getPrisma();

    try {
        return await prisma.tenant.upsert({
            where: { code: PLATFORM_TENANT_CODE },
            update: { isPlatform: true },
            create: {
                name: PLATFORM_TENANT_NAME,
                code: PLATFORM_TENANT_CODE,
                isActive: true,
                isPlatform: true,
            },
            select: { id: true, name: true },
        });
    } catch (primaryError) {
        // Fallback path for environments where the DB migration adding is_platform
        // has not been applied yet. Keep platform flows available with stable columns.
        console.warn("getPlatformTenant: primary bootstrap path failed, trying compatibility path", primaryError);

        try {
            return await prisma.tenant.upsert({
                where: { code: PLATFORM_TENANT_CODE },
                update: { isActive: true },
                create: {
                    name: PLATFORM_TENANT_NAME,
                    code: PLATFORM_TENANT_CODE,
                    isActive: true,
                },
                select: { id: true, name: true },
            });
        } catch (fallbackError) {
            console.error("getPlatformTenant: failed to bootstrap platform tenant", fallbackError);
            throw new ApiError(
                503,
                "Platform configuration is incomplete. Please initialize platform settings. / إعدادات المنصة غير مكتملة. يرجى تهيئة النظام أولاً.",
            );
        }
    }
}