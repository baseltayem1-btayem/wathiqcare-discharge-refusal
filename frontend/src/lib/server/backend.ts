const DEV_BACKEND_FALLBACK = "http://127.0.0.1:4000";
const LOCALHOST_PREVIEW_HOST_PATTERNS = [
  /^localhost(?::\d+)?$/i,
  /^127\.0\.0\.1(?::\d+)?$/,
  /^\[::1\](?::\d+)?$/i,
];

export type BackendApiBaseUrlSource =
  | "BACKEND_NEST_API_BASE_URL"
  | "BACKEND_API_BASE_URL"
  | "BACKEND_URL"
  | "NEXT_PUBLIC_API_BASE_URL"
  | "development-fallback"
  | "localhost-preview-fallback";

export type BackendApiBaseUrlConfig = {
  url: string;
  source: BackendApiBaseUrlSource;
};

function normalizeAbsoluteHttpUrl(raw: string | undefined): string | null {
  const normalized = (raw || "").trim().replace(/\/$/, "");
  if (!normalized) {
    return null;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    return null;
  }

  return normalized;
}

function isLocalPreviewRequestHost(rawHost: string | undefined): boolean {
  const normalized = (rawHost || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return LOCALHOST_PREVIEW_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function getConfiguredBackendApiBaseUrlConfig(
  requestHost?: string,
): BackendApiBaseUrlConfig | null {
  const candidates: Array<[BackendApiBaseUrlSource, string | undefined]> = [
    ["BACKEND_NEST_API_BASE_URL", process.env.BACKEND_NEST_API_BASE_URL],
    ["BACKEND_API_BASE_URL", process.env.BACKEND_API_BASE_URL],
    ["BACKEND_URL", process.env.BACKEND_URL],
    ["NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL],
  ];

  for (const [source, rawValue] of candidates) {
    const normalized = normalizeAbsoluteHttpUrl(rawValue);
    if (normalized) {
      return { url: normalized, source };
    }
  }

  // Keep production strict: require an explicit backend URL.
  if (process.env.NODE_ENV === "production") {
    if (isLocalPreviewRequestHost(requestHost)) {
      return { url: DEV_BACKEND_FALLBACK, source: "localhost-preview-fallback" };
    }

    return null;
  }

  return { url: DEV_BACKEND_FALLBACK, source: "development-fallback" };
}

export function getConfiguredBackendApiBaseUrl(): string | null {
  return getConfiguredBackendApiBaseUrlConfig()?.url ?? null;
}
