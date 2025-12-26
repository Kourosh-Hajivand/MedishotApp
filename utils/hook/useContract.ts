import { ContractService } from "@/utils/service";
import { CreateContractDto } from "@/utils/service/models/RequestModels";
import { ContractTemplateDetailResponse, ContractTemplateListResponse, CreateContractResponse, PatientContractDetailResponse, PatientContractListResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ============= Query Hooks (GET) =============

export const useGetContractTemplates = (enabled: boolean = true): UseQueryResult<ContractTemplateListResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetContractTemplates"],
        queryFn: () => ContractService.getContractTemplates(),
        enabled: isAuthenticated === true && enabled,
    });
};

export const useGetContractTemplate = (templateId: string | number, enabled: boolean = true): UseQueryResult<ContractTemplateDetailResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetContractTemplate", templateId],
        queryFn: () => ContractService.getContractTemplate(templateId),
        enabled: isAuthenticated === true && enabled && !!templateId,
    });
};

export const useGetPatientContracts = (patientId: string | number, enabled: boolean = true): UseQueryResult<PatientContractListResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPatientContracts", patientId],
        queryFn: () => ContractService.getPatientContracts(patientId),
        enabled: isAuthenticated === true && enabled && !!patientId,
    });
};

export const useGetContract = (contractId: string | number, enabled: boolean = true): UseQueryResult<PatientContractDetailResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetContract", contractId],
        queryFn: () => ContractService.getContract(contractId),
        enabled: isAuthenticated === true && enabled && !!contractId,
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useCreateContract = (onSuccess?: (data: CreateContractResponse) => void, onError?: (error: Error) => void): UseMutationResult<CreateContractResponse, Error, { patientId: string | number; data: CreateContractDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ patientId, data }: { patientId: string | number; data: CreateContractDto }) => ContractService.createContract(patientId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPatientContracts", variables.patientId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
