import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { AddMemberDto, CreatePracticeDto, CreateTagDto, CreateTemplateDto, TransferOwnershipDto, UpdateMemberRoleDto, UpdatePracticeDto, UpdateTagDto, UpdateTemplateDto } from "./models/RequestModels";
import { ApiResponse, Member, PatientsCountResponse, PracticeDetailResponse, PracticeListResponse, PracticeMembersResponse, PracticeTagResponse, PracticeTagsResponse, PracticeTemplateResponse, PracticeTemplatesResponse, RecentlyPhotosResponse } from "./models/ResponseModels";

const {
    baseUrl,
    practises: {
        list,
        create,
        getById,
        update,
        delete: deletePractice,
        getMembers,
        addMember,
        updateMemberRole,
        removeMember,
        leave,
        transferOwnership,
        getTags,
        createTag,
        getTag,
        updateTag,
        deleteTag,
        getTemplates,
        createTemplate,
        getTemplate,
        updateTemplate,
        deleteTemplate,
        getRecentlyPhotos,
        getPatientsCount,
        getArchivedMedia,
        getMember,
    },
} = routes;

export const PracticeService = {
    // ============= Practice CRUD =============

    // Get list of practices
    getPracticeList: async (): Promise<PracticeListResponse> => {
        try {
            const response: AxiosResponse<PracticeListResponse> = await axiosInstance.get(baseUrl + list());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice list");
            }
            throw error;
        }
    },

    // Create a new practice
    createPractice: async (data: CreatePracticeDto): Promise<PracticeDetailResponse> => {
        try {
            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.post(baseUrl + create(), data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to create practice");
            }
            throw error;
        }
    },

    // Get practice by ID
    getPracticeById: async (practiceId: number): Promise<PracticeDetailResponse> => {
        try {
            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.get(baseUrl + getById(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice");
            }
            throw error;
        }
    },

    // Update practice
    updatePractice: async (practiceId: number, data: UpdatePracticeDto): Promise<PracticeDetailResponse> => {
        try {
            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.post(baseUrl + update(practiceId), data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to update practice");
            }
            throw error;
        }
    },

    // Delete practice
    deletePractice: async (practiceId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(baseUrl + deletePractice(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to delete practice");
            }
            throw error;
        }
    },

    // ============= Practice Members =============

    // Get practice members with optional role filter
    getMembers: async (practiceId: number, params?: { role?: "owner" | "doctor" | "staff" }): Promise<PracticeMembersResponse> => {
        try {
            const queryParams = new URLSearchParams();
            if (params?.role) {
                queryParams.append("role", params.role);
            }
            const url = baseUrl + getMembers(practiceId) + (queryParams.toString() ? `?${queryParams.toString()}` : "");
            const response: AxiosResponse<PracticeMembersResponse | Member[]> = await axiosInstance.get(url);

            // Handle both array response and wrapped response
            if (Array.isArray(response.data)) {
                // If response is directly an array, wrap it
                return {
                    success: true,
                    data: response.data,
                };
            }

            // If response is already wrapped, return as is
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice members");
            }
            throw error;
        }
    },

    // Add member to practice
    addMember: async (practiceId: number, data: AddMemberDto): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(baseUrl + addMember(practiceId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to add member");
            }
            throw error;
        }
    },

    // Update member role
    updateMemberRole: async (practiceId: number, memberId: string | number, data: UpdateMemberRoleDto): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(baseUrl + updateMemberRole(practiceId, memberId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to update member role");
            }
            throw error;
        }
    },

    // Remove member from practice
    removeMember: async (practiceId: number, memberId: string | number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(baseUrl + removeMember(practiceId, memberId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to remove member");
            }
            throw error;
        }
    },

    // Leave practice
    leavePractice: async (practiceId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.post(baseUrl + leave(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to leave practice");
            }
            throw error;
        }
    },

    // Transfer ownership
    transferOwnership: async (practiceId: number, data: TransferOwnershipDto): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(baseUrl + transferOwnership(practiceId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to transfer ownership");
            }
            throw error;
        }
    },

    // ============= Practice Statistics =============

    // Get recently uploaded photos for a practice
    getRecentlyPhotos: async (practiseId: string | number): Promise<RecentlyPhotosResponse> => {
        try {
            const response: AxiosResponse<RecentlyPhotosResponse> = await axiosInstance.get(baseUrl + getRecentlyPhotos(practiseId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get recently uploaded photos");
            }
            throw error;
        }
    },

    // Get patient count statistics
    getPatientsCount: async (practiseId: string | number, type: string): Promise<PatientsCountResponse> => {
        try {
            const response: AxiosResponse<PatientsCountResponse> = await axiosInstance.get(baseUrl + getPatientsCount(practiseId, type));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get patient count statistics");
            }
            throw error;
        }
    },

    // Get archived media for a practice
    getArchivedMedia: async (practiseId: string | number): Promise<RecentlyPhotosResponse> => {
        try {
            const response: AxiosResponse<RecentlyPhotosResponse> = await axiosInstance.get(baseUrl + getArchivedMedia(practiseId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get archived media");
            }
            throw error;
        }
    },

    // Get specific practice member details
    getMember: async (practiceId: number, memberId: string): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.get(baseUrl + getMember(practiceId, memberId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice member");
            }
            throw error;
        }
    },

    // ============= Practice Tags =============

    // Get practice tags
    getTags: async (practiceId: number): Promise<PracticeTagsResponse> => {
        try {
            const response: AxiosResponse<PracticeTagsResponse> = await axiosInstance.get(baseUrl + getTags(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice tags");
            }
            throw error;
        }
    },

    // Create practice tag
    createTag: async (practiceId: number, data: CreateTagDto): Promise<PracticeTagResponse> => {
        try {
            const response: AxiosResponse<PracticeTagResponse> = await axiosInstance.post(baseUrl + createTag(practiceId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to create practice tag");
            }
            throw error;
        }
    },

    // Get practice tag
    getTag: async (practiceId: number, tagId: number): Promise<PracticeTagResponse> => {
        try {
            const response: AxiosResponse<PracticeTagResponse> = await axiosInstance.get(baseUrl + getTag(practiceId, tagId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice tag");
            }
            throw error;
        }
    },

    // Update practice tag
    updateTag: async (practiceId: number, tagId: number, data: UpdateTagDto): Promise<PracticeTagResponse> => {
        try {
            const response: AxiosResponse<PracticeTagResponse> = await axiosInstance.post(baseUrl + updateTag(practiceId, tagId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to update practice tag");
            }
            throw error;
        }
    },

    // Delete practice tag
    deleteTag: async (practiceId: number, tagId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(baseUrl + deleteTag(practiceId, tagId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to delete practice tag");
            }
            throw error;
        }
    },

    // ============= Practice Templates =============

    // Get practice templates
    getTemplates: async (practiceId: number): Promise<PracticeTemplatesResponse> => {
        try {
            const response: AxiosResponse<PracticeTemplatesResponse> = await axiosInstance.get(baseUrl + getTemplates(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice templates");
            }
            throw error;
        }
    },

    // Create practice template
    createTemplate: async (practiceId: number, data: CreateTemplateDto): Promise<PracticeTemplateResponse> => {
        try {
            const response: AxiosResponse<PracticeTemplateResponse> = await axiosInstance.post(baseUrl + createTemplate(practiceId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to create practice template");
            }
            throw error;
        }
    },

    // Get practice template
    getTemplate: async (practiceId: number, templateId: number): Promise<PracticeTemplateResponse> => {
        try {
            const response: AxiosResponse<PracticeTemplateResponse> = await axiosInstance.get(baseUrl + getTemplate(practiceId, templateId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice template");
            }
            throw error;
        }
    },

    // Update practice template
    updateTemplate: async (practiceId: number, templateId: number, data: UpdateTemplateDto): Promise<PracticeTemplateResponse> => {
        try {
            const response: AxiosResponse<PracticeTemplateResponse> = await axiosInstance.post(baseUrl + updateTemplate(practiceId, templateId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to update practice template");
            }
            throw error;
        }
    },

    // Delete practice template
    deleteTemplate: async (practiceId: number, templateId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(baseUrl + deleteTemplate(practiceId, templateId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to delete practice template");
            }
            throw error;
        }
    },
};
