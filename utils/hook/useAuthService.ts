import { QueryKeys } from "@/models/enums";
import { AuthService } from "@/utils/service";
import { CompleteRegistrationBody, ForgetPasswordBody, InitiateRegistrationBody, LoginBody, ResetPasswordBody, UpdateProfileBody, VerifyOtpCodeBody } from "@/utils/service/models/RequestModels";
import { AppleConfigResponse, CompleteRegistrationResponse, ForgetPasswordResponse, InitiateRegistrationResponse, LoginResponse, LogoutResponse, MeResponse, OAuthRedirectResponse, ResetPasswordResponse, UpdateProfileResponse, VerifyOtpCodeResponse } from "@/utils/service/models/ResponseModels";
import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import { getTokens } from "../helper/tokenStorage";

// ============= Query Hooks (GET) =============

export const useGetMe = (enabled: boolean = true): UseQueryResult<MeResponse, Error> => {
    const { data: tokens } = useQuery({
        queryKey: [QueryKeys.tokens],
        queryFn: getTokens,
    });

    const isAuthenticated = !!tokens?.accessToken;
    return useQuery({
        queryKey: ["GetMe"],
        queryFn: () => AuthService.me(),
        enabled: isAuthenticated && enabled,
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
        onSuccess: (data) => {
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
        onSuccess: (data) => {
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

export const useGoogleCallback = (onSuccess?: (data: LoginResponse) => void, onError?: (error: Error) => void): UseMutationResult<LoginResponse, Error, string> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id_token: string) => AuthService.googleCallback(id_token),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["GetMe"] });
            onSuccess?.(data);
        },
        onError: (error) => {
            onError?.(error);
        },
    });
};

export const useAppleCallback = (onSuccess?: (data: LoginResponse) => void, onError?: (error: Error) => void): UseMutationResult<LoginResponse, Error, string> => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (code: string) => AuthService.appleCallback(code),
        onSuccess: (data) => {
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
        onSuccess: (data) => {
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
