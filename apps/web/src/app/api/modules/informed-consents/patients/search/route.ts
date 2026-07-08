import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireModuleOperationalAccess } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { ENABLE_IMC_PILOT_PATIENTS } from "@/lib/config/feature-flags";
import { imcPilotPatients } from "@/components/informed-consents/production-workspace/lib/pilot-patients";
import type { ProductionPatient } from "@/components/informed-consents/production-workspace/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toProductionPatient(pilotPatient: (typeof imcPilotPatients)[number]): ProductionPatient {
  return {
    id: pilotPatient.pilotId,
    mrn: pilotPatient.mrn,
    name: pilotPatient.name,
    caseId: pilotPatient.pilotId,
    caseNumber: pilotPatient.visitNo,
    dateOfBirth: pilotPatient.dateOfBirth,
    gender: pilotPatient.gender,
    nationalId: pilotPatient.nationalId,
    mobileNumber: pilotPatient.mobile,
    email: pilotPatient.email,
    source: "pilot_fallback",
    languagePreference: "bilingual",
    capacityStatus: "competent",
  };
}

function getPilotMatches(query: string): ProductionPatient[] {
  if (!ENABLE_IMC_PILOT_PATIENTS) return [];

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || normalizedQuery.length < 2) return [];

  return imcPilotPatients
    .filter(
      (p) =>
        p.name.toLowerCase().includes(normalizedQuery) ||
        p.mrn.toLowerCase().includes(normalizedQuery) ||
        p.urn.toLowerCase().includes(normalizedQuery) ||
        p.nationalId.toLowerCase().includes(normalizedQuery) ||
        p.mobile.includes(query),
    )
    .map(toProductionPatient);
}

export async function GET(request: NextRequest) {
  const auth = await requireModuleOperationalAccess(request, "informed-consents");
  const { searchParams } = new URL(request.url);

  // Support both UI variants: ?q= and ?query=
  const query = (searchParams.get("q") || searchParams.get("query") || "").trim();
  const tenantId = auth.tenant_id || "";

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant context" }, { status: 400 });
  }

  if (!query || query.length < 2) {
    return NextResponse.json([], { status: 200 });
  }

  const pilotMatches = getPilotMatches(query);

  try {
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

    const results: ProductionPatient[] = cases.map((caseRecord) => {
      const metadata = (caseRecord.metadata || {}) as Record<string, unknown>;

      const mobile =
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? String((metadata.mobileNumber ?? metadata.phone ?? metadata.patientPhone ?? "") || "")
          : "";

      const email =
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? String((metadata.email ?? metadata.patientEmail ?? metadata.emailAddress ?? "") || "")
          : "";

      const gender =
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
          ? String((metadata.gender ?? "") || "")
          : "";

      const dateOfBirth =
        metadata && typeof metadata === "object" && !Array.isArray(metadata)
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
        email: email || null,
        source: "case_fallback",
        languagePreference: "bilingual",
        capacityStatus: "competent",
      };
    });

    const filtered = normalizedQuery
      ? results.filter(
          (r) =>
            r.name.toLowerCase().includes(normalizedQuery) ||
            (r.mrn && r.mrn.toLowerCase().includes(normalizedQuery)) ||
            (r.mobileNumber && r.mobileNumber.includes(query)),
        )
      : results;

    const seenMrn = new Set(filtered.map((r) => r.mrn));
    for (const pilot of pilotMatches) {
      if (!seenMrn.has(pilot.mrn)) {
        filtered.push(pilot);
        seenMrn.add(pilot.mrn);
      }
    }

    return NextResponse.json(filtered, { status: 200 });
  } catch (error) {
    console.error("[informed-consents/patients/search] Prisma lookup failed; using pilot fallback", error);
    return NextResponse.json(pilotMatches, { status: 200 });
  }
}
