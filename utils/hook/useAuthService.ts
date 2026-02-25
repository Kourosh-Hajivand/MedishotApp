import { QueryKeys } from "@/models/enums";
import { AuthService } from "@/utils/service";
import { AppleIdTokenBody, ChangeEmailBody, ChangePasswordBody, CompleteRegistrationBody, ForgetPasswordBody, InitiateRegistrationBody, LoginBody, ResetPasswordBody, UpdateProfileBody, UpdateProfileFullBody, VerifyOtpCodeBody } from "@/utils/service/models/RequestModels";
import { AppleConfigResponse, ChangeEmailResponse, ChangePasswordResponse, CompleteRegistrationResponse, ForgetPasswordResponse, InitiateRegistrationResponse, LoginResponse, LogoutResponse, MeResponse, OAuthRedirectResponse, ResetPasswordResponse, UpdateProfileResponse, VerifyOtpCodeResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { getTokens } from "../helper/tokenStorage";

// ============= Query Hooks (GET) =============

export const useGetMe = (enabled: boolean = true, tokens?: { accessToken: string | null; refreshToken: string | null }): UseQueryResult<MeResponse, Error> => {
    // Use query for cache; if tokens passed in, use those
    const tokensQuery = useQuery({
        queryKey: [QueryKeys.tokens],
        queryFn: getTokens,
    });

    // If tokens passed as param, use them; otherwise use query result
    const finalTokens = tokens || tokensQuery.data;
    const isAuthenticated = !!finalTokens?.accessToken;
    // If tokens passed, no need to wait for tokens query
    const isTokensLoading = !tokens && tokensQuery.isLoading;

    return useQuery({
        queryKey: ["GetMe"],
        queryFn: () => AuthService.me(),
        enabled: isAuthenticated && enabled && !isTokensLoading,
        retry: (failureCount, error) => {
            // Do not retry on 401 or 403
            const axiosError = error as AxiosError;
            const status = axiosError?.response?.status;
            if (status === 401 || status === 403) {
                return false;
            }
            return failureCount < 1; // Retry once only
        },
        retryDelay: 1000, // 1s delay between retries
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    });
};

export const useGetGoogleRedirect = (): UseQueryResult<OAuthRedirectResponse, Error> => {
    return useQuery({
        queryKey: ["GetGoogleRedirect"],
        queryFn: () => AuthService.googleRedirect(),
        enabled: false,
    });
};

export const useGetAppleRedirect = (): UseQueryResult<OAuthRedirectResponse, Error> => {
    return useQuery({
        queryKey: ["GetAppleRedirect"],
        queryFn: () => AuthService.appleRedirect(),
        enabled: false,
    });
};

export const useGetAppleConfig = (): UseQueryResult<AppleConfigResponse, Error> => {
    return useQuery({
        queryKey: ["GetAppleConfig"],
        queryFn: () => AuthService.appleConfig(),
    });
};

// ============= Mutation Hooks (POST/PUT/DELETE) =============

export const useLogin = (onSuccess?: (data: LoginResponse) => void, onError?: (error: Error) => void): UseMutationResult<LoginResponse, Error, LoginBody> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: LoginBody) => AuthService.login(data),
        onSuccess: async (data) => {
            await queryClient.refetchQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useInitiateRegistration = (onSuccess?: (data: InitiateRegistrationResponse) => void, onError?: (error: Error) => void): UseMutationResult<InitiateRegistrationResponse, Error, InitiateRegistrationBody> => {
    return useMutation({
        mutationFn: (data: InitiateRegistrationBody) => AuthService.initiateRegistration(data),
        onSuccess: (data) => {
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useCompleteRegistration = (onSuccess?: (data: CompleteRegistrationResponse) => void, onError?: (error: Error) => void): UseMutationResult<CompleteRegistrationResponse, Error, CompleteRegistrationBody> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CompleteRegistrationBody) => AuthService.completeRegistration(data),
        onSuccess: async (data) => {
            await queryClient.refetchQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useLogout = (onSuccess?: (data: LogoutResponse) => void, onError?: (error: Error) => void): UseMutationResult<LogoutResponse, Error, void> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => AuthService.logout(),
        onSuccess: (data) => {
            queryClient.clear();
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUpdateProfile = (onSuccess?: (data: UpdateProfileResponse) => void, onError?: (error: Error) => void): UseMutationResult<UpdateProfileResponse, Error, UpdateProfileBody> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateProfileBody) => AuthService.updateProfile(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useUpdateProfileFull = (onSuccess?: (data: UpdateProfileResponse) => void, onError?: (error: Error) => void): UseMutationResult<UpdateProfileResponse, Error, UpdateProfileFullBody> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateProfileFullBody) => AuthService.updateProfileFull(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

// Mobile OAuth Callbacks (ID Token)
export const useGoogleCallback = (onSuccess?: (data: LoginResponse) => void, onError?: (error: Error) => void): UseMutationResult<LoginResponse, Error, string> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id_token: string) => AuthService.googleIdToken(id_token),
        onSuccess: async (data) => {
            await queryClient.refetchQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useAppleCallback = (onSuccess?: (data: LoginResponse) => void, onError?: (error: Error) => void): UseMutationResult<LoginResponse, Error, AppleIdTokenBody> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (body: AppleIdTokenBody) => AuthService.appleIdToken(body),
        onSuccess: async (data) => {
            await queryClient.refetchQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

// Web OAuth Callbacks
export const useGoogleWebCallback = (onSuccess?: (data: LoginResponse) => void, onError?: (error: Error) => void): UseMutationResult<LoginResponse, Error, { code: string; state?: string }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ code, state }) => AuthService.googleCallback(code, state),
        onSuccess: async (data) => {
            await queryClient.refetchQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useAppleWebCallback = (onSuccess?: (data: LoginResponse) => void, onError?: (error: Error) => void): UseMutationResult<LoginResponse, Error, { code: string; state?: string }> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ code, state }) => AuthService.appleCallbackWeb(code, state),
        onSuccess: async (data) => {
            await queryClient.refetchQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useForgetPassword = (onSuccess?: (data: ForgetPasswordResponse) => void, onError?: (error: Error) => void): UseMutationResult<ForgetPasswordResponse, Error, ForgetPasswordBody> => {
    return useMutation({
        mutationFn: (data: ForgetPasswordBody) => AuthService.forgetPassword(data),
        onSuccess: (data) => {
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useVerifyOtpCode = (onSuccess?: (data: VerifyOtpCodeResponse) => void, onError?: (error: Error) => void): UseMutationResult<VerifyOtpCodeResponse, Error, VerifyOtpCodeBody> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: VerifyOtpCodeBody) => AuthService.verifyOtpCode(data),
        onSuccess: async (data) => {
            await queryClient.refetchQueries({ queryKey: [QueryKeys.tokens] });
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useResetPassword = (onSuccess?: (data: ResetPasswordResponse) => void, onError?: (error: Error) => void): UseMutationResult<ResetPasswordResponse, Error, ResetPasswordBody> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ResetPasswordBody) => AuthService.resetPassword(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            queryClient.invalidateQueries({ queryKey: [QueryKeys.tokens] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useChangeEmail = (onSuccess?: (data: ChangeEmailResponse) => void, onError?: (error: Error) => void): UseMutationResult<ChangeEmailResponse, Error, ChangeEmailBody> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: ChangeEmailBody) => AuthService.changeEmail(data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useChangePassword = (onSuccess?: (data: ChangePasswordResponse) => void, onError?: (error: Error) => void): UseMutationResult<ChangePasswordResponse, Error, ChangePasswordBody> => {
    return useMutation({
        mutationFn: (data: ChangePasswordBody) => AuthService.changePassword(data),
        onSuccess: (data) => {
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};
