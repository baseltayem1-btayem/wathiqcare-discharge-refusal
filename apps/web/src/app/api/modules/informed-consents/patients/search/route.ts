import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant context" }, { status: 400 });
  }

  if (!query || query.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  const prisma = getPrisma();
  const normalizedQuery = query.toLowerCase();

  const cases = await prisma.case.findMany({
    where: {
      tenantId,
      OR: [
        { patientName: { contains: query, mode: "insensitive" } },
        { medicalRecordNo: { contains: query, mode: "insensitive" } },
        { patientIdNumber: { contains: query, mode: "insensitive" } },
        { caseNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      caseNumber: true,
      patientName: true,
      medicalRecordNo: true,
      patientIdNumber: true,
      title: true,
      metadata: true,
      createdAt: true,
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  const results = cases.map((caseRecord) => {
    const metadata = (caseRecord.metadata || {}) as Record<string, unknown>;
    const mobile = metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.mobileNumber ?? metadata.phone ?? metadata.patientPhone ?? "") || "")
      : "";
    const gender = metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.gender ?? "") || "")
      : "";
    const dateOfBirth = metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? String((metadata.dateOfBirth ?? metadata.dob ?? "") || "")
      : "";

    return {
      id: caseRecord.id,
      mrn: caseRecord.medicalRecordNo || `CASE-${caseRecord.id.slice(0, 8).toUpperCase()}`,
      name: caseRecord.patientName || "Unknown Patient",
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      nationalId: caseRecord.patientIdNumber,
      mobileNumber: mobile || null,
      source: "case_fallback" as const,
      languagePreference: "bilingual" as const,
      capacityStatus: "competent" as const,
    };
  });

  // Secondary filter for queries that did not match via Prisma wildcard (e.g. mobile in metadata).
  const filtered = normalizedQuery
    ? results.filter(
        (r) =>
          r.name.toLowerCase().includes(normalizedQuery) ||
          (r.mrn && r.mrn.toLowerCase().includes(normalizedQuery)) ||
          (r.mobileNumber && r.mobileNumber.includes(query)),
      )
    : results;

  return NextResponse.json(filtered);
}
