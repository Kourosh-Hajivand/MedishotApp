import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { TemplateListResponse, TemplateDetailResponse } from "./models/ResponseModels";

const {
    baseUrl,
    templates: { list, getById },
} = routes;

export const TemplateService = {
    // Get list of all templates with optional search
    getTemplates: async (params?: { search?: string; per_page?: number }): Promise<TemplateListResponse> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.search) {
                queryParams.append("search", params.search);
            }
            if (params?.per_page) {
                queryParams.append("per_page", String(params.per_page));
            }

            const url = baseUrl + list() + (queryParams.toString() ? `?${queryParams.toString()}` : "");
            const response: AxiosResponse<TemplateListResponse> = await axiosInstance.get(url);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get templates");
            }
            throw error;
        }
    },

    // Get a specific template by ID
    getTemplateById: async (id: string | number): Promise<TemplateDetailResponse> => {
        try {
            const response: AxiosResponse<TemplateDetailResponse> = await axiosInstance.get(baseUrl + getById(id));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get template");
            }
            throw error;
        }
    },
};

