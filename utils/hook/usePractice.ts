import { QueryKeys } from "@/models/enums";
import { PracticeService } from "@/utils/service";
import { AddMemberDto, CreatePracticeDto, CreateTagDto, CreateTemplateDto, TransferOwnershipDto, UpdateMemberRoleDto, UpdatePracticeDto, UpdateTagDto, UpdateTemplateDto } from "@/utils/service/models/RequestModels";
import { ApiResponse, PracticeDetailResponse, PracticeListResponse, PracticeMembersResponse, PracticeStatsResponse, PracticeTagResponse, PracticeTagsResponse, PracticeTemplateResponse, PracticeTemplatesResponse, RecentlyPhotosResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ============= Query Hooks (GET) =============

export const useGetPracticeList = (enabled: boolean = true): UseQueryResult<PracticeListResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPracticeList"],
        queryFn: () => PracticeService.getPracticeList(),
        enabled: isAuthenticated === true && enabled,
    });
};

export const useGetPracticeById = (practiceId: number, enabled: boolean = true): UseQueryResult<PracticeDetailResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPracticeById", practiceId],
        queryFn: () => PracticeService.getPracticeById(practiceId),
        enabled: isAuthenticated === true && enabled && !!practiceId,
    });
};

export const useGetPracticeMembers = (practiceId: number, enabled: boolean = true): UseQueryResult<PracticeMembersResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPracticeMembers", practiceId],
        queryFn: () => PracticeService.getMembers(practiceId),
        enabled: isAuthenticated === true && enabled && !!practiceId,
    });
};

export const useGetArchivedMedia = (practiceId: number, enabled: boolean = true): UseQueryResult<RecentlyPhotosResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetArchivedMedia", practiceId],
        queryFn: () => PracticeService.getArchivedMedia(practiceId),
        enabled: isAuthenticated === true && enabled && !!practiceId,
    });
};

export const useGetPracticeMember = (practiceId: number, memberId: string, enabled: boolean = true): UseQueryResult<ApiResponse<any>, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPracticeMember", practiceId, memberId],
        queryFn: () => PracticeService.getMember(practiceId, memberId),
        enabled: isAuthenticated === true && enabled && !!practiceId && !!memberId,
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useCreatePractice = (onSuccess?: (data: PracticeDetailResponse) => void, onError?: (error: Error) => void): UseMutationResult<PracticeDetailResponse, Error, CreatePracticeDto> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePracticeDto) => PracticeService.createPractice(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["GetPracticeList"] });
            queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: [QueryKeys.profile] });
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

// ============= Practice Statistics =============

export const useGetRecentlyPhotos = (practiceId: number, enabled: boolean = true): UseQueryResult<RecentlyPhotosResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetRecentlyPhotos", practiceId],
        queryFn: () => PracticeService.getRecentlyPhotos(practiceId),
        enabled: isAuthenticated === true && enabled && !!practiceId,
    });
};

export const useGetPatientsCount = (practiceId: number, type: string, enabled: boolean = true): UseQueryResult<PracticeStatsResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPatientsCount", practiceId, type],
        queryFn: () => PracticeService.getPatientsCount(practiceId, type),
        enabled: isAuthenticated === true && enabled && !!practiceId,
    });
};

// ============= Practice Tags =============

export const useGetPracticeTags = (practiceId: number, enabled: boolean = true): UseQueryResult<PracticeTagsResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPracticeTags", practiceId],
        queryFn: () => PracticeService.getTags(practiceId),
        enabled: isAuthenticated === true && enabled && !!practiceId,
    });
};

export const useGetPracticeTag = (practiceId: number, tagId: number, enabled: boolean = true): UseQueryResult<PracticeTagResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPracticeTag", practiceId, tagId],
        queryFn: () => PracticeService.getTag(practiceId, tagId),
        enabled: isAuthenticated === true && enabled && !!practiceId && !!tagId,
    });
};

export const useCreatePracticeTag = (onSuccess?: (data: PracticeTagResponse) => void, onError?: (error: Error) => void): UseMutationResult<PracticeTagResponse, Error, { practiceId: number; data: CreateTagDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, data }: { practiceId: number; data: CreateTagDto }) => PracticeService.createTag(practiceId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeTags", variables.practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUpdatePracticeTag = (onSuccess?: (data: PracticeTagResponse) => void, onError?: (error: Error) => void): UseMutationResult<PracticeTagResponse, Error, { practiceId: number; tagId: number; data: UpdateTagDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, tagId, data }: { practiceId: number; tagId: number; data: UpdateTagDto }) => PracticeService.updateTag(practiceId, tagId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeTags", variables.practiceId],
            });
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeTag", variables.practiceId, variables.tagId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useDeletePracticeTag = (onSuccess?: (data: ApiResponse<string>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<string>, Error, { practiceId: number; tagId: number }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, tagId }: { practiceId: number; tagId: number }) => PracticeService.deleteTag(practiceId, tagId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeTags", variables.practiceId],
            });
            queryClient.removeQueries({
                queryKey: ["GetPracticeTag", variables.practiceId, variables.tagId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

// ============= Practice Templates =============

export const useGetPracticeTemplates = (practiceId: number, enabled: boolean = true): UseQueryResult<PracticeTemplatesResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPracticeTemplates", practiceId],
        queryFn: () => PracticeService.getTemplates(practiceId),
        enabled: isAuthenticated === true && enabled && !!practiceId,
    });
};

export const useGetPracticeTemplate = (practiceId: number, templateId: number, enabled: boolean = true): UseQueryResult<PracticeTemplateResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPracticeTemplate", practiceId, templateId],
        queryFn: () => PracticeService.getTemplate(practiceId, templateId),
        enabled: isAuthenticated === true && enabled && !!practiceId && !!templateId,
    });
};

export const useCreatePracticeTemplate = (onSuccess?: (data: PracticeTemplateResponse) => void, onError?: (error: Error) => void): UseMutationResult<PracticeTemplateResponse, Error, { practiceId: number; data: CreateTemplateDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, data }: { practiceId: number; data: CreateTemplateDto }) => PracticeService.createTemplate(practiceId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeTemplates", variables.practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUpdatePracticeTemplate = (onSuccess?: (data: PracticeTemplateResponse) => void, onError?: (error: Error) => void): UseMutationResult<PracticeTemplateResponse, Error, { practiceId: number; templateId: number; data: UpdateTemplateDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, templateId, data }: { practiceId: number; templateId: number; data: UpdateTemplateDto }) => PracticeService.updateTemplate(practiceId, templateId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeTemplates", variables.practiceId],
            });
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeTemplate", variables.practiceId, variables.templateId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useDeletePracticeTemplate = (onSuccess?: (data: ApiResponse<string>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<string>, Error, { practiceId: number; templateId: number }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, templateId }: { practiceId: number; templateId: number }) => PracticeService.deleteTemplate(practiceId, templateId),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetPracticeTemplates", variables.practiceId],
            });
            queryClient.removeQueries({
                queryKey: ["GetPracticeTemplate", variables.practiceId, variables.templateId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
