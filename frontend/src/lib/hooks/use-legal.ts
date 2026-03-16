"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { legalApi, type CreateLegalNotePayload } from "@/lib/api/modules/legal";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useLegalNotesQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.legal.notes(caseId),
        queryFn: () => legalApi.listNotes(caseId),
        enabled: enabled && Boolean(caseId),
    });
}

export function useCaseAuditQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.legal.caseAudit(caseId),
        queryFn: () => legalApi.caseAudit(caseId),
        enabled: enabled && Boolean(caseId),
    });
}

export function useCreateLegalNoteMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateLegalNotePayload) => legalApi.createNote(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.legal.notes(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.legal.caseAudit(caseId) });
        },
    });
}
