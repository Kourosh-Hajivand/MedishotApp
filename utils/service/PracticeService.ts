import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { AddMemberDto, CreatePracticeDto, CreateTagDto, CreateTemplateDto, TransferOwnershipDto, UpdateMemberDto, UpdateMemberRoleDto, UpdatePracticeDto, UpdateTagDto, UpdateTemplateDto } from "./models/RequestModels";
import {
    ApiResponse,
    Member,
    NextChartNumberResponse,
    PatientContractListResponse,
    PatientsCountResponse,
    PracticeActivitiesResponse,
    PracticeDetailResponse,
    PracticeListResponse,
    PracticeMembersResponse,
    PracticeTagResponse,
    PracticeTagsResponse,
    PracticeTemplateResponse,
    PracticeTemplatesResponse,
    RecentlyPhotosResponse,
} from "./models/ResponseModels";

const {
    practises: {
        list,
        create,
        getById,
        put: putPractice,
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
        getAlbums,
        getMember,
        getMemberActivities,
        getLatestContracts,
        getActivities,
        updateMember,
        getNextChartNumber,
    },
} = routes;

export const PracticeService = {
    // ============= Practice CRUD =============

    // Get list of practices
    getPracticeList: async (): Promise<PracticeListResponse> => {
        try {
            const response: AxiosResponse<PracticeListResponse> = await axiosInstance.get(list());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const endpoint = error.config?.url || "practises";
                const status = error.response.status;
                const serverMessage = error.response.data?.message || error.response.data?.exception || "Unknown error";
                throw new Error(`[Practice List API] ${endpoint} - Status ${status}: ${serverMessage}`);
            }
            if (axios.isAxiosError(error)) {
                const endpoint = error.config?.url || "practises";
                throw new Error(`[Practice List API] ${endpoint} - Network error: ${error.message}`);
            }
            throw error;
        }
    },

    // Create a new practice
    createPractice: async (data: CreatePracticeDto): Promise<PracticeDetailResponse> => {
        try {
            const formData = new FormData();
            formData.append("name", data.name);
            formData.append("type", String(data.type));
            if (data.metadata) formData.append("metadata", data.metadata);
            if (data.email) formData.append("email", data.email);
            if (data.init_chart_number != null) formData.append("init_chart_number", String(data.init_chart_number));
            if (data.image != null) {
                if (typeof data.image === "string") {
                    formData.append("image", data.image);
                } else {
                    formData.append("image", data.image);
                }
            }
            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.post(create(), formData, {
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
            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.get(getById(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice");
            }
            throw error;
        }
    },

    // Update practice (POST practises/{id}/update - OpenAPI also allows PUT practises/{id})
    updatePractice: async (practiceId: number, data: UpdatePracticeDto): Promise<PracticeDetailResponse> => {
        try {
            const formData = new FormData();
            formData.append("name", data.name);
            if (data.metadata) formData.append("metadata", data.metadata);
            if (data.email) formData.append("email", data.email);
            if (data.init_chart_number != null) formData.append("init_chart_number", String(data.init_chart_number));
            if (data.image != null) {
                if (typeof data.image === "string") {
                    formData.append("image", data.image);
                } else {
                    formData.append("image", data.image);
                }
            }
            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.post(update(practiceId), formData, {
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

    // Update practice via PUT (OpenAPI: PUT practises/{id} multipart/form-data)
    updatePracticePut: async (practiceId: number, data: UpdatePracticeDto): Promise<PracticeDetailResponse> => {
        try {
            const formData = new FormData();
            formData.append("name", data.name);
            if (data.metadata) formData.append("metadata", data.metadata);
            if (data.email) formData.append("email", data.email);
            if (data.init_chart_number != null) formData.append("init_chart_number", String(data.init_chart_number));
            if (data.image != null) {
                if (typeof data.image === "string") {
                    formData.append("image", data.image);
                } else {
                    formData.append("image", data.image);
                }
            }
            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.put(putPractice(practiceId), formData, {
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
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(deletePractice(practiceId));
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
            const url = getMembers(practiceId) + (queryParams.toString() ? `?${queryParams.toString()}` : "");
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
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(addMember(practiceId), data);
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
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(updateMemberRole(practiceId, memberId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to update member role");
            }
            throw error;
        }
    },

    // Update unregistered member (POST .../members/{memberId}/update - OpenAPI alternative)
    updateMember: async (practiceId: number, memberId: string | number, data: UpdateMemberDto): Promise<ApiResponse<any>> => {
        try {
            const formData = new FormData();

            if (data.first_name) {
                formData.append("first_name", data.first_name);
            }
            if (data.last_name) {
                formData.append("last_name", data.last_name);
            }
            if (data.email) {
                formData.append("email", data.email);
            }
            if (data.birth_date) {
                formData.append("birth_date", data.birth_date);
            }
            if (data.gender) {
                formData.append("gender", data.gender);
            }
            if (data.metadata) {
                formData.append("metadata", data.metadata);
            }
            if (data.profile_photo) {
                if (typeof data.profile_photo === "string") {
                    formData.append("profile_photo", data.profile_photo);
                } else {
                    formData.append("profile_photo", data.profile_photo);
                }
            }

            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(updateMember(practiceId, memberId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to update member");
            }
            throw error;
        }
    },

    // Update unregistered member via PUT (OpenAPI: PUT .../members/{memberId}/activities)
    updateMemberPut: async (practiceId: number, memberId: string | number, data: UpdateMemberDto): Promise<ApiResponse<any>> => {
        try {
            const formData = new FormData();
            if (data.first_name) formData.append("first_name", data.first_name);
            if (data.last_name) formData.append("last_name", data.last_name);
            if (data.email) formData.append("email", data.email);
            if (data.birth_date) formData.append("birth_date", data.birth_date);
            if (data.gender) formData.append("gender", data.gender);
            if (data.metadata) formData.append("metadata", data.metadata);
            if (data.profile_photo) {
                formData.append("profile_photo", typeof data.profile_photo === "string" ? data.profile_photo : data.profile_photo);
            }
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.put(getMemberActivities(practiceId, memberId), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to update member");
            }
            throw error;
        }
    },

    // Remove member from practice
    removeMember: async (practiceId: number, memberId: string | number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(removeMember(practiceId, memberId));
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
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.post(leave(practiceId));
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
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(transferOwnership(practiceId), data);
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
            const response: AxiosResponse<RecentlyPhotosResponse> = await axiosInstance.get(getRecentlyPhotos(practiseId));
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
            const response: AxiosResponse<PatientsCountResponse> = await axiosInstance.get(getPatientsCount(practiseId, type));
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
            const response: AxiosResponse<RecentlyPhotosResponse> = await axiosInstance.get(getArchivedMedia(practiseId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get archived media");
            }
            throw error;
        }
    },

    // Get practice albums
    getAlbums: async (practiseId: string | number): Promise<RecentlyPhotosResponse> => {
        try {
            const response: AxiosResponse<RecentlyPhotosResponse> = await axiosInstance.get(getAlbums(practiseId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice albums");
            }
            throw error;
        }
    },

    // Get specific practice member details
    getMember: async (practiceId: number, memberId: string): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.get(getMember(practiceId, memberId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice member");
            }
            throw error;
        }
    },

    // Get practice member activities
    getMemberActivities: async (practiceId: number, memberId: string): Promise<PracticeActivitiesResponse> => {
        try {
            const response: AxiosResponse<PracticeActivitiesResponse> = await axiosInstance.get(getMemberActivities(practiceId, memberId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get member activities");
            }
            throw error;
        }
    },

    // ============= Next Chart Number =============

    // Get next chart number for a practice
    getNextChartNumber: async (practiceId: number): Promise<NextChartNumberResponse> => {
        try {
            const response: AxiosResponse<NextChartNumberResponse> = await axiosInstance.get(getNextChartNumber(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get next chart number");
            }
            throw error;
        }
    },

    // ============= Practice Tags =============

    // Get practice tags
    getTags: async (practiceId: number): Promise<PracticeTagsResponse> => {
        try {
            const response: AxiosResponse<PracticeTagsResponse> = await axiosInstance.get(getTags(practiceId));
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
            const response: AxiosResponse<PracticeTagResponse> = await axiosInstance.post(createTag(practiceId), data);
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
            const response: AxiosResponse<PracticeTagResponse> = await axiosInstance.get(getTag(practiceId, tagId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice tag");
            }
            throw error;
        }
    },

    // Update practice tag (OpenAPI: PUT)
    updateTag: async (practiceId: number, tagId: number, data: UpdateTagDto): Promise<PracticeTagResponse> => {
        try {
            const response: AxiosResponse<PracticeTagResponse> = await axiosInstance.put(getTag(practiceId, tagId), data);
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
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(deleteTag(practiceId, tagId));
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
            const response: AxiosResponse<PracticeTemplatesResponse> = await axiosInstance.get(getTemplates(practiceId));
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
            const response: AxiosResponse<PracticeTemplateResponse> = await axiosInstance.post(createTemplate(practiceId), data);
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
            const response: AxiosResponse<PracticeTemplateResponse> = await axiosInstance.get(getTemplate(practiceId, templateId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice template");
            }
            throw error;
        }
    },

    // Update practice template (OpenAPI: PUT)
    updateTemplate: async (practiceId: number, templateId: number, data: UpdateTemplateDto): Promise<PracticeTemplateResponse> => {
        try {
            const response: AxiosResponse<PracticeTemplateResponse> = await axiosInstance.put(updateTemplate(practiceId, templateId), data);
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
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(deleteTemplate(practiceId, templateId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to delete practice template");
            }
            throw error;
        }
    },

    // ============= Contracts =============

    // Get latest contracts for a practice
    getLatestContracts: async (practiceId: number): Promise<PatientContractListResponse> => {
        try {
            const response: AxiosResponse<PatientContractListResponse> = await axiosInstance.get(getLatestContracts(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get latest contracts");
            }
            throw error;
        }
    },

    // ============= Practice Activities =============

    // Get practice activity log
    getActivities: async (practiceId: number): Promise<PracticeActivitiesResponse> => {
        try {
            const response: AxiosResponse<PracticeActivitiesResponse> = await axiosInstance.get(getActivities(practiceId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Failed to get practice activities");
            }
            throw error;
        }
    },
};
