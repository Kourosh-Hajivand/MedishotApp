import { PracticeService } from "@/utils/service";
import { AddMemberDto, CreatePracticeDto, TransferOwnershipDto, UpdateMemberRoleDto, UpdatePracticeDto } from "@/utils/service/models/RequestModels";
import { ApiResponse, PracticeDetailResponse, PracticeListResponse, PracticeMembersResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";

// ============= Query Hooks (GET) =============

export const useGetPracticeList = (): UseQueryResult<PracticeListResponse, Error> => {
    return useQuery({
        queryKey: ["GetPracticeList"],
        queryFn: () => PracticeService.getPracticeList(),
    });
};

export const useGetPracticeById = (practiceId: number, enabled: boolean = true): UseQueryResult<PracticeDetailResponse, Error> => {
    return useQuery({
        queryKey: ["GetPracticeById", practiceId],
        queryFn: () => PracticeService.getPracticeById(practiceId),
        enabled: enabled && !!practiceId,
    });
};

export const useGetPracticeMembers = (practiceId: number, enabled: boolean = true): UseQueryResult<PracticeMembersResponse, Error> => {
    return useQuery({
        queryKey: ["GetPracticeMembers", practiceId],
        queryFn: () => PracticeService.getMembers(practiceId),
        enabled: enabled && !!practiceId,
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useCreatePractice = (onSuccess?: (data: PracticeDetailResponse) => void, onError?: (error: Error) => void): UseMutationResult<PracticeDetailResponse, Error, CreatePracticeDto> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePracticeDto) => PracticeService.createPractice(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUpdatePractice = (onSuccess?: (data: PracticeDetailResponse) => void, onError?: (error: Error) => void): UseMutationResult<PracticeDetailResponse, Error, { id: number; data: UpdatePracticeDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdatePracticeDto }) => PracticeService.updatePractice(id, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeById", variables.id],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useDeletePractice = (onSuccess?: (data: ApiResponse<string>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<string>, Error, number> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => PracticeService.deletePractice(id),
        onSuccess: (data, practiceId) => {
            queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
            queryClient.removeQueries({ queryKey: ["GetPracticeById", practiceId] });
            queryClient.removeQueries({ queryKey: ["GetPracticeMembers", practiceId] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useAddMember = (onSuccess?: (data: ApiResponse<any>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<any>, Error, { practiceId: number; data: AddMemberDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, data }: { practiceId: number; data: AddMemberDto }) => PracticeService.addMember(practiceId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeMembers", variables.practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUpdateMemberRole = (onSuccess?: (data: ApiResponse<any>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<any>, Error, { practiceId: number; memberId: number; data: UpdateMemberRoleDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, memberId, data }: { practiceId: number; memberId: number; data: UpdateMemberRoleDto }) => PracticeService.updateMemberRole(practiceId, memberId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeMembers", variables.practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useRemoveMember = (onSuccess?: (data: ApiResponse<string>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<string>, Error, { practiceId: number; memberId: number }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, memberId }: { practiceId: number; memberId: number }) => PracticeService.removeMember(practiceId, memberId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeMembers", variables.practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useLeavePractice = (onSuccess?: (data: ApiResponse<string>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<string>, Error, number> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (practiceId: number) => PracticeService.leavePractice(practiceId),
        onSuccess: (data, practiceId) => {
            queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
            queryClient.removeQueries({ queryKey: ["GetPracticeById", practiceId] });
            queryClient.removeQueries({ queryKey: ["GetPracticeMembers", practiceId] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useTransferOwnership = (onSuccess?: (data: ApiResponse<any>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<any>, Error, { practiceId: number; data: TransferOwnershipDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, data }: { practiceId: number; data: TransferOwnershipDto }) => PracticeService.transferOwnership(practiceId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeMembers", variables.practiceId],
            });
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeById", variables.practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
