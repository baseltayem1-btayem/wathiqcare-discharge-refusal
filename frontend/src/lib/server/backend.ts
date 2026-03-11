export function getConfiguredBackendApiBaseUrl(): string | null {
  const raw =
    process.env.BACKEND_API_BASE_URL ??
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "";

  const normalized = raw.trim().replace(/\/$/, "");
  return normalized.length > 0 ? normalized : null;
}
