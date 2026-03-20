const DEV_BACKEND_FALLBACK = "http://127.0.0.1:8000";

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

export function getConfiguredBackendApiBaseUrl(): string | null {
  const configured =
    normalizeAbsoluteHttpUrl(process.env.BACKEND_API_BASE_URL) ??
    normalizeAbsoluteHttpUrl(process.env.BACKEND_URL) ??
    normalizeAbsoluteHttpUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

  if (configured) {
    return configured;
  }

  // Keep production strict: require an explicit backend URL.
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return DEV_BACKEND_FALLBACK;
}
