import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { EditPatientMediaRequest, UploadMediaWithTemplateRequest, UploadPatientMediaRequest } from "./models/RequestModels";
import { PatientMediaAlbumsResponse, PatientMediaBookmarkResponse, PatientMediaDeleteResponse, PatientMediaEditResponse, PatientMediaListResponse, PatientMediaRestoreResponse, PatientMediaTrashResponse, PatientMediaUploadResponse, PatientMediaWithTemplateResponse, TempUploadResponse } from "./models/ResponseModels";

const {
    baseUrl,
    patients: { getMedia, getMediaAlbums, uploadMedia, uploadMediaWithTemplate, deleteMedia, getTrashMedia, restoreMedia, editMedia, bookmarkMedia, unbookmarkMedia },
    media: { tempUpload },
} = routes;

const MediaService = {
    // Patient Media
    getPatientMedia: async (patientId: string | number): Promise<PatientMediaListResponse> => {
        try {
            const response: AxiosResponse<PatientMediaListResponse> = await axiosInstance.get(baseUrl + getMedia(patientId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get patient media failed");
            }
            throw error;
        }
    },

    // Get patient media grouped by gosts (albums)
    getPatientMediaAlbums: async (patientId: string | number): Promise<PatientMediaAlbumsResponse> => {
        try {
            const response: AxiosResponse<PatientMediaAlbumsResponse> = await axiosInstance.get(baseUrl + getMediaAlbums(patientId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get patient media albums failed");
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
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Upload patient media failed");
            }
            throw error;
        }
    },

    uploadPatientMediaWithTemplate: async (patientId: string | number, payload: UploadMediaWithTemplateRequest): Promise<PatientMediaWithTemplateResponse> => {
        try {
            const formData = new FormData();
            formData.append("template_id", String(payload.template_id));

            if (payload.type) {
                formData.append("type", payload.type);
            }

            if (payload.data) {
                formData.append("data", typeof payload.data === "string" ? payload.data : JSON.stringify(payload.data));
            }

            // Add optional media field (composite/preview image)
            if (payload.media) {
                formData.append("media", payload.media);
            }

            payload.images.forEach((image, index) => {
                formData.append(`images[${index}][gost_id]`, String(image.gost_id));
                formData.append(`images[${index}][media]`, image.media);
                if (image.notes) {
                    formData.append(`images[${index}][notes]`, image.notes);
                }
            });

            const response: AxiosResponse<PatientMediaWithTemplateResponse> = await axiosInstance.post(baseUrl + uploadMediaWithTemplate(patientId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Upload patient media with template failed");
            }
            throw error;
        }
    },

    deletePatientMedia: async (patientId: string | number, mediaId: string | number): Promise<PatientMediaDeleteResponse> => {
        try {
            const response: AxiosResponse<PatientMediaDeleteResponse> = await axiosInstance.delete(baseUrl + deleteMedia(patientId, mediaId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Delete patient media failed");
            }
            throw error;
        }
    },

    // Temporary File Upload
    tempUpload: async (file: File | { uri: string; type: string; name: string }): Promise<TempUploadResponse> => {
        try {
            const formData = new FormData();
            formData.append("file", file as File | Blob);

            const response: AxiosResponse<any> = await axiosInstance.post(baseUrl + tempUpload(), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            
            // Response structure: {success: true, message: null, data: {filename: '...'}}
            // Extract the inner data object (TempUploadResponse)
            const tempUploadResponse: TempUploadResponse = response.data?.data || response.data;
            return tempUploadResponse;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    throw new Error(error.response.data.message || "Temporary upload failed");
                }
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
            if (payload.notes != null && payload.notes.length > 0) {
                formData.append("notes", JSON.stringify(payload.notes));
            }
            if (payload.data != null && payload.data !== "") {
                formData.append("data", typeof payload.data === "string" ? payload.data : JSON.stringify(payload.data));
            }

            const response: AxiosResponse<PatientMediaEditResponse> = await axiosInstance.post(baseUrl + editMedia(mediaId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
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
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Unbookmark media failed");
            }
            throw error;
        }
    },
};

export default MediaService;
