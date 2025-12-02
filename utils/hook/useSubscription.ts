import { SubscriptionService } from "@/utils/service";
import { SubscribeDto, SwapSubscriptionDto, UpdateAddonLimitDto } from "@/utils/service/models/RequestModels";
import { ApiResponse, PlanDetailResponse, PlanListResponse, SubscriptionStatusResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ============= Query Hooks (GET) =============

export const useGetPlans = (enabled: boolean = true): UseQueryResult<PlanListResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPlans"],
        queryFn: () => SubscriptionService.getPlans(),
        enabled: isAuthenticated === true && enabled,
    });
};

export const useGetPlanById = (planId: number, enabled: boolean = true): UseQueryResult<PlanDetailResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetPlanById", planId],
        queryFn: () => SubscriptionService.getPlanById(planId),
        enabled: isAuthenticated === true && enabled && !!planId,
    });
};

export const useGetSubscriptionStatus = (practiceId: number, enabled: boolean = true): UseQueryResult<SubscriptionStatusResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetSubscriptionStatus", practiceId],
        queryFn: () => SubscriptionService.getSubscriptionStatus(practiceId),
        enabled: isAuthenticated === true && enabled && !!practiceId,
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useSubscribe = (onSuccess?: (data: ApiResponse<any>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<any>, Error, { practiceId: number; data: SubscribeDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, data }: { practiceId: number; data: SubscribeDto }) => SubscriptionService.subscribe(practiceId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetSubscriptionStatus", variables.practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useCancelSubscription = (onSuccess?: (data: ApiResponse<string>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<string>, Error, number> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (practiceId: number) => SubscriptionService.cancelSubscription(practiceId),
        onSuccess: (data, practiceId) => {
            queryClient.invalidateQueries({
                queryKey: ["GetSubscriptionStatus", practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useResumeSubscription = (onSuccess?: (data: ApiResponse<string>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<string>, Error, number> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (practiceId: number) => SubscriptionService.resumeSubscription(practiceId),
        onSuccess: (data, practiceId) => {
            queryClient.invalidateQueries({
                queryKey: ["GetSubscriptionStatus", practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useSwapSubscription = (onSuccess?: (data: ApiResponse<any>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<any>, Error, { practiceId: number; data: SwapSubscriptionDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, data }: { practiceId: number; data: SwapSubscriptionDto }) => SubscriptionService.swapSubscription(practiceId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetSubscriptionStatus", variables.practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUpdateAddonLimit = (onSuccess?: (data: ApiResponse<any>) => void, onError?: (error: Error) => void): UseMutationResult<ApiResponse<any>, Error, { practiceId: number; data: UpdateAddonLimitDto }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ practiceId, data }: { practiceId: number; data: UpdateAddonLimitDto }) => SubscriptionService.updateAddonLimit(practiceId, data),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["GetSubscriptionStatus", variables.practiceId],
            });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
