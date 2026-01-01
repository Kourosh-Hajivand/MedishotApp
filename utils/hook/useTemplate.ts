import { TemplateService } from "@/utils/service";
import { TemplateDetailResponse } from "@/utils/service/models/ResponseModels";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

// ============= Query Hooks (GET) =============

export const useGetTemplateById = (id: string | number, enabled: boolean = true): UseQueryResult<TemplateDetailResponse, Error> => {
    const { isAuthenticated } = useAuth();
    return useQuery({
        queryKey: ["GetTemplateById", id],
        queryFn: () => TemplateService.getTemplateById(id),
        enabled: isAuthenticated === true && enabled && !!id,
    });
};
