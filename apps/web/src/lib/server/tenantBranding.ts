<<<<<<< HEAD
type JsonRecord = Record<string, unknown>;

type TenantBrandingProfileLike = {
    name?: string | null;
    displayName?: string | null;
    legalName?: string | null;
    logoUrl?: string | null;
    licenseNumber?: string | null;
    commercialRegistrationNumber?: string | null;
    taxNumber?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    country?: string | null;
    postalCode?: string | null;
    websiteUrl?: string | null;
    documentHeaderText?: string | null;
    documentFooterText?: string | null;
    legalDisclaimer?: string | null;
};

type TenantDocumentIdentity = {
    documentPrefix?: string | null;
    displayName?: string | null;
    legalName?: string | null;
    licenseNumber?: string | null;
    commercialRegistrationNumber?: string | null;
    taxNumber?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    country?: string | null;
    postalCode?: string | null;
    websiteUrl?: string | null;
    logoUrl?: string | null;
    documentHeaderText?: string | null;
    documentFooterText?: string | null;
    legalDisclaimer?: string | null;
=======
type JsonRecord = Record<string, any>;

type TenantBrandingProfileLike = {
    name?: string;
    displayName?: string;
    legalName?: string;
    logoUrl?: string;
    licenseNumber?: string;
    commercialRegistrationNumber?: string;
    taxNumber?: string;
    contactEmail?: string;
    contactPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    websiteUrl?: string;
    documentHeaderText?: string;
    documentFooterText?: string;
    legalDisclaimer?: string;
};

type TenantDocumentIdentity = {
    documentPrefix?: string;
    displayName?: string;
    legalName?: string;
    licenseNumber?: string;
    commercialRegistrationNumber?: string;
    taxNumber?: string;
    contactEmail?: string;
    contactPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    websiteUrl?: string;
    logoUrl?: string;
    documentHeaderText?: string;
    documentFooterText?: string;
    legalDisclaimer?: string;
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
};

export type TenantBranding = {
    id: string;
    name: string;
    code: string;
    logoUrl?: string;
    identity: TenantDocumentIdentity;
};

const IMC_LOGO_HOSTS = new Set(["imc.med.sa", "www.imc.med.sa"]);

type TenantBrandingSource = {
    id: string;
    name: string;
    code: string;
    metadata?: unknown;
};

function asRecord(value: unknown): JsonRecord | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }
    return value as JsonRecord;
}

function readString(value: unknown): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

export function extractTenantLogoUrl(metadata: unknown): string | undefined {
    const record = asRecord(metadata);
    if (!record) {
        return undefined;
    }

    const branding = asRecord(record.branding);
    return (
        readString(record.logoUrl) ??
        readString(record.logo_url) ??
        readString(branding?.logoUrl) ??
        readString(branding?.logo_url) ??
        undefined
    );
}

function getHostFromUrl(value: string): string | undefined {
    try {
        return new URL(value).hostname.toLowerCase();
    } catch {
        return undefined;
    }
}

function sanitizeTenantLogoUrl(tenantCode: string, logoUrl?: string): string | undefined {
    if (!logoUrl) {
        return undefined;
    }

    const normalizedCode = tenantCode.trim().toUpperCase();
    if (normalizedCode === "IMC") {
        return logoUrl;
    }

    const host = getHostFromUrl(logoUrl);
    if (host && IMC_LOGO_HOSTS.has(host)) {
        return undefined;
    }

    return logoUrl;
}

export function resolveTenantBranding(source: TenantBrandingSource): TenantBranding {
    return resolveTenantBrandingWithProfile(source);
}

function identityString(value: string | null | undefined): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
}

export function resolveTenantBrandingWithProfile(
    source: TenantBrandingSource,
    profile?: TenantBrandingProfileLike | null,
): TenantBranding {
    const metadataLogoUrl = extractTenantLogoUrl(source.metadata);
    const profileLogoUrl = identityString(profile?.logoUrl);
    const displayName =
        identityString(profile?.displayName) ||
        identityString(profile?.name) ||
        source.name;

    const legalName = identityString(profile?.legalName);
    const licenseNumber = identityString(profile?.licenseNumber);
    const commercialRegistrationNumber = identityString(profile?.commercialRegistrationNumber);
    const taxNumber = identityString(profile?.taxNumber);
    const contactEmail = identityString(profile?.contactEmail);
    const contactPhone = identityString(profile?.contactPhone);
    const addressLine1 = identityString(profile?.addressLine1);
    const addressLine2 = identityString(profile?.addressLine2);
    const city = identityString(profile?.city);
    const country = identityString(profile?.country);
    const postalCode = identityString(profile?.postalCode);
    const websiteUrl = identityString(profile?.websiteUrl);
    const documentHeaderText = identityString(profile?.documentHeaderText);
    const documentFooterText = identityString(profile?.documentFooterText);
    const legalDisclaimer = identityString(profile?.legalDisclaimer);
    const sanitizedLogoUrl = sanitizeTenantLogoUrl(source.code, profileLogoUrl ?? metadataLogoUrl) ?? undefined;

    return {
        id: source.id,
        name: displayName,
        code: source.code,
        logoUrl: sanitizedLogoUrl,
        identity: {
            displayName,
            legalName,
            licenseNumber,
            commercialRegistrationNumber,
            taxNumber,
            contactEmail,
            contactPhone,
            addressLine1,
            addressLine2,
            city,
            country,
            postalCode,
            websiteUrl,
            logoUrl: sanitizedLogoUrl,
            documentHeaderText,
            documentFooterText,
            legalDisclaimer,
        },
    };
}

export function buildTenantReferenceNumber(args: {
    tenantCode?: string | null;
    caseId: string;
    timestamp?: Date;
    suffix?: string;
}): string {
    const prefix =
        (args.tenantCode || "TENANT")
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "TENANT";

    const timestamp = (args.timestamp ?? new Date())
        .toISOString()
        .replace(/\D/g, "")
        .slice(0, 12);

    const suffix = args.suffix ? `-${args.suffix.toUpperCase()}` : "";
    return `${prefix}${suffix}-${args.caseId.slice(0, 8).toUpperCase()}-${timestamp}`;
}

export function buildTenantInstitutionLabel(name: string | null | undefined): string {
    const trimmed = typeof name === "string" ? name.trim() : "";
    return trimmed || "Healthcare Provider";
}

export function buildTenantIdentityLines(identity: TenantDocumentIdentity): string[] {
    const location = [identity.city, identity.country].filter(Boolean).join(", ");

    return [
        identity.legalName,
        identity.licenseNumber ? `License No.: ${identity.licenseNumber}` : null,
        identity.commercialRegistrationNumber
            ? `Commercial Registration: ${identity.commercialRegistrationNumber}`
            : null,
        identity.taxNumber ? `Tax No.: ${identity.taxNumber}` : null,
        identity.addressLine1,
        identity.addressLine2,
        location || null,
        identity.postalCode ? `Postal Code: ${identity.postalCode}` : null,
        identity.contactPhone ? `Phone: ${identity.contactPhone}` : null,
        identity.contactEmail ? `Email: ${identity.contactEmail}` : null,
        identity.websiteUrl,
    ].filter((line): line is string => typeof line === "string" && Boolean(line.trim()));
<<<<<<< HEAD
}
=======
}
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
