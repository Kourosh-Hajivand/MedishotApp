import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { EditPatientMediaRequest, UploadPatientMediaRequest } from "./models/RequestModels";
import { PatientMediaBookmarkResponse, PatientMediaDeleteResponse, PatientMediaEditResponse, PatientMediaListResponse, PatientMediaRestoreResponse, PatientMediaTrashResponse, PatientMediaUploadResponse, TempUploadResponse } from "./models/ResponseModels";

const {
    baseUrl,
    patients: { getMedia, uploadMedia, deleteMedia, getTrashMedia, restoreMedia, editMedia, bookmarkMedia, unbookmarkMedia },
    media: { tempUpload },
} = routes;

const MediaService = {
    // Patient Media
    getPatientMedia: async (patientId: string | number): Promise<PatientMediaListResponse> => {
        try {
            const response: AxiosResponse<PatientMediaListResponse> = await axiosInstance.get(baseUrl + getMedia(patientId));
            return response.data;
        } catch (error) {
            console.error("Error in GetPatientMedia:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get patient media failed");
            }
            throw error;
        }
    },

    uploadPatientMedia: async (patientId: string | number, payload: UploadPatientMediaRequest): Promise<PatientMediaUploadResponse> => {
        try {
            const formData = new FormData();
            formData.append("media", payload.media);
            formData.append("type", payload.type);
            formData.append("data", JSON.stringify(payload.data));

            const response: AxiosResponse<PatientMediaUploadResponse> = await axiosInstance.post(baseUrl + uploadMedia(patientId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            console.error("Error in UploadPatientMedia:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Upload patient media failed");
            }
            throw error;
        }
    },

    deletePatientMedia: async (patientId: string | number, mediaId: string | number): Promise<PatientMediaDeleteResponse> => {
        try {
            const response: AxiosResponse<PatientMediaDeleteResponse> = await axiosInstance.delete(baseUrl + deleteMedia(patientId, mediaId));
            return response.data;
        } catch (error) {
            console.error("Error in DeletePatientMedia:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Delete patient media failed");
            }
            throw error;
        }
    },

    // Temporary File Upload
    tempUpload: async (file: File): Promise<TempUploadResponse> => {
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response: AxiosResponse<TempUploadResponse> = await axiosInstance.post(baseUrl + tempUpload(), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            console.error("Error in TempUpload:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Temporary upload failed");
            }
            throw error;
        }
    },

    // Media Trash Management
    getTrashMedia: async (patientId: string | number): Promise<PatientMediaTrashResponse> => {
        try {
            const response: AxiosResponse<PatientMediaTrashResponse> = await axiosInstance.get(baseUrl + getTrashMedia(patientId));
            return response.data;
        } catch (error) {
            console.error("Error in GetTrashMedia:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get trash media failed");
            }
            throw error;
        }
    },

    restoreMedia: async (mediaId: string | number): Promise<PatientMediaRestoreResponse> => {
        try {
            const response: AxiosResponse<PatientMediaRestoreResponse> = await axiosInstance.post(baseUrl + restoreMedia(mediaId));
            return response.data;
        } catch (error) {
            console.error("Error in RestoreMedia:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Restore media failed");
            }
            throw error;
        }
    },

    // Edit patient media image
    editPatientMedia: async (mediaId: string | number, payload: EditPatientMediaRequest): Promise<PatientMediaEditResponse> => {
        try {
            const formData = new FormData();
            formData.append("media", payload.media);

            const response: AxiosResponse<PatientMediaEditResponse> = await axiosInstance.post(baseUrl + editMedia(mediaId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            console.error("Error in EditPatientMedia:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Edit patient media failed");
            }
            throw error;
        }
    },

    // Bookmark patient media
    bookmarkMedia: async (mediaId: string | number): Promise<PatientMediaBookmarkResponse> => {
        try {
            const response: AxiosResponse<PatientMediaBookmarkResponse> = await axiosInstance.post(baseUrl + bookmarkMedia(mediaId));
            return response.data;
        } catch (error) {
            console.error("Error in BookmarkMedia:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Bookmark media failed");
            }
            throw error;
        }
    },

    // Unbookmark patient media
    unbookmarkMedia: async (mediaId: string | number): Promise<PatientMediaBookmarkResponse> => {
        try {
            const response: AxiosResponse<PatientMediaBookmarkResponse> = await axiosInstance.delete(baseUrl + unbookmarkMedia(mediaId));
            return response.data;
        } catch (error) {
            console.error("Error in UnbookmarkMedia:", error);
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Unbookmark media failed");
            }
            throw error;
        }
    },
};

export default MediaService;
