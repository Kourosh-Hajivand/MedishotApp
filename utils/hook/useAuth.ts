import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { QueryKeys } from "../../models/enums";
import { getTokens, removeTokens } from "../helper/tokenStorage";
import { useGetMe } from "./useAuthService";

export const useAuth = () => {
    const queryClient = useQueryClient();
    const { data: tokens, isLoading: isTokensLoading } = useQuery({
        queryKey: [QueryKeys.tokens],
        queryFn: getTokens,
    });

    const { data: me, isLoading: isMeLoading } = useGetMe();
    const logout = () => {
        removeTokens();
        queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.profile] });
        router.replace("/welcome");
    };

    return {
        isAuthenticated: isTokensLoading ? null : tokens?.accessToken ? true : false,
        isLoading: isTokensLoading,
        profile: me?.data,
        isProfileLoading: isMeLoading,
        logout,
    };
};
