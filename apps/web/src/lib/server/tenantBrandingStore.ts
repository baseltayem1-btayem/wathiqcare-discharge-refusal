import { randomUUID } from "crypto";
import { getPrisma } from "@/lib/server/prisma";

export type TenantBrandingProfile = {
    id: string;
    tenantId: string;
    displayName: string | null;
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
    createdAt: string;
    updatedAt: string;
};

export type TenantBrandingUpsertInput = {
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

type BrandingRow = {
    id: string;
    tenant_id: string;
    display_name: string | null;
    legal_name: string | null;
    license_number: string | null;
    commercial_registration_number: string | null;
    tax_number: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    country: string | null;
    postal_code: string | null;
    website_url: string | null;
    logo_url: string | null;
    document_header_text: string | null;
    document_footer_text: string | null;
    legal_disclaimer: string | null;
    created_at: Date;
    updated_at: Date;
};

function toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapBrandingRow(row: BrandingRow): TenantBrandingProfile {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        displayName: row.display_name,
        legalName: row.legal_name,
        licenseNumber: row.license_number,
        commercialRegistrationNumber: row.commercial_registration_number,
        taxNumber: row.tax_number,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        addressLine1: row.address_line1,
        addressLine2: row.address_line2,
        city: row.city,
        country: row.country,
        postalCode: row.postal_code,
        websiteUrl: row.website_url,
        logoUrl: row.logo_url,
        documentHeaderText: row.document_header_text,
        documentFooterText: row.document_footer_text,
        legalDisclaimer: row.legal_disclaimer,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
    };
}

function normalizeText(value: unknown, maxLength: number): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    return trimmed.slice(0, maxLength);
}

function normalizeUrl(value: unknown, maxLength: number): string | null {
    const normalized = normalizeText(value, maxLength);
    if (!normalized) {
        return null;
    }

    if (normalized.startsWith("/")) {
        return normalized.slice(0, maxLength);
    }

    try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return null;
        }
        return parsed.toString().slice(0, maxLength);
    } catch {
        return null;
    }
}

function sanitizeBrandingInput(input: TenantBrandingUpsertInput): Required<TenantBrandingUpsertInput> {
    return {
        displayName: normalizeText(input.displayName, 200),
        legalName: normalizeText(input.legalName, 200),
        licenseNumber: normalizeText(input.licenseNumber, 120),
        commercialRegistrationNumber: normalizeText(input.commercialRegistrationNumber, 120),
        taxNumber: normalizeText(input.taxNumber, 120),
        contactEmail: normalizeText(input.contactEmail, 200),
        contactPhone: normalizeText(input.contactPhone, 80),
        addressLine1: normalizeText(input.addressLine1, 250),
        addressLine2: normalizeText(input.addressLine2, 250),
        city: normalizeText(input.city, 120),
        country: normalizeText(input.country, 120),
        postalCode: normalizeText(input.postalCode, 40),
        websiteUrl: normalizeUrl(input.websiteUrl, 300),
        logoUrl: normalizeUrl(input.logoUrl, 500),
        documentHeaderText: normalizeText(input.documentHeaderText, 400),
        documentFooterText: normalizeText(input.documentFooterText, 400),
        legalDisclaimer: normalizeText(input.legalDisclaimer, 2500),
    };
}

export async function getTenantBrandingProfile(tenantId: string): Promise<TenantBrandingProfile | null> {
    const rows = await prisma.$queryRaw<BrandingRow[]>`
    SELECT
      id,
      tenant_id,
      display_name,
      legal_name,
      license_number,
      commercial_registration_number,
      tax_number,
      contact_email,
      contact_phone,
      address_line1,
      address_line2,
      city,
      country,
      postal_code,
      website_url,
      logo_url,
      document_header_text,
      document_footer_text,
      legal_disclaimer,
      created_at,
      updated_at
    FROM tenant_branding
    WHERE tenant_id = ${tenantId}
    LIMIT 1
  `;

    if (rows.length === 0) {
        return null;
    }

    return mapBrandingRow(rows[0]);
}

export async function upsertTenantBrandingProfile(
    tenantId: string,
    input: TenantBrandingUpsertInput,
): Promise<TenantBrandingProfile> {
    const sanitized = sanitizeBrandingInput(input);
    const generatedId = randomUUID();

    const rows = await prisma.$queryRaw<BrandingRow[]>`
    INSERT INTO tenant_branding (
      id,
      tenant_id,
      display_name,
      legal_name,
      license_number,
      commercial_registration_number,
      tax_number,
      contact_email,
      contact_phone,
      address_line1,
      address_line2,
      city,
      country,
      postal_code,
      website_url,
      logo_url,
      document_header_text,
      document_footer_text,
      legal_disclaimer,
      created_at,
      updated_at
    )
    VALUES (
      ${generatedId},
      ${tenantId},
      ${sanitized.displayName},
      ${sanitized.legalName},
      ${sanitized.licenseNumber},
      ${sanitized.commercialRegistrationNumber},
      ${sanitized.taxNumber},
      ${sanitized.contactEmail},
      ${sanitized.contactPhone},
      ${sanitized.addressLine1},
      ${sanitized.addressLine2},
      ${sanitized.city},
      ${sanitized.country},
      ${sanitized.postalCode},
      ${sanitized.websiteUrl},
      ${sanitized.logoUrl},
      ${sanitized.documentHeaderText},
      ${sanitized.documentFooterText},
      ${sanitized.legalDisclaimer},
      NOW(),
      NOW()
    )
    ON CONFLICT (tenant_id)
    DO UPDATE SET
      display_name = EXCLUDED.display_name,
      legal_name = EXCLUDED.legal_name,
      license_number = EXCLUDED.license_number,
      commercial_registration_number = EXCLUDED.commercial_registration_number,
      tax_number = EXCLUDED.tax_number,
      contact_email = EXCLUDED.contact_email,
      contact_phone = EXCLUDED.contact_phone,
      address_line1 = EXCLUDED.address_line1,
      address_line2 = EXCLUDED.address_line2,
      city = EXCLUDED.city,
      country = EXCLUDED.country,
      postal_code = EXCLUDED.postal_code,
      website_url = EXCLUDED.website_url,
      logo_url = EXCLUDED.logo_url,
      document_header_text = EXCLUDED.document_header_text,
      document_footer_text = EXCLUDED.document_footer_text,
      legal_disclaimer = EXCLUDED.legal_disclaimer,
      updated_at = NOW()
    RETURNING
      id,
      tenant_id,
      display_name,
      legal_name,
      license_number,
      commercial_registration_number,
      tax_number,
      contact_email,
      contact_phone,
      address_line1,
      address_line2,
      city,
      country,
      postal_code,
      website_url,
      logo_url,
      document_header_text,
      document_footer_text,
      legal_disclaimer,
      created_at,
      updated_at
  `;

    return mapBrandingRow(rows[0]);
}
