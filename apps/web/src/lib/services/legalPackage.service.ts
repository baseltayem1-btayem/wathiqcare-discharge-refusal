// Service for fetching legal package metadata and download URL
export async function fetchLegalPackageMetadata(caseId: string) {
    const configuredBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    const endpoint = configuredBase
        ? `${configuredBase}/api/cases/${caseId}/legal-package`
        : `/api/cases/${caseId}/legal-package`;

    const res = await fetch(endpoint, {
        credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch legal package metadata");
    return res.json();
}
