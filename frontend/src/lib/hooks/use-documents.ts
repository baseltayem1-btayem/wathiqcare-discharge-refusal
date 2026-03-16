"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    documentsApi,
    type GenerateDocumentPayload,
    type UploadCaseDocumentPayload,
} from "@/lib/api/modules/documents";
import { queryKeys } from "@/lib/hooks/query-keys";

export function useCaseDocumentsQuery(caseId: string, enabled = true) {
    return useQuery({
        queryKey: queryKeys.documents.byCase(caseId),
        queryFn: () => documentsApi.listCaseDocuments(caseId),
        enabled: enabled && Boolean(caseId),
    });
}

export function useUploadCaseDocumentMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UploadCaseDocumentPayload) => documentsApi.uploadCaseDocument(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.documents.byCase(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
        },
    });
}

export function useGenerateCaseDocumentMutation(caseId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: GenerateDocumentPayload) => documentsApi.generateCaseDocument(caseId, payload),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: queryKeys.documents.byCase(caseId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.cases.timeline(caseId) });
        },
    });
}
