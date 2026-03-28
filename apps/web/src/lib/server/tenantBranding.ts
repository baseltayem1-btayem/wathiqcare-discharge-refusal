
type JsonRecord = Record<string, any>;
import type { TenantBrandingProfileLike, TenantDocumentIdentity } from "@tenanting/branding";

export type TenantBranding = {
    id: string;
    name: string;
    code: string;
    logoUrl: string | null;
    identity: TenantDocumentIdentity;
};

const IMC_LOGO_HOSTS = new Set(["imc.med.sa", "www.imc.med.sa"]);

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

function getHostFromUrl(value: string): string | null {
    try {
        return new URL(value).hostname.toLowerCase();
    } catch {
        return null;
    }
}

function sanitizeTenantLogoUrl(tenantCode: string, logoUrl: string | null): string | null {
    if (!logoUrl) {
        return null;
    }

    const normalizedCode = tenantCode.trim().toUpperCase();
    if (normalizedCode === "IMC") {
        return logoUrl;
    }

    const host = getHostFromUrl(logoUrl);
    if (host && IMC_LOGO_HOSTS.has(host)) {
        return null;
    }

    return logoUrl;
}

export function resolveTenantBranding(source: TenantBrandingSource): TenantBranding {
    return resolveTenantBrandingWithProfile(source);
}

function identityString(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
}

export function resolveTenantBrandingWithProfile(
    source: TenantBrandingSource,
    profile?: TenantBrandingProfileLike | null,
): TenantBranding {
    const metadataLogoUrl = extractTenantLogoUrl(source.metadata);
    const profileLogoUrl = identityString(profile?.logoUrl);
    const displayName = identityString(profile?.displayName) || source.name;
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
    const sanitizedLogoUrl = sanitizeTenantLogoUrl(source.code, profileLogoUrl ?? metadataLogoUrl);

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
}