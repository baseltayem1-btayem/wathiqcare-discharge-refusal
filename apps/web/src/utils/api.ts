const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

const LEGACY_TOKEN_KEYS = ["wathiqcare_access_token", "token"];
const AUTH_ME_PATH = "/api/auth/me";

let sessionValidationPromise: Promise<void> | null = null;

export type AuthFailureMode = "redirect" | "inline";

export type AuthFailureOptions = {
  authFailureMode?: AuthFailureMode;
  nextPath?: string;
};

export class ApiHttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = "HTTP_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.code = code;
    this.details = details;
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

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiHttpError && error.status === 403;
}

type SessionValidationResult = {
  valid: boolean | null;
  status: number | null;
};

export type SessionValidationOutcome = SessionValidationResult & {
  redirected: boolean;
  error?: ApiHttpError;
};

async function checkSessionWithAuthMe(reason: string): Promise<SessionValidationResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(AUTH_ME_PATH, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeout);
  }
}

export async function validateSessionAndRedirectIfInvalid(
  reason: string,
  nextPath?: string,
  options: Omit<AuthFailureOptions, "nextPath"> = {},
): Promise<boolean | null> {
  const result = await validateSessionForRoute(reason, { ...options, nextPath });
  return result.valid;
}

export async function validateSessionForRoute(
  reason: string,
  options: AuthFailureOptions = {},
): Promise<SessionValidationOutcome> {
  const result = await checkSessionWithAuthMe(reason);
  const authFailureMode = options.authFailureMode ?? "redirect";

  if (result.valid === false) {
    const authError = new ApiHttpError(
      result.status ?? 401,
      `401: Session validation required`,
      "AUTH_REQUIRED",
      {
        reason,
        sessionStatus: result.status,
        authFailureMode,
      },
    );

    if (authFailureMode === "redirect") {
      clearToken();
      redirectToLogin(
        options.nextPath,
        `auth/me failed (status=${result.status ?? "unknown"}) after ${reason}`,
      );
      return { ...result, redirected: true, error: authError };
    }

    console.warn(`[auth] Preserving current route after ${reason}; inline auth handling enabled.`);
    return { ...result, redirected: false, error: authError };
  }

  return { ...result, redirected: false };
}

export function triggerSessionValidation(
  reason: string,
  nextPath?: string,
  options: Omit<AuthFailureOptions, "nextPath"> = {},
): void {
  if (typeof window === "undefined") {
    return;
  }

  if (sessionValidationPromise) {
    console.info(`[auth] Session validation already in flight; skip duplicate. source=${reason}`);
    return;
  }

  sessionValidationPromise = validateSessionForRoute(reason, { ...options, nextPath })
    .then(() => undefined)
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

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeNonJsonErrorText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Request failed";
  }

  const plain = stripHtmlTags(trimmed);
  if (!plain) {
    return "Request failed";
  }

  return plain.slice(0, 180);
}

function getErrorCode(status: number): string {
  if (status === 401) {
    return "AUTH_REQUIRED";
  }

  if (status === 403) {
    return "ACCESS_DENIED";
  }

  return "HTTP_ERROR";
}

export type ApiFetchOptions = RequestInit & AuthFailureOptions;

function buildClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `web-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function appendDefaultClientHeaders(headers: Headers): void {
  if (!headers.has("x-request-id")) {
    headers.set("x-request-id", buildClientRequestId());
  }

  if (!headers.has("x-client-platform")) {
    headers.set("x-client-platform", "web");
  }

  if (typeof window !== "undefined") {
    if (!headers.has("x-client-timezone")) {
      headers.set("x-client-timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown");
    }

    if (!headers.has("x-client-path")) {
      headers.set("x-client-path", `${window.location.pathname}${window.location.search}`);
    }
  }
}

async function performFetchWithNetworkGuard(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch";
    const readableMessage =
      message === "Failed to fetch"
        ? "503: Unable to reach the server. Please check your connection and try again."
        : `503: ${message}`;

    throw new ApiHttpError(503, readableMessage, "NETWORK_ERROR", {
      url,
      cause: message,
    });
  }
}

export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const isAbsoluteUrl = /^https?:\/\//i.test(path);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isApiRoute = normalizedPath.startsWith("/api/");
  const url = isAbsoluteUrl
    ? path
    : isApiRoute
      ? normalizedPath
      : `${API_BASE_URL}${normalizedPath}`;

  const {
    authFailureMode = "redirect",
    nextPath,
    ...requestInit
  } = init;

  const headers = new Headers(requestInit.headers ?? {});
  const hasBody = requestInit.body !== undefined && requestInit.body !== null;

  if (hasBody && !(requestInit.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  appendDefaultClientHeaders(headers);

  const response = await performFetchWithNetworkGuard(url, {
    ...requestInit,
    headers,
    credentials: requestInit.credentials ?? "include",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    if (response.status === 401) {
      const method = (requestInit.method || "GET").toUpperCase();
      console.warn(`[auth] ${method} ${normalizedPath} returned 401; validating session via /api/auth/me.`);
      triggerSessionValidation(`apiFetch ${method} ${normalizedPath}`, nextPath, { authFailureMode });
    }

    const errorBody = isJson
      ? await response.json().catch(() => null)
      : sanitizeNonJsonErrorText(await response.text().catch(() => ""));

    throw new ApiHttpError(
      response.status,
      getErrorMessage(response.status, response.statusText, errorBody),
      getErrorCode(response.status),
      errorBody,
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

export async function apiFetchJson<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const isAbsoluteUrl = /^https?:\/\//i.test(path);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isNextApiRoute = normalizedPath.startsWith("/api/");
  const url = isAbsoluteUrl
    ? path
    : isNextApiRoute
      ? normalizedPath
      : `${API_BASE_URL}${normalizedPath}`;

  const {
    authFailureMode = "redirect",
    nextPath,
    ...requestInit
  } = init;

  const headers = new Headers(requestInit.headers ?? {});
  const hasBody = requestInit.body !== undefined && requestInit.body !== null;

  if (hasBody && !(requestInit.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  appendDefaultClientHeaders(headers);

  const response = await performFetchWithNetworkGuard(url, {
    ...requestInit,
    headers,
    credentials: requestInit.credentials ?? "include",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    if (response.status === 401) {
      const method = (requestInit.method || "GET").toUpperCase();
      console.warn(`[auth] ${method} ${normalizedPath} returned 401; validating session via /api/auth/me.`);
      triggerSessionValidation(`apiFetchJson ${method} ${normalizedPath}`, nextPath, { authFailureMode });
    }

    if (!isJson) {
      throw new ApiHttpError(
        response.status,
        `${response.status}: Request failed`,
        getErrorCode(response.status),
      );
    }

    const errorBody = await response.json().catch(() => null);
    throw new ApiHttpError(
      response.status,
      getErrorMessage(response.status, response.statusText, errorBody),
      getErrorCode(response.status),
      errorBody,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!isJson) {
    throw new ApiHttpError(
      502,
      "502: Invalid response format",
      "INVALID_RESPONSE_FORMAT",
      {
        path: normalizedPath,
        contentType,
      },
    );
  }

  return (await response.json()) as T;
}
