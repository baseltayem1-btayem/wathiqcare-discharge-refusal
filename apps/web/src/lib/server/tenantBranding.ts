// --- Type Definitions ---
export type TenantBrandingSource = {
  id: string;
  code: string;
  name: string;
  metadata?: unknown;
};

export type TenantDocumentIdentity = {
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

export type TenantBranding = {
  id: string;
  code: string;
  name: string;
  logoUrl?: string;
  identity: TenantDocumentIdentity;
};
type JsonRecord = Record<string, unknown>;

export type TenantBrandingProfileLike = {
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
  documentPrefix?: string | null;
};

function asRecord(value: unknown): JsonRecord | undefined {
  return value && typeof value === "object" ? (value as JsonRecord) : undefined;
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function identityString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function extractTenantLogoUrl(metadata: unknown): string | undefined {
  const record = asRecord(metadata);
  if (!record) return undefined;

  const branding = asRecord(record.branding);

  return (
    readString(record.logoUrl) ??
    readString(record.logo_url) ??
    readString(branding?.logoUrl) ??
    readString(branding?.logo_url)
  );
}

function getHostFromUrl(value: string): string | undefined {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

// مهم: whitelist / blacklist
const IMC_LOGO_HOSTS = new Set<string>([
  "imc.med.sa",
  "www.imc.med.sa",
]);

function sanitizeTenantLogoUrl(
  tenantCode: string,
  logoUrl?: string,
): string | undefined {
  if (!logoUrl) return undefined;

  const normalizedCode = tenantCode.trim().toUpperCase();

  // IMC allowed
  if (normalizedCode === "IMC") return logoUrl;

  const host = getHostFromUrl(logoUrl);

  if (host && IMC_LOGO_HOSTS.has(host)) {
    return undefined;
  }

  return logoUrl;
}

export function resolveTenantBrandingWithProfile(
  source: TenantBrandingSource,
  profile?: TenantBrandingProfileLike | null,
): TenantBranding {
  const metadataLogo = extractTenantLogoUrl(source.metadata);
  const profileLogo = identityString(profile?.logoUrl);

  const displayName =
    identityString(profile?.displayName) ||
    identityString(profile?.name) ||
    source.name;

  const sanitizedLogoUrl =
    sanitizeTenantLogoUrl(
      source.code,
      profileLogo ?? metadataLogo,
    ) ?? undefined;

  const identity: TenantDocumentIdentity = {
    displayName,
    legalName: identityString(profile?.legalName),
    licenseNumber: identityString(profile?.licenseNumber),
    commercialRegistrationNumber: identityString(
      profile?.commercialRegistrationNumber,
    ),
    taxNumber: identityString(profile?.taxNumber),
    contactEmail: identityString(profile?.contactEmail),
    contactPhone: identityString(profile?.contactPhone),
    addressLine1: identityString(profile?.addressLine1),
    addressLine2: identityString(profile?.addressLine2),
    city: identityString(profile?.city),
    country: identityString(profile?.country),
    postalCode: identityString(profile?.postalCode),
    websiteUrl: identityString(profile?.websiteUrl),
    logoUrl: sanitizedLogoUrl,
    documentHeaderText: identityString(profile?.documentHeaderText),
    documentFooterText: identityString(profile?.documentFooterText),
    legalDisclaimer: identityString(profile?.legalDisclaimer),
  };

  return {
    id: source.id,
    name: displayName,
    code: source.code,
    logoUrl: sanitizedLogoUrl,
    identity,
  };
}

export function resolveTenantBranding(
  source: TenantBrandingSource,
): TenantBranding {
  return resolveTenantBrandingWithProfile(source);
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

  const suffix = args.suffix
    ? `-${args.suffix.toUpperCase()}`
    : "";

  return `${prefix}${suffix}-${args.caseId
    .slice(0, 8)
    .toUpperCase()}-${timestamp}`;
}

export function buildTenantInstitutionLabel(
  name: string | null | undefined,
): string {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed || "Healthcare Provider";
}

export function buildTenantIdentityLines(
  identity: TenantDocumentIdentity,
): string[] {
  const location = [identity.city, identity.country]
    .filter(Boolean)
    .join(", ");

  return [
    identity.legalName,
    identity.licenseNumber
      ? `License No.: ${identity.licenseNumber}`
      : null,
    identity.commercialRegistrationNumber
      ? `CR: ${identity.commercialRegistrationNumber}`
      : null,
    identity.taxNumber
      ? `Tax No.: ${identity.taxNumber}`
      : null,
    identity.addressLine1,
    identity.addressLine2,
    location || null,
    identity.postalCode
      ? `Postal Code: ${identity.postalCode}`
      : null,
    identity.contactPhone
      ? `Phone: ${identity.contactPhone}`
      : null,
    identity.contactEmail
      ? `Email: ${identity.contactEmail}`
      : null,
    identity.websiteUrl,
  ].filter(
    (line): line is string =>
      typeof line === "string" && line.trim().length > 0,
  );
}