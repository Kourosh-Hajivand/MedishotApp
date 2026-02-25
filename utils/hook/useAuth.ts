import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { AxiosError } from "axios";
import { useEffect, useRef } from "react";
import { QueryKeys } from "../../models/enums";
import { getTokens, removeTokens } from "../helper/tokenStorage";
import { useGetMe } from "./useAuthService";
import { useProfileStore } from "./useProfileStore";

export const useAuth = () => {
    const queryClient = useQueryClient();
    const { data: tokens, isLoading: isTokensLoading } = useQuery({
        queryKey: [QueryKeys.tokens],
        queryFn: getTokens,
    });

    const hasToken = !!tokens?.accessToken;
    // Pass tokens to useGetMe to avoid duplicate query
    const { data: me, isLoading: isMeLoading, error: meError, isError: isMeError } = useGetMe(hasToken && !isTokensLoading, tokens);
    const hasHandledError = useRef(false);
    
    // If token exists but API call fails, invalidate token
    useEffect(() => {
        if (hasToken && meError && !isMeLoading && !hasHandledError.current) {
            const axiosError = meError as AxiosError;
            const errorStatus = axiosError?.response?.status;
            if (errorStatus === 401 || errorStatus === 403) {
                // Token expired or invalid
                hasHandledError.current = true;
                removeTokens()
                    .then(() => {
                        queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
                        queryClient.invalidateQueries({ queryKey: [QueryKeys.profile] });
                        queryClient.invalidateQueries({ queryKey: ["GetMe"] });
                    })
                    .catch(() => {
                        // Error handled silently
                    });
            }
        }
        
        // Reset error handler when error is cleared
        if (!meError) {
            hasHandledError.current = false;
        }
    }, [hasToken, meError, isMeLoading, queryClient]);

    const logout = async () => {
        // Reset profile store (practice, doctor, viewMode)
        await useProfileStore.getState().resetSelection();
        
        // Remove tokens
        removeTokens();
        
        // Invalidate all queries
        queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.profile] });
        queryClient.invalidateQueries({ queryKey: ["GetMe"] });
        queryClient.clear(); // Clear all cached queries
        
        // Navigate to welcome
        router.replace("/welcome");
    };

    // Compute isProfileLoading: token exists but profile not yet loaded
    // If query not enabled, we should not be loading
    const isQueryEnabled = hasToken && !isTokensLoading;
    // If query enabled and still loading
    // But if we have error, do not show loading
    const isProfileLoading = isQueryEnabled && isMeLoading && !isMeError;

    return {
        isAuthenticated: isTokensLoading ? null : tokens?.accessToken ? true : false,
        isLoading: isTokensLoading,
        profile: me?.data,
        isProfileLoading,
        logout,
    };
};
