import { apiClient } from "@/lib/api/http-client";
import { Department, Encounter, Facility, PagedResult, Patient } from "@/lib/api/types";

export type CreatePatientPayload = {
    mrn: string;
    firstName: string;
    lastName: string;
    nationalId?: string;
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    preferredLanguage?: string;
    primaryPhone?: string;
    secondaryPhone?: string;
    email?: string;
};

export type CreateEncounterPayload = {
    patientId: string;
    encounterNumber: string;
    facilityId: string;
    departmentId?: string;
    admissionType?: string;
    admissionDate?: string;
    dischargeExpectedDate?: string;
    attendingPhysicianName?: string;
    attendingPhysicianUserId?: string;
    room?: string;
    bed?: string;
    status: string;
};

export const referenceApi = {
    facilities() {
        return apiClient.get<Facility[]>("/facilities");
    },

    departments(facilityId?: string) {
        return apiClient.get<Department[]>("/departments", {
            facilityId,
        });
    },

    patients(search?: string, page = 1, pageSize = 50) {
        return apiClient.get<PagedResult<Patient>>("/patients", {
            search,
            page,
            pageSize,
        });
    },

    patientById(patientId: string) {
        return apiClient.get<Patient>(`/patients/${encodeURIComponent(patientId)}`);
    },

    createPatient(payload: CreatePatientPayload) {
        return apiClient.post<Patient, CreatePatientPayload>("/patients", payload);
    },

    encounters(page = 1, pageSize = 100) {
        return apiClient.get<PagedResult<Encounter>>("/encounters", {
            page,
            pageSize,
        });
    },

    encounterById(encounterId: string) {
        return apiClient.get<Encounter>(`/encounters/${encodeURIComponent(encounterId)}`);
    },

    createEncounter(payload: CreateEncounterPayload) {
        return apiClient.post<Encounter, CreateEncounterPayload>("/encounters", payload);
    },
};
