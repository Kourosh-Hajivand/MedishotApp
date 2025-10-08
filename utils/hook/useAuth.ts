import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QueryKeys } from "../../models/enums";
import { getTokens, removeTokens } from "../helper/tokenStorage";
import { AuthService } from "../service/AuthService";

export const useAuth = () => {
    const queryClient = useQueryClient();
    const { data: tokens, isLoading: isTokensLoading } = useQuery({
        queryKey: [QueryKeys.tokens],
        queryFn: getTokens,
    });
    const { data: profile, isLoading: isProfileLoading } = useQuery({
        queryKey: [QueryKeys.profile],
        queryFn: () => AuthService.getProfile(),
        enabled: !!tokens?.accessToken,
    });
    const logout = () => {
        removeTokens();
        queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.profile] });
    };

    return {
        isAuthenticated: tokens?.accessToken ? true : false,
        isLoading: isTokensLoading,
        profile: profile?.data,
        isProfileLoading,
        logout,
    };
};
