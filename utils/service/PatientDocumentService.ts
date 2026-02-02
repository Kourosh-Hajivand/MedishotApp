import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { CreatePatientDocumentRequest, UpdatePatientDocumentRequest } from "./models/RequestModels";
import { ApiResponse, PatientDocument, PatientDocumentDetailResponse, PatientDocumentListResponse } from "./models/ResponseModels";

const {
    patients: { getDocuments, uploadDocument, getDocument, updateDocument, deleteDocument },
} = routes;

export const PatientDocumentService = {
    // ============= Patient Documents =============

    // Get all documents for a patient
    getPatientDocuments: async (practiseId: string | number, patientId: string | number): Promise<PatientDocumentListResponse> => {
        try {
            const response: AxiosResponse<PatientDocumentListResponse | PatientDocument[]> = await axiosInstance.get(getDocuments(practiseId, patientId));

            // Handle both response formats: {success, message, data} or direct array
            if (Array.isArray(response.data)) {
                // If response is direct array, wrap it in the expected format
                return {
                    success: true,
                    message: "Patient documents retrieved successfully",
                    data: response.data,
                };
            }

            // If response is already in expected format
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get patient documents");
            }
            throw error;
        }
    },

    // Upload a new document for a patient
    uploadPatientDocument: async (practiseId: string | number, patientId: string | number, data: CreatePatientDocumentRequest): Promise<PatientDocumentDetailResponse> => {
        try {
            const formData = new FormData();
            formData.append("type", data.type);

            if (data.description) {
                formData.append("description", data.description);
            }

            // Support: string (temp filename), File (web), or RN file object { uri, type, name }
            if (typeof data.image === "string") {
                formData.append("image", data.image);
            } else if (data.image && typeof data.image === "object" && "uri" in data.image) {
                formData.append("image", data.image as { uri: string; type: string; name: string });
            } else {
                formData.append("image", data.image as File);
            }

            const response: AxiosResponse<PatientDocumentDetailResponse> = await axiosInstance.post(uploadDocument(practiseId, patientId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to upload patient document");
            }
            throw error;
        }
    },

    // Get a specific patient document
    getPatientDocument: async (practiseId: string | number, patientId: string | number, documentId: string | number): Promise<PatientDocumentDetailResponse> => {
        try {
            const response: AxiosResponse<PatientDocumentDetailResponse> = await axiosInstance.get(getDocument(practiseId, patientId, documentId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get patient document");
            }
            throw error;
        }
    },

    // Update a patient document
    updatePatientDocument: async (practiseId: string | number, patientId: string | number, documentId: string | number, data: UpdatePatientDocumentRequest): Promise<PatientDocumentDetailResponse> => {
        try {
            const formData = new FormData();

            if (data.type) {
                formData.append("type", data.type);
            }

            if (data.description !== undefined) {
                formData.append("description", data.description || "");
            }

            // Support string, File, or RN file { uri, type, name }
            if (data.image) {
                if (typeof data.image === "string") {
                    formData.append("image", data.image);
                } else if (typeof data.image === "object" && "uri" in data.image) {
                    formData.append("image", data.image as { uri: string; type: string; name: string });
                } else {
                    formData.append("image", data.image as File);
                }
            }

            const response: AxiosResponse<PatientDocumentDetailResponse> = await axiosInstance.post(updateDocument(practiseId, patientId, documentId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to update patient document");
            }
            throw error;
        }
    },

    // Delete a patient document
    deletePatientDocument: async (practiseId: string | number, patientId: string | number, documentId: string | number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(deleteDocument(practiseId, patientId, documentId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to delete patient document");
            }
            throw error;
        }
    },
};
