import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { TemplateDetailResponse, TemplateListResponse } from "./models/ResponseModels";

const {
    baseUrl,
    templates: { getById },
} = routes;

export const TemplateService = {
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
