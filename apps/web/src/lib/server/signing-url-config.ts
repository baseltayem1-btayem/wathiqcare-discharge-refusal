const DEFAULT_APPROVED_HOSTS = [
  "wathiqcare.online",
  "wathiqcare.med.sa",
  "*.vercel.app",
  "localhost",
  "127.0.0.1",
];

const PRODUCTION_HOSTS = new Set(["wathiqcare.online", "wathiqcare.med.sa"]);

function getApprovedHosts(): string[] {
  const env = process.env.SIGNING_URL_APPROVED_HOSTS?.trim();
  if (!env) return DEFAULT_APPROVED_HOSTS;
  return env.split(",").map((h) => h.trim()).filter(Boolean);
}

function isApprovedHost(host: string): boolean {
  const approved = getApprovedHosts();
  for (const pattern of approved) {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(2);
      if (host === suffix || host.endsWith(`.${suffix}`)) return true;
    } else if (host === pattern) {
      return true;
    }
  }
  return false;
}

function isPreviewEnvironment(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

function isTestEnvironment(): boolean {
  return process.env.NODE_ENV === "test";
}

/**
 * Resolve a trusted base URL for signing links.
 *
 * Precedence:
 *  1. Explicitly supplied baseUrl
 *  2. SIGNING_BASE_URL environment variable
 *  3. NEXTAUTH_URL environment variable
 *
 * Fails closed if none are provided, the protocol is not allowed, or the host
 * is not in the approved-host list. In preview environments a production URL
 * can never be generated silently.
 */
export function resolveTrustedSigningBaseUrl(baseUrl?: string): string {
  const raw =
    baseUrl?.trim()
    || process.env.SIGNING_BASE_URL?.trim()
    || process.env.NEXTAUTH_URL?.trim();

  if (!raw) {
    throw new Error(
      "Signing base URL is not configured. Provide a baseUrl argument or set SIGNING_BASE_URL/NEXTAUTH_URL.",
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid signing base URL: ${raw}`);
  }

  const allowedProtocol =
    url.protocol === "https:" || (isTestEnvironment() && url.protocol === "http:");
  if (!allowedProtocol) {
    throw new Error(`Signing base URL must use https protocol: ${raw}`);
  }

  const host = url.hostname.toLowerCase();

  if (isPreviewEnvironment() && PRODUCTION_HOSTS.has(host)) {
    throw new Error(
      "Preview environment cannot silently generate a production signing URL",
    );
  }

  if (!isApprovedHost(host)) {
    throw new Error(`Signing base URL host is not approved: ${host}`);
  }

  return `${url.origin}`;
}
