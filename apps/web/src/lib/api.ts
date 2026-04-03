export async function apiFetch(url: string, options: RequestInit = {}) {
	const headers = new Headers(options.headers);
	if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const res = await fetch(url, {
		...options,
		headers,
		credentials: options.credentials ?? "include",
	});

	if (!res.ok) {
		throw new Error(`API request failed: ${res.status}`);
	}

	return res.json();
}

export function clearToken() {
	if (typeof window !== "undefined") {
		localStorage.removeItem("wathiqcare_access_token");
		localStorage.removeItem("token");
	}
}
