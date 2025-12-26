import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { GostListResponse, GostDetailResponse } from "./models/ResponseModels";

const {
    baseUrl,
    gosts: { list, getById },
} = routes;

export const GostService = {
    // Get list of all gosts with optional search
    getGosts: async (params?: { search?: string; per_page?: number }): Promise<GostListResponse> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.search) {
                queryParams.append("search", params.search);
            }
            if (params?.per_page) {
                queryParams.append("per_page", String(params.per_page));
            }

            const url = baseUrl + list() + (queryParams.toString() ? `?${queryParams.toString()}` : "");
            const response: AxiosResponse<GostListResponse> = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get gosts");
            }
            throw error;
        }
    },

    // Get a specific gost by ID
    getGostById: async (id: string | number): Promise<GostDetailResponse> => {
        try {
            const response: AxiosResponse<GostDetailResponse> = await axiosInstance.get(baseUrl + getById(id));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get gost");
            }
            throw error;
        }
    },
};

