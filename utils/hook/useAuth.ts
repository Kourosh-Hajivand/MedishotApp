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
    // tokens را به useGetMe پاس بده تا از duplicate query جلوگیری شود
    const { data: me, isLoading: isMeLoading, error: meError, isError: isMeError } = useGetMe(hasToken && !isTokensLoading, tokens);
    const hasHandledError = useRef(false);
    
    // اگر token وجود دارد اما API call fail شود، token را invalidate کن
    useEffect(() => {
        if (hasToken && meError && !isMeLoading && !hasHandledError.current) {
            const axiosError = meError as AxiosError;
            const errorStatus = axiosError?.response?.status;
            if (errorStatus === 401 || errorStatus === 403) {
                // Token منقضی شده یا نامعتبر است
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
        
        // Reset error handler اگر error برطرف شد
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

    // محاسبه isProfileLoading: اگر token وجود دارد اما profile هنوز لود نشده
    // اگر query enabled نیست، نباید loading باشیم
    const isQueryEnabled = hasToken && !isTokensLoading;
    // اگر query enabled است و هنوز در حال loading است
    // اما اگر error داریم، نباید loading باشیم
    const isProfileLoading = isQueryEnabled && isMeLoading && !isMeError;

    return {
        isAuthenticated: isTokensLoading ? null : tokens?.accessToken ? true : false,
        isLoading: isTokensLoading,
        profile: me?.data,
        isProfileLoading,
        logout,
    };
};
