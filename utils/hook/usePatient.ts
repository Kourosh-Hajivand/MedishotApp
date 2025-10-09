import PatientService from "@/utils/service/PatientService";
import { CreatePatientRequest, UpdatePatientRequest } from "@/utils/service/models/RequestModels";
import { ApiResponse, PatientDetailResponse, PatientListResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";

// ============= Query Hooks (GET) =============

export const useGetPatients = (page: number = 1, perPage: number = 15, enabled: boolean = true): UseQueryResult<PatientListResponse, Error> => {
    return useQuery({
        queryKey: ["GetPatients", page, perPage],
        queryFn: () => PatientService.getPatients(page, perPage),
        enabled,
    });
};

export const useGetPatientById = (patientId: number | string, enabled: boolean = true): UseQueryResult<PatientDetailResponse, Error> => {
    return useQuery({
        queryKey: ["GetPatientById", patientId],
        queryFn: () => PatientService.getPatientById(patientId),
        enabled: enabled && !!patientId,
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useCreatePatient = (onSuccess?: (data: PatientDetailResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientDetailResponse, Error, CreatePatientRequest> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePatientRequest) => PatientService.createPatient(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["GetPatients"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUpdatePatient = (onSuccess?: (data: PatientDetailResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientDetailResponse, Error, { patientId: number | string; data: UpdatePatientRequest }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ patientId, data }: { patientId: number | string; data: UpdatePatientRequest }) => PatientService.updatePatient(patientId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["GetPatients"] });
            queryClient.invalidateQueries({
                queryKey: ["GetPatientById", variables.patientId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useDeletePatient = (onSuccess?: (data: ApiResponse<string>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<string>, Error, number | string> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (patientId: number | string) => PatientService.deletePatient(patientId),
        onSuccess: (data, patientId) => {
            queryClient.invalidateQueries({ queryKey: ["GetPatients"] });
            queryClient.removeQueries({ queryKey: ["GetPatientById", patientId] });
            queryClient.removeQueries({ queryKey: ["GetPatientMedia", patientId] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
