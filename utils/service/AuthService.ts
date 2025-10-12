import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { storeTokens } from "../helper/tokenStorage";
import { CompleteRegistrationBody, ForgetPasswordBody, InitiateRegistrationBody, LoginBody, ResetPasswordBody, UpdateProfileBody } from "./models/RequestModels";
import { AppleConfigResponse, CompleteRegistrationResponse, ForgetPasswordResponse, InitiateRegistrationResponse, LoginResponse, LogoutResponse, MeResponse, OAuthRedirectResponse, ResetPasswordResponse, UpdateProfileResponse } from "./models/ResponseModels";

const {
    baseUrl,
    auth: { login, initiateRegistration, completeRegistration, logout, me, updateProfile, forgetPassword, resetPassword, google, googleCallback, apple, appleCallback, appleConfig },
} = routes;

export const AuthService = {
    // Authentication
    login: async (body: LoginBody): Promise<LoginResponse> => {
        try {
            const response: AxiosResponse<LoginResponse> = await axiosInstance.post(baseUrl + login(), body);
            storeTokens(response.data.data.token);
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
            storeTokens(response.data.data.token);
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

    googleCallback: async (code: string): Promise<LoginResponse> => {
        try {
            const response: AxiosResponse<LoginResponse> = await axiosInstance.get(baseUrl + googleCallback(), { params: { code } });
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
};
