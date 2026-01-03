import { PatientDocumentService } from "@/utils/service/PatientDocumentService";
import { CreatePatientDocumentRequest, UpdatePatientDocumentRequest } from "@/utils/service/models/RequestModels";
import { ApiResponse, PatientDocumentDetailResponse, PatientDocumentListResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ============= Query Hooks (GET) =============

export const useGetPatientDocuments = (practiseId: number | string | undefined, patientId: number | string, enabled: boolean = true): UseQueryResult<PatientDocumentListResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPatientDocuments", practiseId, patientId],
        queryFn: () => PatientDocumentService.getPatientDocuments(practiseId!, patientId),
        enabled: isAuthenticated === true && enabled && !!practiseId && !!patientId,
    });
};

export const useGetPatientDocument = (practiseId: number | string | undefined, patientId: number | string, documentId: number | string, enabled: boolean = true): UseQueryResult<PatientDocumentDetailResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPatientDocument", practiseId, patientId, documentId],
        queryFn: () => PatientDocumentService.getPatientDocument(practiseId!, patientId, documentId),
        enabled: isAuthenticated === true && enabled && !!practiseId && !!patientId && !!documentId,
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useCreatePatientDocument = (practiseId: number | string | undefined, patientId: number | string, onSuccess?: (data: PatientDocumentDetailResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientDocumentDetailResponse, Error, CreatePatientDocumentRequest> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePatientDocumentRequest) => PatientDocumentService.uploadPatientDocument(practiseId!, patientId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPatientDocuments", practiseId, patientId],
            });
            // Invalidate patient activities to refresh activity list
            queryClient.invalidateQueries({
                queryKey: ["GetPatientActivities"],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUpdatePatientDocument = (practiseId: number | string | undefined, patientId: number | string, onSuccess?: (data: PatientDocumentDetailResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientDocumentDetailResponse, Error, { documentId: number | string; data: UpdatePatientDocumentRequest }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ documentId, data }: { documentId: number | string; data: UpdatePatientDocumentRequest }) => PatientDocumentService.updatePatientDocument(practiseId!, patientId, documentId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPatientDocuments", practiseId, patientId],
            });
            queryClient.invalidateQueries({
                queryKey: ["GetPatientDocument", practiseId, patientId, variables.documentId],
            });
            // Invalidate patient activities to refresh activity list
            queryClient.invalidateQueries({
                queryKey: ["GetPatientActivities"],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useDeletePatientDocument = (practiseId: number | string | undefined, patientId: number | string, onSuccess?: (data: ApiResponse<string>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<string>, Error, number | string> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (documentId: number | string) => PatientDocumentService.deletePatientDocument(practiseId!, patientId, documentId),
        onSuccess: (data, documentId) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPatientDocuments", practiseId, patientId],
            });
            queryClient.removeQueries({
                queryKey: ["GetPatientDocument", practiseId, patientId, documentId],
            });
            // Invalidate patient activities to refresh activity list
            queryClient.invalidateQueries({
                queryKey: ["GetPatientActivities"],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
