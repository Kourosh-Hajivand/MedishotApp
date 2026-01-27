import MediaService from "@/utils/service/MediaService";
import { EditPatientMediaRequest, UploadMediaWithTemplateRequest, UploadPatientMediaRequest } from "@/utils/service/models/RequestModels";
import { PatientMediaBookmarkResponse, PatientMediaDeleteResponse, PatientMediaEditResponse, PatientMediaListResponse, PatientMediaRestoreResponse, PatientMediaTrashResponse, PatientMediaUploadResponse, PatientMediaWithTemplateResponse, TempUploadResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useProfileStore } from "./useProfileStore";

// ============= Query Hooks (GET) =============

export const useGetPatientMedia = (patientId: number | string, enabled: boolean = true): UseQueryResult<PatientMediaListResponse, Error> => {
    return useQuery({
        queryKey: ["GetPatientMedia", patientId],
        queryFn: () => MediaService.getPatientMedia(patientId),
        enabled: enabled && !!patientId,
        refetchOnMount: true, // Always refetch when component mounts to get latest data
        staleTime: 0, // Consider data stale immediately to ensure fresh data after mutations
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useUploadPatientMedia = (onSuccess?: (data: PatientMediaUploadResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientMediaUploadResponse, Error, { patientId: number | string; data: UploadPatientMediaRequest }> => {
    const queryClient = useQueryClient();
    const { selectedPractice } = useProfileStore();

    return useMutation({
        mutationFn: ({ patientId, data }: { patientId: number | string; data: UploadPatientMediaRequest }) => MediaService.uploadPatientMedia(patientId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPatientMedia", variables.patientId],
            });
            // Invalidate practice albums to refresh album list
            if (selectedPractice?.id) {
                queryClient.invalidateQueries({
                    queryKey: ["GetPracticeAlbums", selectedPractice.id],
                });
            }
            // Invalidate patient activities to refresh activity list
            queryClient.invalidateQueries({
                queryKey: ["GetPatientActivities"],
            });
            // Invalidate practice queries to update counts (taken_images_count)
            queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
            if (selectedPractice?.id) {
                queryClient.invalidateQueries({ queryKey: ["GetPracticeById", selectedPractice.id] });
            } else {
                queryClient.invalidateQueries({ queryKey: ["GetPracticeById"] });
            }
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

export const useTempUpload = (onSuccess?: (data: TempUploadResponse) => void, onError?: (error: Error) => void): UseMutationResult<TempUploadResponse, Error, File | { uri: string; type: string; name: string }> => {
    return useMutation({
        mutationFn: (file: File | { uri: string; type: string; name: string }) => MediaService.tempUpload(file),
        onSuccess: (data) => {
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useGetTrashMedia = (patientId: number | string, enabled: boolean = true): UseQueryResult<PatientMediaTrashResponse, Error> => {
    return useQuery({
        queryKey: ["GetTrashMedia", patientId],
        queryFn: () => MediaService.getTrashMedia(patientId),
        enabled: enabled && !!patientId,
    });
};

export const useRestoreMedia = (onSuccess?: (data: PatientMediaRestoreResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientMediaRestoreResponse, Error, number | string> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (mediaId: number | string) => MediaService.restoreMedia(mediaId),
        onSuccess: (data, mediaId) => {
            // Invalidate all media queries to refresh the lists
            queryClient.invalidateQueries({ queryKey: ["GetPatientMedia"] });
            queryClient.invalidateQueries({ queryKey: ["GetTrashMedia"] });
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

export const useEditPatientMedia = (onSuccess?: (data: PatientMediaEditResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientMediaEditResponse, Error, { mediaId: number | string; data: EditPatientMediaRequest }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ mediaId, data }: { mediaId: number | string; data: EditPatientMediaRequest }) => MediaService.editPatientMedia(mediaId, data),
        onSuccess: (data, variables) => {
            // Invalidate all media queries to refresh the lists
            queryClient.invalidateQueries({ queryKey: ["GetPatientMedia"] });
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

export const useBookmarkMedia = (onSuccess?: (data: PatientMediaBookmarkResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientMediaBookmarkResponse, Error, number | string> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (mediaId: number | string) => MediaService.bookmarkMedia(mediaId),
        onSuccess: (data, mediaId) => {
            // Invalidate all media queries to refresh bookmark status
            queryClient.invalidateQueries({ queryKey: ["GetPatientMedia"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUnbookmarkMedia = (onSuccess?: (data: PatientMediaBookmarkResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientMediaBookmarkResponse, Error, number | string> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (mediaId: number | string) => MediaService.unbookmarkMedia(mediaId),
        onSuccess: (data, mediaId) => {
            // Invalidate all media queries to refresh bookmark status
            queryClient.invalidateQueries({ queryKey: ["GetPatientMedia"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUploadPatientMediaWithTemplate = (onSuccess?: (data: PatientMediaWithTemplateResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientMediaWithTemplateResponse, Error, { patientId: number | string; data: UploadMediaWithTemplateRequest }> => {
    const queryClient = useQueryClient();
    const { selectedPractice } = useProfileStore();

    return useMutation({
        mutationFn: ({ patientId, data }: { patientId: number | string; data: UploadMediaWithTemplateRequest }) => MediaService.uploadPatientMediaWithTemplate(patientId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPatientMedia", variables.patientId],
            });
            queryClient.invalidateQueries({
                queryKey: ["GetPatientMediaAlbums", variables.patientId],
            });
            // Invalidate practice albums to refresh album list
            if (selectedPractice?.id) {
                queryClient.invalidateQueries({
                    queryKey: ["GetPracticeAlbums", selectedPractice.id],
                });
            }
            // Invalidate patient activities to refresh activity list
            queryClient.invalidateQueries({
                queryKey: ["GetPatientActivities"],
            });
            // Invalidate practice queries to update counts (taken_images_count)
            queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
            if (selectedPractice?.id) {
                queryClient.invalidateQueries({ queryKey: ["GetPracticeById", selectedPractice.id] });
            } else {
                queryClient.invalidateQueries({ queryKey: ["GetPracticeById"] });
            }
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
