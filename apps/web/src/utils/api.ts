const TOKEN_KEY = "wathiqcare_access_token";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

function isProtectedIntegrationRoute(path: string): boolean {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.startsWith("/api/integrations/");
}

function redirectToLogin(): void {
  if (typeof window === "undefined") {
    return;
  }
  const current = `${window.location.pathname}${window.location.search}`;
  const next = encodeURIComponent(current || "/");
  window.location.assign(`/login?next=${next}`);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const raw = atob(padded);
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
}

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }

  return token;
}

export function setToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(TOKEN_KEY);
}

function getErrorMessage(status: number, statusText: string, body: unknown): string {
  if (body && typeof body === "object") {
    const maybeDetail = (body as { detail?: unknown }).detail;
    if (typeof maybeDetail === "string" && maybeDetail.trim()) {
      return `${status}: ${maybeDetail}`;
    }
  }

  if (typeof body === "string" && body.trim()) {
    return `${status}: ${body}`;
  }

  return `${status} ${statusText}`.trim();
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isAbsoluteUrl = /^https?:\/\//i.test(path);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const requiresAuth = isProtectedIntegrationRoute(normalizedPath);
  const isNextApiRoute = normalizedPath.startsWith("/api/");
  const url = isAbsoluteUrl
    ? path
    : isNextApiRoute
      ? normalizedPath
      : `${API_BASE_URL}${normalizedPath}`;

  const headers = new Headers(init.headers ?? {});
  const hasBody = init.body !== undefined && init.body !== null;

  if (hasBody && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (requiresAuth && !token) {
    redirectToLogin();
    throw new Error("401: Missing access token");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
      if (requiresAuth) {
        redirectToLogin();
      }
    }
    const errorBody = isJson
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");
    throw new Error(getErrorMessage(response.status, response.statusText, errorBody));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (isJson) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}
