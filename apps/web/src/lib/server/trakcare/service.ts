import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { callTrakCare, getTrakCareStatus } from "@/lib/server/trakcare/client";
import { getTrakCareConfig } from "@/lib/server/trakcare/config";
import { listPayload, mapEncounter, mapPatient, mapResourceList } from "@/lib/server/trakcare/mapper";
import type {
  TrakCareCallResult,
  TrakCareEncounter,
  TrakCarePatient,
  TrakCareRequestContext,
  TrakCareResourceItem,
  TrakCareStatus,
} from "@/lib/server/trakcare/types";

const prisma = getPrisma();

function createSearchParams(entries: Array<[string, string | null | undefined]>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    if (value && value.trim()) {
      params.set(key, value.trim());
    }
  }
  return params;
}

export function getIntegrationStatus(): TrakCareStatus {
  return getTrakCareStatus();
}

export async function searchPatients(
  context: TrakCareRequestContext,
  query: string,
): Promise<TrakCareCallResult<TrakCarePatient[]>> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return {
      data: [],
      sourceTransactionId: null,
      correlationId: context.correlationId,
    };
  }

  const config = getTrakCareConfig();
  const searchParams = createSearchParams([
    ["q", trimmed],
    ["query", trimmed],
    ["search", trimmed],
  ]);

  const { data: payload, sourceTransactionId } = await callTrakCare<unknown>({
    context,
    path: `${config.patientPath}/search`,
    searchParams,
  });

  const patients = listPayload(payload).map((record) => mapPatient(record));

  return {
    data: patients,
    sourceTransactionId,
    correlationId: context.correlationId,
  };
}

export async function getPatientByMrn(
  context: TrakCareRequestContext,
  mrn: string,
): Promise<TrakCareCallResult<TrakCarePatient>> {
  const trimmedMrn = mrn.trim();
  if (!trimmedMrn) {
    throw new ApiError(400, "MRN is required");
  }

  const config = getTrakCareConfig();
  const { data: payload, sourceTransactionId } = await callTrakCare<unknown>({
    context,
    path: `${config.patientPath}/${encodeURIComponent(trimmedMrn)}`,
    mrn: trimmedMrn,
  });

  const patient = mapPatient(payload);
  if (!patient.mrn) {
    patient.mrn = trimmedMrn;
  }

  await prisma.patientExternalReference.upsert({
    where: {
      tenantId_externalSystem_patientMrn: {
        tenantId: context.tenantId,
        externalSystem: "TRAKCARE",
        patientMrn: patient.mrn,
      },
    },
    update: {
      externalPatientId: patient.id || patient.mrn,
      nationalId: patient.nationalId || null,
      iqamaNumber: patient.iqamaNumber || null,
      sourceTransactionId: sourceTransactionId || null,
      lastSyncedAt: new Date(),
      metadata: {
        fetchedVia: "api.trakcare.patient",
      },
    },
    create: {
      tenantId: context.tenantId,
      patientMrn: patient.mrn,
      externalSystem: "TRAKCARE",
      externalPatientId: patient.id || patient.mrn,
      nationalId: patient.nationalId || null,
      iqamaNumber: patient.iqamaNumber || null,
      sourceTransactionId: sourceTransactionId || null,
      metadata: {
        fetchedVia: "api.trakcare.patient",
      },
    },
  });

  return {
    data: patient,
    sourceTransactionId,
    correlationId: context.correlationId,
  };
}

