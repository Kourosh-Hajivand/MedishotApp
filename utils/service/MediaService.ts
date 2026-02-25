import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { EditPatientMediaRequest, EditPatientMediaNote, UpdateMediaImageRequest, UploadMediaWithTemplateRequest, UploadPatientMediaRequest } from "./models/RequestModels";
import { PatientMediaAlbumsResponse, PatientMediaBookmarkResponse, PatientMediaDeleteResponse, PatientMediaEditResponse, PatientMediaListResponse, PatientMediaRestoreResponse, PatientMediaTrashResponse, PatientMediaUploadResponse, PatientMediaWithTemplateResponse, TempUploadResponse, UpdateMediaImageResponse } from "./models/ResponseModels";

const {
    baseUrl,
    patients: { getMedia, getMediaAlbums, uploadMedia, uploadMediaWithTemplate, deleteMedia, getTrashMedia, restoreMedia, editMedia, updateMediaImage, bookmarkMedia, unbookmarkMedia },
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

            // Add optional before_media_id field
            if (payload.before_media_id != null) {
                formData.append("before_media_id", String(payload.before_media_id));
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

    // Temporary File Upload (with one retry on timeout/network)
    tempUpload: async (file: File | { uri: string; type: string; name: string }): Promise<TempUploadResponse> => {
        const attempt = async (): Promise<TempUploadResponse> => {
            const formData = new FormData();
            formData.append("file", file as File | Blob);

            const response: AxiosResponse<any> = await axiosInstance.post(tempUpload(), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const tempUploadResponse: TempUploadResponse = response.data?.data || response.data;
            return tempUploadResponse;
        };

        const isRetryable = (err: unknown) => {
            if (!axios.isAxiosError(err)) return false;
            if (err.response) return false; // server responded, don't retry
            const msg = (err.message || "").toLowerCase();
            return (
                err.code === "ECONNABORTED" ||
                err.code === "ETIMEDOUT" ||
                err.code === "ERR_NETWORK" ||
                msg.includes("timeout") ||
                msg.includes("network")
            );
        };

        try {
            return await attempt();
        } catch (error) {
            if (isRetryable(error)) {
                try {
                    return await attempt();
                } catch (retryError) {
                    if (axios.isAxiosError(retryError) && retryError.response) {
                        throw new Error(retryError.response.data?.message || "Temporary upload failed");
                    }
                    throw retryError;
                }
            }
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data?.message || "Temporary upload failed");
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

    // Edit patient media image (backend expects notes as array; send as notes[i][text], notes[i][x], notes[i][y])
    editPatientMedia: async (mediaId: string | number, payload: EditPatientMediaRequest): Promise<PatientMediaEditResponse> => {
        try {
            const formData = new FormData();
            formData.append("media", payload.media);
            if (payload.notes != null) {
                const notesArray: EditPatientMediaNote[] = Array.isArray(payload.notes) ? payload.notes : (() => {
                    try {
                        return JSON.parse(payload.notes as string) as EditPatientMediaNote[];
                    } catch {
                        return [];
                    }
                })();
                if (Array.isArray(notesArray) && notesArray.length > 0) {
                    notesArray.forEach((note, i) => {
                        formData.append(`notes[${i}][text]`, String(note.text ?? ""));
                        formData.append(`notes[${i}][x]`, String(Number(note.x)));
                        formData.append(`notes[${i}][y]`, String(Number(note.y)));
                    });
                }
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

    // Update patient media image (notes as array: notes[i][text], notes[i][x], notes[i][y] — same as editPatientMedia)
    updateMediaImage: async (mediaImageId: string | number, payload: UpdateMediaImageRequest): Promise<UpdateMediaImageResponse> => {
        try {
            const formData = new FormData();

            if (payload.edited_image) {
                formData.append("edited_image", payload.edited_image as File | Blob);
            }
            if (payload.notes != null) {
                const notesArray: EditPatientMediaNote[] = Array.isArray(payload.notes)
                    ? payload.notes
                    : (() => {
                          try {
                              return JSON.parse(payload.notes as string) as EditPatientMediaNote[];
                          } catch {
                              return [];
                          }
                      })();
                notesArray.forEach((note, i) => {
                    formData.append(`notes[${i}][text]`, String(note.text ?? ""));
                    formData.append(`notes[${i}][x]`, String(Number(note.x)));
                    formData.append(`notes[${i}][y]`, String(Number(note.y)));
                });
            }
            if (payload.data != null) {
                formData.append("data", JSON.stringify(payload.data));
            }

            if (__DEV__) {
                const edited = payload.edited_image;
                const dataStr = payload.data != null ? JSON.stringify(payload.data) : "";
                const notesArray = payload.notes != null
                    ? (Array.isArray(payload.notes) ? payload.notes : (() => { try { return JSON.parse(payload.notes as string); } catch { return []; } })())
                    : [];
                console.log("[MediaService] updateMediaImage request body:", {
                    mediaImageId,
                    edited_image: typeof edited === "string" ? edited : edited instanceof File ? { name: edited.name, size: edited.size, type: edited.type } : "[Blob]",
                    notesCount: notesArray.length,
                    data_length: dataStr.length,
                    data_preview: dataStr.length > 200 ? dataStr.slice(0, 200) + "…" : dataStr,
                });
            }

            const response: AxiosResponse<UpdateMediaImageResponse> = await axiosInstance.post(baseUrl + updateMediaImage(mediaImageId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Update media image failed");
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
