export async function apiFetch(url: string, options: RequestInit = {}) {
	const token =
		typeof window !== "undefined"
			? localStorage.getItem("token")
			: null;

	const headers = new Headers(options.headers);
	headers.set("Content-Type", "application/json");

	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	const res = await fetch(url, {
		...options,
		headers,
	});

	if (!res.ok) {
		throw new Error(`API request failed: ${res.status}`);
	}

	return res.json();
}

export function clearToken() {
	if (typeof window !== "undefined") {
		localStorage.removeItem("token");
	}
}