export async function getEncountersByMrn(
  context: TrakCareRequestContext,
  mrn: string,
): Promise<TrakCareCallResult<TrakCareEncounter[]>> {
  const trimmedMrn = mrn.trim();
  if (!trimmedMrn) {
    throw new ApiError(400, "MRN is required");
  }

  const config = getTrakCareConfig();
  const { data: payload, sourceTransactionId } = await callTrakCare<unknown>({
    context,
    path: config.encounterPath,
    searchParams: createSearchParams([["mrn", trimmedMrn], ["patientMrn", trimmedMrn]]),
    mrn: trimmedMrn,
  });

  const encounters = listPayload(payload).map((record) => mapEncounter(record));

  const patientRef = await prisma.patientExternalReference.findUnique({
    where: {
      tenantId_externalSystem_patientMrn: {
        tenantId: context.tenantId,
        externalSystem: "TRAKCARE",
        patientMrn: trimmedMrn,
      },
    },
    select: { id: true },
  });

  for (const encounter of encounters) {
    if (!encounter.id) {
      continue;
    }

    await prisma.encounterExternalReference.upsert({
      where: {
        tenantId_externalSystem_externalEncounterId: {
          tenantId: context.tenantId,
          externalSystem: "TRAKCARE",
          externalEncounterId: encounter.id,
        },
      },
      update: {
        patientExternalReferenceId: patientRef?.id || null,
        encounterNumber: encounter.encounterId || null,
        externalPractitionerId: encounter.physicianId || null,
        department: encounter.department || null,
        admissionDate: encounter.admissionDate ? new Date(encounter.admissionDate) : null,
        sourceTransactionId: sourceTransactionId || null,
        lastSyncedAt: new Date(),
      },
      create: {
        tenantId: context.tenantId,
        patientExternalReferenceId: patientRef?.id || null,
        externalSystem: "TRAKCARE",
        externalEncounterId: encounter.id,
        encounterNumber: encounter.encounterId || null,
        externalPractitionerId: encounter.physicianId || null,
        department: encounter.department || null,
        admissionDate: encounter.admissionDate ? new Date(encounter.admissionDate) : null,
        sourceTransactionId: sourceTransactionId || null,
      },
    });
  }

  return {
    data: encounters,
    sourceTransactionId,
    correlationId: context.correlationId,
  };
}

async function getEncounterResources(
  context: TrakCareRequestContext,
  encounterId: string,
  path: string,
  kind: string,
): Promise<TrakCareCallResult<TrakCareResourceItem[]>> {
  const trimmedEncounterId = encounterId.trim();
  if (!trimmedEncounterId) {
    throw new ApiError(400, "Encounter ID is required");
  }

  const { data: payload, sourceTransactionId } = await callTrakCare<unknown>({
    context,
    path,
    externalEncounterId: trimmedEncounterId,
  });

  return {
    data: mapResourceList(payload, kind),
    sourceTransactionId,
    correlationId: context.correlationId,
  };
}

export async function getEncounterAllergies(
  context: TrakCareRequestContext,
  encounterId: string,
): Promise<TrakCareCallResult<TrakCareResourceItem[]>> {
  const config = getTrakCareConfig();
  return getEncounterResources(
    context,
    encounterId,
    `${config.encounterPath}/${encodeURIComponent(encounterId.trim())}${config.allergyPath}`,
    "allergy",
  );
}

export async function getEncounterConditions(
  context: TrakCareRequestContext,
  encounterId: string,
): Promise<TrakCareCallResult<TrakCareResourceItem[]>> {
  const config = getTrakCareConfig();
  return getEncounterResources(
    context,
    encounterId,
    `${config.encounterPath}/${encodeURIComponent(encounterId.trim())}${config.conditionPath}`,
    "condition",
  );
}

export async function getEncounterMedications(
  context: TrakCareRequestContext,
  encounterId: string,
): Promise<TrakCareCallResult<TrakCareResourceItem[]>> {
  const config = getTrakCareConfig();
  return getEncounterResources(
    context,
    encounterId,
    `${config.encounterPath}/${encodeURIComponent(encounterId.trim())}${config.medicationPath}`,
    "medication",
  );
}

export async function getEncounterObservations(
  context: TrakCareRequestContext,
  encounterId: string,
): Promise<TrakCareCallResult<TrakCareResourceItem[]>> {
  const config = getTrakCareConfig();
  return getEncounterResources(
    context,
    encounterId,
    `${config.encounterPath}/${encodeURIComponent(encounterId.trim())}${config.observationPath}`,
    "observation",
  );
}

export async function getPractitioner(
  context: TrakCareRequestContext,
  practitionerId: string,
): Promise<TrakCareCallResult<Record<string, unknown>>> {
  const trimmedPractitionerId = practitionerId.trim();
  if (!trimmedPractitionerId) {
    throw new ApiError(400, "Practitioner ID is required");
  }

  const config = getTrakCareConfig();
  const { data: payload, sourceTransactionId } = await callTrakCare<Record<string, unknown>>({
    context,
    path: `${config.practitionerPath}/${encodeURIComponent(trimmedPractitionerId)}`,
  });

  return {
    data: payload,
    sourceTransactionId,
    correlationId: context.correlationId,
  };
}
