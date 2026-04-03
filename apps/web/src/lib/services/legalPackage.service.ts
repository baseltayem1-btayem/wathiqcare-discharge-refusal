// Service for fetching legal package metadata and download URL
export async function fetchLegalPackageMetadata(caseId: string) {
<<<<<<< HEAD
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
=======
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
