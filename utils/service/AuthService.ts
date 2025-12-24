import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { storeTokens } from "../helper/tokenStorage";
import { AppleIdTokenBody, ChangeEmailBody, ChangePasswordBody, CompleteRegistrationBody, ForgetPasswordBody, InitiateRegistrationBody, LoginBody, ResetPasswordBody, UpdateProfileBody, UpdateProfileFullBody, VerifyOtpCodeBody } from "./models/RequestModels";
import { AppleConfigResponse, ChangeEmailResponse, ChangePasswordResponse, CompleteRegistrationResponse, ForgetPasswordResponse, InitiateRegistrationResponse, LoginResponse, LogoutResponse, MeResponse, OAuthRedirectResponse, ResetPasswordResponse, UpdateProfileResponse, VerifyOtpCodeResponse } from "./models/ResponseModels";

// Import the new service for practice operations

const {
    baseUrl,
    auth: { login, initiateRegistration, completeRegistration, logout, refresh, me, updateProfile, updateProfileFull, forgetPassword, verifyOtpCode, resetPassword, changeEmail, changePassword, google, googleCallback, googleIdToken, googleConfig, apple, appleCallback, appleIdToken, appleConfig },
} = routes;

export const AuthService = {
    // Authentication
    login: async (body: LoginBody): Promise<LoginResponse> => {
        try {
            const response: AxiosResponse<LoginResponse> = await axiosInstance.post(baseUrl + login(), body);
            await storeTokens(response.data.data.token);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Login failed");
            }
            throw error;
        }
    },

    initiateRegistration: async (body: InitiateRegistrationBody): Promise<InitiateRegistrationResponse> => {
        try {
            const response: AxiosResponse<InitiateRegistrationResponse> = await axiosInstance.post(baseUrl + initiateRegistration(), body);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Initiate registration failed");
            }
            throw error;
        }
    },

    completeRegistration: async (body: CompleteRegistrationBody): Promise<CompleteRegistrationResponse> => {
        try {
            const response: AxiosResponse<CompleteRegistrationResponse> = await axiosInstance.post(baseUrl + completeRegistration(), body);
            await storeTokens(response.data.data.token);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Complete registration failed");
            }
            throw error;
        }
    },

    logout: async (): Promise<LogoutResponse> => {
        try {
            const response: AxiosResponse<LogoutResponse> = await axiosInstance.post(baseUrl + logout());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Logout failed");
            }
            throw error;
        }
    },

    refresh: async (): Promise<LoginResponse> => {
        try {
            const { refreshToken } = await (await import("../helper/tokenStorage")).getTokens();
            if (!refreshToken) {
                throw new Error("Missing refresh token");
            }

            // NOTE: refresh endpoint is public on axiosInstance baseURL, but needs Bearer refresh token.
            const response: AxiosResponse<LoginResponse> = await axios.post(baseUrl + refresh(), {}, { headers: { Authorization: `Bearer ${refreshToken}` } });
            if (response.data.data.token) {
                await (await import("../helper/tokenStorage")).storeTokens(response.data.data.token);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Token refresh failed");
            }
            throw error;
        }
    },

    me: async (): Promise<MeResponse> => {
        try {
            const response: AxiosResponse<MeResponse> = await axiosInstance.get(baseUrl + me());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Fetching user info failed");
            }
            throw error;
        }
    },

    updateProfile: async (body: UpdateProfileBody): Promise<UpdateProfileResponse> => {
        try {
            const response: AxiosResponse<UpdateProfileResponse> = await axiosInstance.post(baseUrl + updateProfile(), body);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Update profile failed");
            }
            throw error;
        }
    },

    updateProfileFull: async (body: UpdateProfileFullBody): Promise<UpdateProfileResponse> => {
        try {
            const formData = new FormData();
            formData.append("first_name", body.first_name);
            formData.append("last_name", body.last_name);

            if (body.gender) {
                formData.append("gender", body.gender);
            }
            if (body.birth_date) {
                formData.append("birth_date", body.birth_date);
            }
            if (body.profile_photo) {
                // Support both File and string (Livewire temp filename)
                if (typeof body.profile_photo === "string") {
                    formData.append("profile_photo", body.profile_photo);
                } else {
                    formData.append("profile_photo", body.profile_photo);
                }
            }

            const response: AxiosResponse<UpdateProfileResponse> = await axiosInstance.put(baseUrl + updateProfileFull(), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Update profile failed");
            }
            throw error;
        }
    },

    // Password Reset
    forgetPassword: async (body: ForgetPasswordBody): Promise<ForgetPasswordResponse> => {
        try {
            const response: AxiosResponse<ForgetPasswordResponse> = await axiosInstance.post(baseUrl + forgetPassword(), body);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Forget password request failed");
            }
            throw error;
        }
    },

    verifyOtpCode: async (body: VerifyOtpCodeBody): Promise<VerifyOtpCodeResponse> => {
        try {
            const response: AxiosResponse<VerifyOtpCodeResponse> = await axiosInstance.post(baseUrl + verifyOtpCode(), body);
            if (response.data.data.token) {
                await storeTokens(response.data.data.token);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "OTP verification failed");
            }
            throw error;
        }
    },

    resetPassword: async (body: ResetPasswordBody): Promise<ResetPasswordResponse> => {
        try {
            const response: AxiosResponse<ResetPasswordResponse> = await axiosInstance.post(baseUrl + resetPassword(), body);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Reset password failed");
            }
            throw error;
        }
    },

    // OAuth - Google
    googleRedirect: async (): Promise<OAuthRedirectResponse> => {
        try {
            const response: AxiosResponse<OAuthRedirectResponse> = await axiosInstance.get(baseUrl + google());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Google redirect failed");
            }
            throw error;
        }
    },

    googleIdToken: async (id_token: string): Promise<LoginResponse> => {
        try {
            const response: AxiosResponse<LoginResponse> = await axiosInstance.post(baseUrl + googleIdToken(), { id_token });
            if (response.data.data.token) {
                storeTokens(response.data.data.token);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Google ID token authentication failed");
            }
            throw error;
        }
    },

    // OAuth - Apple
    appleRedirect: async (): Promise<OAuthRedirectResponse> => {
        try {
            const response: AxiosResponse<OAuthRedirectResponse> = await axiosInstance.get(baseUrl + apple());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Apple redirect failed");
            }
            throw error;
        }
    },

    appleCallback: async (code: string): Promise<LoginResponse> => {
        try {
            const response: AxiosResponse<LoginResponse> = await axiosInstance.post(baseUrl + appleCallback(), { code });
            if (response.data.data.token) {
                storeTokens(response.data.data.token);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Apple callback failed");
            }
            throw error;
        }
    },

    appleConfig: async (): Promise<AppleConfigResponse> => {
        try {
            const response: AxiosResponse<AppleConfigResponse> = await axiosInstance.get(baseUrl + appleConfig());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Apple config fetch failed");
            }
            throw error;
        }
    },

    appleIdToken: async (body: AppleIdTokenBody): Promise<LoginResponse> => {
        try {
            const response: AxiosResponse<LoginResponse> = await axiosInstance.post(baseUrl + appleIdToken(), body);
            if (response.data.data.token) {
                storeTokens(response.data.data.token);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Apple identity token authentication failed");
            }
            throw error;
        }
    },

    // OAuth Web Callbacks
    googleCallback: async (code: string, state?: string): Promise<LoginResponse> => {
        try {
            const response: AxiosResponse<LoginResponse> = await axiosInstance.post(baseUrl + googleCallback(), { code, state });
            if (response.data.data.token) {
                storeTokens(response.data.data.token);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Google callback failed");
            }
            throw error;
        }
    },

    googleConfig: async (): Promise<OAuthRedirectResponse> => {
        try {
            const response: AxiosResponse<OAuthRedirectResponse> = await axiosInstance.get(baseUrl + googleConfig());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Google config fetch failed");
            }
            throw error;
        }
    },

    appleCallbackWeb: async (code: string, state?: string): Promise<LoginResponse> => {
        try {
            const response: AxiosResponse<LoginResponse> = await axiosInstance.post(baseUrl + appleCallback(), { code, state });
            if (response.data.data.token) {
                storeTokens(response.data.data.token);
            }
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Apple callback failed");
            }
            throw error;
        }
    },

    // Profile Management
    changeEmail: async (body: ChangeEmailBody): Promise<ChangeEmailResponse> => {
        try {
            const response: AxiosResponse<ChangeEmailResponse> = await axiosInstance.post(baseUrl + changeEmail(), body);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Change email failed");
            }
            throw error;
        }
    },

    changePassword: async (body: ChangePasswordBody): Promise<ChangePasswordResponse> => {
        try {
            const response: AxiosResponse<ChangePasswordResponse> = await axiosInstance.post(baseUrl + changePassword(), body);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Change password failed");
            }
            throw error;
        }
    },
};
