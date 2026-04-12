const RETRYABLE_STATUSES = new Set([401, 403, 429, 502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function shouldRetry(method: string, status: number, attempt: number): boolean {
	if (!IDEMPOTENT_METHODS.has(method)) {
		return false;
	}

	if (attempt >= 3) {
		return false;
	}

	return RETRYABLE_STATUSES.has(status);
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function apiFetch(url: string, options: RequestInit = {}) {
	const headers = new Headers(options.headers);
	if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const method = (options.method || "GET").toUpperCase();

	for (let attempt = 1; attempt <= 3; attempt += 1) {
		const res = await fetch(url, {
			...options,
			headers,
			credentials: options.credentials ?? "include",
		});

		if (res.ok) {
			return res.json();
		}

		if (shouldRetry(method, res.status, attempt)) {
			await wait(120 * Math.pow(2, attempt - 1));
			continue;
		}

		throw new Error(`API request failed: ${res.status}`);
	}

	throw new Error("API request failed: 503");
}

export function clearToken() {
	if (typeof window !== "undefined") {
		localStorage.removeItem("wathiqcare_access_token");
		localStorage.removeItem("token");
	}
}
