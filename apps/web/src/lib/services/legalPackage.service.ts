// Service for fetching legal package metadata and download URL
export async function fetchLegalPackageMetadata(caseId: string) {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
    let token = null;
    if (typeof window !== "undefined") {
        token = localStorage.getItem("wathiqcare_access_token") ||
            localStorage.getItem("token") ||
            sessionStorage.getItem("wathiqcare_access_token") ||
            sessionStorage.getItem("token");
    }
    const res = await fetch(`${baseUrl}/api/cases/${caseId}/legal-package`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) throw new Error("Failed to fetch legal package metadata");
    return res.json();
}
