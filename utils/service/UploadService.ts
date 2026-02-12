import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { TempUploadResponse } from "./models/ResponseModels";

const { upload: { tempUpload } } = routes;

const isRetryableTempUploadError = (err: unknown): boolean => {
    if (!axios.isAxiosError(err)) return false;
    if (err.response) return false;
    const msg = (err.message || "").toLowerCase();
    return (
        err.code === "ECONNABORTED" ||
        err.code === "ETIMEDOUT" ||
        err.code === "ERR_NETWORK" ||
        msg.includes("timeout") ||
        msg.includes("network")
    );
};

export const UploadService = {
    // Upload file to temporary storage (with one retry on timeout/network)
    tempUpload: async (file: File): Promise<TempUploadResponse> => {
        const attempt = async () => {
            const formData = new FormData();
            formData.append("file", file);
            const response = await axiosInstance.post(tempUpload(), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return (response as AxiosResponse<TempUploadResponse>).data;
        };
        try {
            return await attempt();
        } catch (error) {
            if (isRetryableTempUploadError(error)) {
                try {
                    return await attempt();
                } catch (retryError) {
                    if (axios.isAxiosError(retryError) && retryError.response) {
                        throw new Error(retryError.response.data?.message || "Failed to upload temporary file");
                    }
                    throw retryError;
                }
            }
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to upload temporary file");
            }
            throw error;
        }
    },
};
