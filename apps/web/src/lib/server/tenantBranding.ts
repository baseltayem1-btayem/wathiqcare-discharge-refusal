type JsonRecord = Record<string, unknown>;

export type TenantBranding = {
    id: string;
    name: string;
    code: string;
    logoUrl: string | null;
};

type TenantBrandingSource = {
    id: string;
    name: string;
    code: string;
    metadata?: unknown;
};

function asRecord(value: unknown): JsonRecord | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as JsonRecord;
}

function readString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function extractTenantLogoUrl(metadata: unknown): string | null {
    const record = asRecord(metadata);
    if (!record) {
        return null;
    }

    const branding = asRecord(record.branding);
    return (
        readString(record.logoUrl) ??
        readString(record.logo_url) ??
        readString(branding?.logoUrl) ??
        readString(branding?.logo_url) ??
        null
    );
}

export function resolveTenantBranding(source: TenantBrandingSource): TenantBranding {
    return {
        id: source.id,
        name: source.name,
        code: source.code,
        logoUrl: extractTenantLogoUrl(source.metadata),
    };
}

export function buildTenantReferenceNumber(args: {
    tenantCode?: string | null;
    caseId: string;
    timestamp?: Date;
    suffix?: string;
}): string {
    const prefix = (args.tenantCode || "TENANT")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "TENANT";
    const timestamp = (args.timestamp ?? new Date()).toISOString().replace(/\D/g, "").slice(0, 12);
    const suffix = args.suffix ? `-${args.suffix.toUpperCase()}` : "";
    return `${prefix}${suffix}-${args.caseId.slice(0, 8).toUpperCase()}-${timestamp}`;
}

export function buildTenantInstitutionLabel(name: string | null | undefined): string {
    const trimmed = typeof name === "string" ? name.trim() : "";
    return trimmed || "Healthcare Provider";
}