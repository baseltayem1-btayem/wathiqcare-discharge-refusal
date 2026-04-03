import { mkdir, readdir, rm, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantPermissionForAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";
import { toJsonSafe } from "@/lib/server/json";
<<<<<<< HEAD
import { getPrisma } from "@/lib/server/prisma";
=======
import { prisma } from "@/lib/server/prisma";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
import { resolveTenantBrandingWithProfile } from "@/lib/server/tenantBranding";
import { upsertTenantBrandingProfile } from "@/lib/server/tenantBrandingStore";

export const runtime = "nodejs";

const ALLOWED_ADMIN_ROLES = new Set(["tenant_admin", "tenant_owner"]);
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
<<<<<<< HEAD

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
const MIME_TO_EXTENSION: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
};

function ensureTenantAdminRole(role: string | undefined): void {
<<<<<<< HEAD
    const normalized = (role ?? "").trim().toLowerCase();

=======
    const normalized = (role || "").trim().toLowerCase();
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
    if (!ALLOWED_ADMIN_ROLES.has(normalized)) {
        throw new ApiError(403, "Only tenant admins can upload branding logos");
    }
}

export async function POST(request: NextRequest) {
    try {
<<<<<<< HEAD
        const prisma = getPrisma();

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        const auth = await requireAuth(request);
        const tenantId = auth.tenant_id;

        if (!tenantId) {
            throw new ApiError(403, "Tenant context is required");
        }

        ensureTenantAdminRole(auth.role);
<<<<<<< HEAD

        await requireTenantPermissionForAuth(auth, tenantId, "roles.assign", {
            allowPlatform: false,
        });

        const tenant = await getPrisma().tenant.findUnique({
=======
        await requireTenantPermissionForAuth(auth, tenantId, "roles.assign", { allowPlatform: false });

        const tenant = await prisma.tenant.findUnique({
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
            where: { id: tenantId },
            select: {
                id: true,
                name: true,
                code: true,
                metadata: true,
            },
        });

        if (!tenant) {
            throw new ApiError(404, "Tenant not found");
        }

        const formData = await request.formData();
        const fileValue = formData.get("logo") ?? formData.get("file");
<<<<<<< HEAD

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        if (!(fileValue instanceof File)) {
            throw new ApiError(400, "Missing logo file");
        }

        if (fileValue.size <= 0 || fileValue.size > MAX_FILE_SIZE_BYTES) {
            throw new ApiError(400, "Logo size must be between 1 byte and 2 MB");
        }

        const extension = MIME_TO_EXTENSION[fileValue.type];
        if (!extension) {
            throw new ApiError(400, "Unsupported logo type. Allowed: png, jpg, webp, svg");
        }

<<<<<<< HEAD
        const storageDir = path.join(
            process.cwd(),
            "public",
            "storage",
            "tenants",
            tenantId,
            "branding",
        );

        await mkdir(storageDir, { recursive: true });

        const existingEntries = await readdir(storageDir, { withFileTypes: true });

        await Promise.all(
            existingEntries
                .filter((entry) => entry.isFile() && entry.name.startsWith("logo."))
                .map((entry) =>
                    rm(path.join(storageDir, entry.name), { force: true }),
                ),
=======
        const storageDir = path.join(process.cwd(), "public", "storage", "tenants", tenantId, "branding");
        await mkdir(storageDir, { recursive: true });

        const existingEntries = await readdir(storageDir, { withFileTypes: true });
        await Promise.all(
            existingEntries
                .filter((entry) => entry.isFile() && entry.name.startsWith("logo."))
                .map((entry) => rm(path.join(storageDir, entry.name), { force: true })),
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        );

        const targetFileName = `logo${extension}`;
        const targetPath = path.join(storageDir, targetFileName);
        const bytes = Buffer.from(await fileValue.arrayBuffer());
<<<<<<< HEAD

=======
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        await writeFile(targetPath, bytes);

        const logoUrl = `/storage/tenants/${tenantId}/branding/${targetFileName}`;
        const profile = await upsertTenantBrandingProfile(tenantId, { logoUrl });

        return NextResponse.json(
            toJsonSafe({
                success: true,
                branding: resolveTenantBrandingWithProfile(tenant, profile),
            }),
        );
    } catch (error) {
        return handleApiError(error);
    }
}
