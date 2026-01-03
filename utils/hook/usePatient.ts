import PatientService, { GetPatientsParams } from "@/utils/service/PatientService";
import { CreatePatientRequest, UpdatePatientRequest } from "@/utils/service/models/RequestModels";
import { ApiResponse, DoctorPatientsResponse, PatientActivitiesResponse, PatientDetailResponse, PatientListResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ============= Query Hooks (GET) =============

export const useGetPatients = (practiseId?: string | number, params?: GetPatientsParams): UseQueryResult<PatientListResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPatients", practiseId, params],
        queryFn: () => PatientService.getPatients(practiseId!, params),
        enabled: isAuthenticated === true && !!practiseId,
    });
};

export const useGetDoctorPatients = (params?: { page?: number; per_page?: number }): UseQueryResult<DoctorPatientsResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetDoctorPatients", params],
        queryFn: () => PatientService.getDoctorPatients(params),
        enabled: isAuthenticated === true,
    });
};

export const useGetPatientById = (patientId: number | string): UseQueryResult<PatientDetailResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPatientById", patientId],
        queryFn: () => PatientService.getPatientById(patientId),
        enabled: isAuthenticated === true && !!patientId,
    });
};

export const useGetPatientActivities = (practiseId: number | string | undefined, patientId: number | string, enabled: boolean = true): UseQueryResult<PatientActivitiesResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPatientActivities", practiseId, patientId],
        queryFn: () => PatientService.getPatientActivities(practiseId!, patientId),
        enabled: isAuthenticated === true && enabled && !!practiseId && !!patientId,
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useCreatePatient = (practiseId: string | number, onSuccess?: (data: PatientDetailResponse) => void, onError?: (error: Error) => void): UseMutationResult<PatientDetailResponse, Error, CreatePatientRequest> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePatientRequest) => PatientService.createPatient(practiseId, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["GetPatients"] });
            // Invalidate patient activities for the newly created patient
            queryClient.invalidateQueries({
                queryKey: ["GetPatientActivities"],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            console.log("===============useCreatePatient onError=====================");
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
