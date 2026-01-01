import axios from "axios";
import { router } from "expo-router";
import { routes } from "../routes/routes";
import { storeFailedRequest } from "./helper/failedRequestStorage";
import { getTokens, removeTokens } from "./helper/tokenStorage";
import { AuthService } from "./service/AuthService";

const axiosInstance = axios.create({
    baseURL: routes.baseUrl,
    timeout: 30000, // 30 ثانیه timeout برای تمام requests
});

// Flag to prevent multiple redirects to error page
let isRedirectingToError = false;

axiosInstance.interceptors.request.use(async (config) => {
    const tokens = await getTokens();
    if (tokens.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    // Log request URL and body
    const method = config.method?.toUpperCase() || "GET";
    const fullUrl = config.baseURL && config.url ? `${config.baseURL}${config.url}` : config.url || "Unknown";

    // Extract request body
    let requestBody = null;
    if (config.data) {
        // Handle FormData
        if (config.data instanceof FormData) {
            // For FormData, we can't easily serialize it, so just log that it's FormData
            requestBody = "[FormData]";
        } else if (typeof config.data === "string") {
            // Try to parse if it's a JSON string
            try {
                requestBody = JSON.parse(config.data);
            } catch {
                requestBody = config.data;
            }
        } else {
            requestBody = config.data;
        }
    }

    // Log request details
    console.log(`📤 [${method}] ${fullUrl}`);
    if (requestBody && requestBody !== "[FormData]") {
        console.log("📤 Request Body:", requestBody);
    } else if (requestBody === "[FormData]") {
        console.log("📤 Request Body: [FormData - Multipart]");
    }

    return config;
});

axiosInstance.interceptors.response.use(
    (response) => {
        // Reset redirect flag on successful response
        isRedirectingToError = false;

        // Log response details
        const method = response.config?.method?.toUpperCase() || "GET";
        const fullUrl = response.config?.baseURL && response.config?.url ? `${response.config.baseURL}${response.config.url}` : response.config?.url || "Unknown";
        const status = response.status;

        console.log(`📥 [${method}] ${fullUrl} - Status: ${status}`);
        if (response.data) {
            console.log(`📥 Response Body [${method} ${fullUrl}]:`, response.data);
        }

        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Log detailed error information
        if (error.response) {
            const requestUrl = error.config?.url || "Unknown";
            const requestMethod = error.config?.method?.toUpperCase() || "Unknown";
            const fullUrl = error.config?.baseURL ? `${error.config.baseURL}${requestUrl}` : requestUrl;

            console.error("🚨 Axios Error Response:", {
                status: error.response.status,
                method: requestMethod,
                url: fullUrl,
                endpoint: requestUrl,
                data: error.response.data,
                headers: error.response.headers,
            });

            // Log a more readable error message
            console.error(`❌ API Error [${requestMethod}] ${fullUrl}:`, error.response.data?.message || error.response.data?.exception || "Unknown error");
        } else if (error.request) {
            const requestUrl = error.config?.url || "Unknown";
            const requestMethod = error.config?.method?.toUpperCase() || "Unknown";
            const fullUrl = error.config?.baseURL ? `${error.config.baseURL}${requestUrl}` : requestUrl;

            console.error("🚨 Axios Error Request (No Response):", {
                method: requestMethod,
                url: fullUrl,
                endpoint: requestUrl,
            });
        } else {
            console.error("🚨 Axios Error Message:", error.message);
        }

        // Handle 500 Internal Server Error
        if (error.response?.status === 500 && !isRedirectingToError) {
            isRedirectingToError = true;
            console.warn("Server error (500) detected, redirecting to error page...");

            // Store failed request for retry
            if (originalRequest) {
                const failedRequest = {
                    url: originalRequest.url || "",
                    method: (originalRequest.method || "GET").toUpperCase(),
                    baseURL: originalRequest.baseURL,
                    data: originalRequest.data,
                    params: originalRequest.params,
                    headers: originalRequest.headers as Record<string, string>,
                };
                await storeFailedRequest(failedRequest);
            }

            // Navigate to error page
            try {
                router.replace("/error");
            } catch (navError) {
                console.error("Failed to navigate to error page:", navError);
            }

            // Reset flag after a delay to allow retry
            setTimeout(() => {
                isRedirectingToError = false;
            }, 2000);

            throw error;
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
