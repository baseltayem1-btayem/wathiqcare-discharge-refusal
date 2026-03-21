const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

const LEGACY_TOKEN_KEYS = ["wathiqcare_access_token", "token"];
const AUTH_ME_PATH = "/api/auth/me";

let sessionValidationPromise: Promise<void> | null = null;

export class ApiHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
  }
}

export function redirectToLogin(nextPath?: string, source = "unknown"): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname === "/login") {
    console.info(`[auth] Skip redirect to /login (already there). source=${source}`);
    return;
  }

  const current = nextPath || `${window.location.pathname}${window.location.search}`;
  const next = encodeURIComponent(current || "/");
  console.warn(`[auth] Redirecting to /login. source=${source} next=${current || "/"}`);
  window.location.assign(`/login?next=${next}`);
}

export function clearToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  for (const key of LEGACY_TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

export function isAuthenticationError(error: unknown): boolean {
  return error instanceof ApiHttpError && error.status === 401;
}

type SessionValidationResult = {
  valid: boolean | null;
  status: number | null;
};

async function checkSessionWithAuthMe(reason: string): Promise<SessionValidationResult> {
  try {
    const response = await fetch(AUTH_ME_PATH, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    if (response.ok) {
      console.info(`[auth] auth/me passed after ${reason}; no redirect.`);
      return { valid: true, status: response.status };
    }

    console.warn(`[auth] auth/me failed after ${reason}; status=${response.status}`);
    return { valid: false, status: response.status };
  } catch (error) {
    console.error(`[auth] auth/me check errored after ${reason}; preserving current route.`, error);
    return { valid: null, status: null };
  }
}

export async function validateSessionAndRedirectIfInvalid(
  reason: string,
  nextPath?: string,
): Promise<boolean | null> {
  const result = await checkSessionWithAuthMe(reason);

  if (result.valid === false) {
    clearToken();
    redirectToLogin(nextPath, `auth/me failed (status=${result.status ?? "unknown"}) after ${reason}`);
    return false;
  }

  return result.valid;
}

export function triggerSessionValidation(reason: string, nextPath?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (sessionValidationPromise) {
    console.info(`[auth] Session validation already in flight; skip duplicate. source=${reason}`);
    return;
  }

  sessionValidationPromise = validateSessionAndRedirectIfInvalid(reason, nextPath)
    .catch((error) => {
      console.error("[auth] Unexpected session validation failure.", error);
    })
    .finally(() => {
      sessionValidationPromise = null;
    });
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

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    if (response.status === 401) {
      const method = (init.method || "GET").toUpperCase();
      console.warn(`[auth] ${method} ${normalizedPath} returned 401; validating session via /api/auth/me.`);
      triggerSessionValidation(`apiFetch ${method} ${normalizedPath}`);
    }

    const errorBody = isJson
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    throw new ApiHttpError(
      response.status,
      getErrorMessage(response.status, response.statusText, errorBody),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (isJson) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}
