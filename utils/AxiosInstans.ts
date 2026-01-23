import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { router } from "expo-router";
import { routes } from "../routes/routes";
import { FailedRequest, storeFailedRequest } from "./helper/failedRequestStorage";
import { getTokens, removeTokens } from "./helper/tokenStorage";
import { useErrorStore } from "./hook/useErrorStore";
import { AuthService } from "./service/AuthService";

const axiosInstance = axios.create({
    baseURL: routes.baseUrl,
    timeout: 30000, // 30 ثانیه timeout برای تمام requests
});

// Flag to prevent multiple redirects to error page
let isRedirectingToError = false;

// Helper function to format request/response for logging
const formatRequestForLog = (config: AxiosRequestConfig) => {
    const method = (config.method || "GET").toUpperCase();
    const url = config.url || "";
    const fullUrl = config.baseURL && config.url ? `${config.baseURL}${config.url}` : config.url || "Unknown";
    
    let requestBody = null;
    if (config.data) {
        if (config.data instanceof FormData) {
            requestBody = "[FormData - Multipart]";
        } else if (typeof config.data === "string") {
            try {
                requestBody = JSON.parse(config.data);
            } catch {
                requestBody = config.data;
            }
        } else {
            requestBody = config.data;
        }
    }

    return {
        method,
        url: fullUrl,
        endpoint: url,
        headers: config.headers,
        params: config.params,
        body: requestBody,
    };
};

const formatResponseForLog = (response: AxiosResponse) => {
    const method = (response.config?.method || "GET").toUpperCase();
    const url = response.config?.url || "";
    const fullUrl = response.config?.baseURL && response.config?.url ? `${response.config.baseURL}${response.config.url}` : response.config?.url || "Unknown";
    
    return {
        method,
        url: fullUrl,
        endpoint: url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
    };
};

const formatErrorForLog = (error: AxiosError) => {
    const method = (error.config?.method || "GET").toUpperCase();
    const url = error.config?.url || "";
    const fullUrl = error.config?.baseURL ? `${error.config.baseURL}${url}` : url;

    if (error.response) {
        interface ErrorResponseData {
            message?: string;
            exception?: string;
            [key: string]: unknown;
        }
        const responseData = error.response.data as ErrorResponseData | undefined;
        return {
            method,
            url: fullUrl,
            endpoint: url,
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers,
            data: error.response.data,
            message: responseData?.message || responseData?.exception || error.message,
        };
    } else if (error.request) {
        return {
            method,
            url: fullUrl,
            endpoint: url,
            error: "No Response",
            message: error.message,
        };
    } else {
        return {
            method,
            url: fullUrl,
            endpoint: url,
            error: "Request Setup Error",
            message: error.message,
        };
    }
};

axiosInstance.interceptors.request.use(async (config) => {
    const tokens = await getTokens();
    if (tokens.accessToken) {
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }

    // Log request in development mode
    if (__DEV__) {
        const requestInfo = formatRequestForLog(config);
        console.group(`🌐 [${requestInfo.method}] ${requestInfo.endpoint}`);
        console.log("📍 Full URL:", requestInfo.url);
        console.log("📤 Request Headers:", requestInfo.headers);
        if (requestInfo.params) {
            console.log("🔗 Query Params:", requestInfo.params);
        }
        if (requestInfo.body) {
            console.log("📦 Request Body:", requestInfo.body);
        }
        console.groupEnd();
    }

    return config;
});

axiosInstance.interceptors.response.use(
    (response) => {
        // Reset redirect flag on successful response
        isRedirectingToError = false;

        // Log response in development mode
        if (__DEV__) {
            const responseInfo = formatResponseForLog(response);
            const statusColor = responseInfo.status >= 200 && responseInfo.status < 300 ? "✅" : responseInfo.status >= 300 && responseInfo.status < 400 ? "⚠️" : "❌";
            
            console.group(`${statusColor} [${responseInfo.method}] ${responseInfo.endpoint} - ${responseInfo.status} ${responseInfo.statusText}`);
            console.log("📍 Full URL:", responseInfo.url);
            console.log("📥 Response Headers:", responseInfo.headers);
            console.log("📥 Response Data:", responseInfo.data);
            console.groupEnd();
        }

        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Log error in development mode
        if (__DEV__) {
            const errorInfo = formatErrorForLog(error);
            console.group(`❌ [${errorInfo.method}] ${errorInfo.endpoint} - Error`);
            console.log("📍 Full URL:", errorInfo.url);
            if (error.response) {
                console.log("📥 Status:", errorInfo.status, errorInfo.statusText);
                console.log("📥 Response Headers:", errorInfo.headers);
                console.log("📥 Response Data:", errorInfo.data);
                console.log("💬 Error Message:", errorInfo.message);
            } else if (error.request) {
                console.log("⚠️ No Response Received");
                console.log("💬 Error Message:", errorInfo.message);
            } else {
                console.log("⚠️ Request Setup Error");
                console.log("💬 Error Message:", errorInfo.message);
            }
            console.groupEnd();
        }

        // Handle 500 Internal Server Error
        if (error.response?.status === 500 && !isRedirectingToError) {
            isRedirectingToError = true;

            // Store failed request for retry
            let failedRequest: FailedRequest | null = null;
            if (originalRequest) {
                failedRequest = {
                    url: originalRequest.url || "",
                    method: (originalRequest.method || "GET").toUpperCase(),
                    baseURL: originalRequest.baseURL,
                    data: originalRequest.data,
                    params: originalRequest.params,
                    headers: originalRequest.headers as Record<string, string>,
                };
                await storeFailedRequest(failedRequest);
            }

            // Show error modal instead of navigating
            useErrorStore.getState().setServerError(true, failedRequest);

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
                    throw error;
                }

                // Attempt to refresh the access token
                const tokens = await getTokens();
                if (tokens.refreshToken) {
                    const refreshResponse = await AuthService.refresh();

                    if (refreshResponse.data.token) {
                        // Update the original request with new token and retry
                        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
                        return axiosInstance(originalRequest);
                    }
                }
            } catch (refreshError) {
                await removeTokens();
                // Navigate to welcome page after token refresh fails
                router.replace("/welcome");
            }
        }

        throw error;
    },
);

export default axiosInstance;
