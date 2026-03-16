const DEV_BACKEND_FALLBACK = "http://127.0.0.1:4000";

export type BackendApiBaseUrlSource =
  | "BACKEND_NEST_API_BASE_URL"
  | "BACKEND_API_BASE_URL"
  | "BACKEND_URL"
  | "NEXT_PUBLIC_API_BASE_URL"
  | "development-fallback";

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

export function getConfiguredBackendApiBaseUrlConfig(): BackendApiBaseUrlConfig | null {
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
    return null;
  }

  return { url: DEV_BACKEND_FALLBACK, source: "development-fallback" };
}

export function getConfiguredBackendApiBaseUrl(): string | null {
  return getConfiguredBackendApiBaseUrlConfig()?.url ?? null;
}
