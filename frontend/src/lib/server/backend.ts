export function getBackendApiBaseUrl(): string {
  const raw =
    process.env.BACKEND_API_BASE_URL ??
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8000";
  return raw.replace(/\/$/, "");
}
