import { apiFetch as apiFetchShared, clearToken as clearTokenShared } from "@/utils/api";

export async function apiFetch(url: string, options: RequestInit = {}) {
	return apiFetchShared(url, options);
}

export function clearToken() {
	clearTokenShared();
}
