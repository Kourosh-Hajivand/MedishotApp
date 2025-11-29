import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { PracticeService } from "../service/PracticeService";
import { RecentlyPhotosResponse } from "../service/models/ResponseModels";

export const useGetRecentlyPhotos = (practiseId: string | number, enabled: boolean = true): UseQueryResult<RecentlyPhotosResponse, Error> => {
    return useQuery({
        queryKey: ["GetRecentlyPhotos", practiseId],
        queryFn: () => PracticeService.getRecentlyPhotos(practiseId),
        enabled,
    });
};
