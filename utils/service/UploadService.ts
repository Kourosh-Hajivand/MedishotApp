import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { TempUploadResponse } from "./models/ResponseModels";

const {
    baseUrl,
    upload: { tempUpload },
} = routes;

export const UploadService = {
    // Upload file to temporary storage
    tempUpload: async (file: File): Promise<TempUploadResponse> => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response: AxiosResponse<TempUploadResponse> = await axiosInstance.post(
                baseUrl + tempUpload(),
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to upload temporary file");
            }
            throw error;
        }
    },
};
