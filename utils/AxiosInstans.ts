import axios from "axios";
import { getTokens, removeTokens } from "./helper/tokenStorage";
import { AuthService } from "./service/AuthService";

import { router } from "expo-router";
import { routes } from "../routes/routes";

const axiosInstance = axios.create({
    baseURL: routes.baseUrl,
});

axiosInstance.interceptors.request.use(async (config) => {
    const tokens = await getTokens();
    console.log("tokens", tokens);
    if (tokens.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
});

axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Log detailed error information
        if (error.response) {
            console.error("Axios Error Response:", {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers,
            });
        } else if (error.request) {
            console.error("Axios Error Request:", error.request);
        } else {
            console.error("Axios Error Message:", error.message);
        }

        // Handle 401 Unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Try to refresh the token
                if (originalRequest.url?.includes("auth/refresh")) {
                    // If refresh endpoint itself fails, clear tokens and redirect
                    await removeTokens();
                    console.warn("Refresh token expired, redirecting to auth...");
                    throw error;
                }

                // Attempt to refresh the access token
                const tokens = await getTokens();
                if (tokens.refreshToken) {
                    console.log("Attempting to refresh token...");
                    const refreshResponse = await AuthService.refresh();

                    if (refreshResponse.data.token) {
                        // Update the original request with new token and retry
                        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
                        return axiosInstance(originalRequest);
                    }
                }
            } catch (refreshError) {
                console.warn("Token refresh failed, clearing tokens and redirecting to welcome...");
                await removeTokens();
                // Navigate to welcome page after token refresh fails
                router.replace("/welcome");
            }
        }

        throw error;
    },
);

export default axiosInstance;
