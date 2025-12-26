import { TemplateService } from "@/utils/service";
import { TemplateDetailResponse, TemplateListResponse } from "@/utils/service/models/ResponseModels";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ============= Query Hooks (GET) =============

export const useGetTemplates = (params?: { search?: string; per_page?: number }, enabled: boolean = true): UseQueryResult<TemplateListResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetTemplates", params],
        queryFn: () => TemplateService.getTemplates(params),
        enabled: isAuthenticated === true && enabled,
    });
};

export const useGetTemplateById = (id: string | number, enabled: boolean = true): UseQueryResult<TemplateDetailResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetTemplateById", id],
        queryFn: () => TemplateService.getTemplateById(id),
        enabled: isAuthenticated === true && enabled && !!id,
    });
};
