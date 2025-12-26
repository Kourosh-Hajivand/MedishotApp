import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { SubscribeDto, SwapSubscriptionDto, UpdateAddonLimitDto, CheckoutDto } from "./models/RequestModels";
import { ApiResponse, PlanDetailResponse, PlanListResponse, SubscriptionStatusResponse, CheckoutSessionResponse, CheckoutSuccessResponse } from "./models/ResponseModels";

const {
    baseUrl,
    plans: { list: listPlans, getById: getPlanById },
    subscriptions: { getStatus, subscribe, checkout, checkoutSuccess, checkoutCancel, cancel, resume, swap, updateAddonLimit },
} = routes;

export const SubscriptionService = {
    // ============= Plans =============

    // Get list of all plans
    getPlans: async (): Promise<PlanListResponse> => {
        try {
            const response: AxiosResponse<PlanListResponse> = await axiosInstance.get(baseUrl + listPlans());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get plans");
            }
            throw error;
        }
    },

    // Get plan by ID
    getPlanById: async (planId: number): Promise<PlanDetailResponse> => {
        try {
            const response: AxiosResponse<PlanDetailResponse> = await axiosInstance.get(baseUrl + getPlanById(planId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get plan");
            }
            throw error;
        }
    },

    // ============= Subscription Management =============

    // Get subscription status
    getSubscriptionStatus: async (practiceId: number): Promise<SubscriptionStatusResponse> => {
        try {
            const response: AxiosResponse<SubscriptionStatusResponse> = await axiosInstance.get(baseUrl + getStatus(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get subscription status");
            }
            throw error;
        }
    },

    // Subscribe to a plan
    subscribe: async (practiceId: number, data: SubscribeDto): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(baseUrl + subscribe(practiceId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to subscribe");
            }
            throw error;
        }
    },

    // Cancel subscription
    cancelSubscription: async (practiceId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.post(baseUrl + cancel(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to cancel subscription");
            }
            throw error;
        }
    },

    // Resume subscription
    resumeSubscription: async (practiceId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.post(baseUrl + resume(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to resume subscription");
            }
            throw error;
        }
    },

    // Swap subscription plan
    swapSubscription: async (practiceId: number, data: SwapSubscriptionDto): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(baseUrl + swap(practiceId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to swap subscription");
            }
            throw error;
        }
    },

    // Update addon limit
    updateAddonLimit: async (practiceId: number, data: UpdateAddonLimitDto): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(baseUrl + updateAddonLimit(practiceId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to update addon limit");
            }
            throw error;
        }
    },

    // ============= Checkout =============

    // Create checkout session
    createCheckout: async (practiceId: number, data: CheckoutDto): Promise<CheckoutSessionResponse> => {
        try {
            const response: AxiosResponse<CheckoutSessionResponse> = await axiosInstance.post(baseUrl + checkout(practiceId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to create checkout session");
            }
            throw error;
        }
    },

    // Handle successful checkout
    checkoutSuccess: async (practiceId: number, sessionId: string): Promise<CheckoutSuccessResponse> => {
        try {
            const response: AxiosResponse<CheckoutSuccessResponse> = await axiosInstance.get(
                baseUrl + checkoutSuccess(practiceId) + `?session_id=${sessionId}`
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to process checkout success");
            }
            throw error;
        }
    },

    // Handle cancelled checkout
    checkoutCancel: async (practiceId: number, planId?: number): Promise<void> => {
        try {
            const url = baseUrl + checkoutCancel(practiceId) + (planId ? `?plan_id=${planId}` : "");
            await axiosInstance.get(url);
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to process checkout cancel");
            }
            throw error;
        }
    },
};
