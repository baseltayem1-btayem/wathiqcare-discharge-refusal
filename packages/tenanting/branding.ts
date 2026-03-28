// Tenant branding helpers migrated from apps/web/src/lib/server/tenantBranding.ts
export type TenantBrandingProfileLike = {
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
};

export type TenantDocumentIdentity = {
    displayName: string;
    legalName: string | null;
    licenseNumber: string | null;
    commercialRegistrationNumber: string | null;
    taxNumber: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    country: string | null;
    postalCode: string | null;
    websiteUrl: string | null;
    logoUrl: string | null;
    documentHeaderText: string | null;
    documentFooterText: string | null;
    legalDisclaimer: string | null;
};
