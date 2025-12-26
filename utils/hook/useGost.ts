import { GostService } from "@/utils/service";
import { GostListResponse, GostDetailResponse } from "@/utils/service/models/ResponseModels";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ============= Query Hooks (GET) =============

export const useGetGosts = (params?: { search?: string; per_page?: number }, enabled: boolean = true): UseQueryResult<GostListResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetGosts", params],
        queryFn: () => GostService.getGosts(params),
        enabled: isAuthenticated === true && enabled,
    });
};

export const useGetGostById = (id: string | number, enabled: boolean = true): UseQueryResult<GostDetailResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetGostById", id],
        queryFn: () => GostService.getGostById(id),
        enabled: isAuthenticated === true && enabled && !!id,
    });
};

