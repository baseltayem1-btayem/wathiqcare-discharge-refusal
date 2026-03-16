"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    referenceApi,
    type CreateEncounterPayload,
    type CreatePatientPayload,
} from "@/lib/api/modules/reference";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useFacilitiesQuery(enabled = true) {
    return useQuery({
        queryKey: queryKeys.reference.facilities,
        queryFn: () => referenceApi.facilities(),
        enabled,
    });
}

export function useDepartmentsQuery(facilityId?: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.reference.departments(facilityId),
        queryFn: () => referenceApi.departments(facilityId),
        enabled: enabled && Boolean(facilityId),
    });
}

export function usePatientsQuery(search: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.reference.patients(search),
        queryFn: () => referenceApi.patients(search),
        enabled,
    });
}

export function usePatientQuery(patientId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.reference.patient(patientId),
        queryFn: () => referenceApi.patientById(patientId),
        enabled: enabled && Boolean(patientId),
    });
}

export function useEncountersQuery(enabled = true) {
    return useQuery({
        queryKey: queryKeys.reference.encounters,
        queryFn: () => referenceApi.encounters(),
        enabled,
    });
}

export function useEncounterQuery(encounterId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.reference.encounter(encounterId),
        queryFn: () => referenceApi.encounterById(encounterId),
        enabled: enabled && Boolean(encounterId),
    });
}

export function useCreatePatientMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreatePatientPayload) => referenceApi.createPatient(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["reference", "patients"] });
        },
    });
}

export function useCreateEncounterMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateEncounterPayload) => referenceApi.createEncounter(payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.reference.encounters });
        },
    });
}
