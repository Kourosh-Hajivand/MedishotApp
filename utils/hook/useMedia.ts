import MediaService from "@/utils/service/MediaService";
import { UploadPatientMediaRequest } from "@/utils/service/models/RequestModels";
import { PatientMediaDeleteResponse, PatientMediaListResponse, PatientMediaUploadResponse, TempUploadResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";

// ============= Query Hooks (GET) =============

export const useGetPatientMedia = (patientId: number | string, enabled: boolean = true): UseQueryResult<PatientMediaListResponse, Error> => {
    return useQuery({
        queryKey: ["GetPatientMedia", patientId],
        queryFn: () => MediaService.getPatientMedia(patientId),
        enabled: enabled && !!patientId,
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useUploadPatientMedia = (onSuccess?: (data: PatientMediaUploadResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientMediaUploadResponse, Error, { patientId: number | string; data: UploadPatientMediaRequest }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ patientId, data }: { patientId: number | string; data: UploadPatientMediaRequest }) => MediaService.uploadPatientMedia(patientId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPatientMedia", variables.patientId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useDeletePatientMedia = (onSuccess?: (data: PatientMediaDeleteResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientMediaDeleteResponse, Error, { patientId: number | string; mediaId: number | string }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ patientId, mediaId }: { patientId: number | string; mediaId: number | string }) => MediaService.deletePatientMedia(patientId, mediaId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPatientMedia", variables.patientId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useTempUpload = (onSuccess?: (data: TempUploadResponse) => void, onError?: (error: Error) => void): UseMutationResult<TempUploadResponse, Error, File> => {
    return useMutation({
        mutationFn: (file: File) => MediaService.tempUpload(file),
        onSuccess: (data) => {
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
