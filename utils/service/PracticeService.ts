import axios, { AxiosResponse } from "axios";
import { routes } from "../../routes/routes";
import axiosInstance from "../AxiosInstans";
import { AddMemberDto, CreatePracticeDto, CreateTagDto, CreateTemplateDto, TransferOwnershipDto, UpdateMemberRoleDto, UpdatePracticeDto, UpdateTagDto, UpdateTemplateDto } from "./models/RequestModels";
import { ApiResponse, PracticeDetailResponse, PracticeListResponse, PracticeMembersResponse, PracticeStatsResponse, PracticeTagResponse, PracticeTagsResponse, PracticeTemplateResponse, PracticeTemplatesResponse } from "./models/ResponseModels";

const {
    baseUrl,
    practises: { list, create, getById, update, delete: deletePractice, getMembers, addMember, updateMemberRole, removeMember, leave, transferOwnership, getPatientsCount, getTags, createTag, getTag, updateTag, deleteTag, getTemplates, createTemplate, getTemplate, updateTemplate, deleteTemplate },
} = routes;

export const PracticeService = {
    // Practice Management
    getPracticeList: async (): Promise<PracticeListResponse> => {
        try {
            const response: AxiosResponse<PracticeListResponse> = await axiosInstance.get(baseUrl + list());
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get practice list failed");
            }
            throw error;
        }
    },

    createPractice: async (data: CreatePracticeDto): Promise<PracticeDetailResponse> => {
        try {
            const formData = new FormData();
            formData.append("name", data.name);
            formData.append("type", data.type);

            if (data.image) {
                formData.append("image", data.image);
            }

            if (data.metadata) {
                // اگر metadata یک string است (JSON stringified شده)، مستقیماً ارسال می‌کنیم
                // اگر object است، آن را JSON.stringify می‌کنیم
                const metadataString = typeof data.metadata === "string" ? data.metadata : JSON.stringify(data.metadata);
                formData.append("metadata", metadataString);
            }

            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.post(baseUrl + create(), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Create practice failed");
            }
            throw error;
        }
    },

    getPracticeById: async (id: number): Promise<PracticeDetailResponse> => {
        try {
            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.get(baseUrl + getById(id));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get practice by id failed");
            }
            throw error;
        }
    },

    updatePractice: async (id: number, data: UpdatePracticeDto): Promise<PracticeDetailResponse> => {
        try {
            const formData = new FormData();
            formData.append("name", data.name);

            if (data.image) {
                formData.append("image", data.image);
            }

            if (data.metadata) {
                formData.append("metadata", data.metadata);
            }

            const response: AxiosResponse<PracticeDetailResponse> = await axiosInstance.put(baseUrl + update(id), formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Update practice failed");
            }
            throw error;
        }
    },

    deletePractice: async (id: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(baseUrl + deletePractice(id));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Delete practice failed");
            }
            throw error;
        }
    },

    // Member Management
    getMembers: async (practiseId: number): Promise<PracticeMembersResponse> => {
        try {
            const response: AxiosResponse<PracticeMembersResponse> = await axiosInstance.get(baseUrl + getMembers(practiseId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get members failed");
            }
            throw error;
        }
    },

    addMember: async (practiseId: number, data: AddMemberDto): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(baseUrl + addMember(practiseId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Add member failed");
            }
            throw error;
        }
    },

    updateMemberRole: async (practiseId: number, memberId: number, data: UpdateMemberRoleDto): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.put(baseUrl + updateMemberRole(practiseId, memberId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Update member role failed");
            }
            throw error;
        }
    },

    removeMember: async (practiseId: number, memberId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(baseUrl + removeMember(practiseId, memberId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Remove member failed");
            }
            throw error;
        }
    },

    leavePractice: async (practiseId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.post(baseUrl + leave(practiseId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Leave practice failed");
            }
            throw error;
        }
    },

    transferOwnership: async (practiseId: number, data: TransferOwnershipDto): Promise<ApiResponse<any>> => {
        try {
            const response: AxiosResponse<ApiResponse<any>> = await axiosInstance.post(baseUrl + transferOwnership(practiseId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Transfer ownership failed");
            }
            throw error;
        }
    },

    // Practice Statistics
    getPatientsCount: async (practiseId: number, type: string): Promise<PracticeStatsResponse> => {
        try {
            const response: AxiosResponse<PracticeStatsResponse> = await axiosInstance.get(baseUrl + getPatientsCount(practiseId, type));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get patients count failed");
            }
            throw error;
        }
    },

    // Practice Tags
    getTags: async (practiseId: number): Promise<PracticeTagsResponse> => {
        try {
            const response: AxiosResponse<PracticeTagsResponse> = await axiosInstance.get(baseUrl + getTags(practiseId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get tags failed");
            }
            throw error;
        }
    },

    createTag: async (practiseId: number, data: CreateTagDto): Promise<PracticeTagResponse> => {
        try {
            const response: AxiosResponse<PracticeTagResponse> = await axiosInstance.post(baseUrl + createTag(practiseId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Create tag failed");
            }
            throw error;
        }
    },

    getTag: async (practiseId: number, tagId: number): Promise<PracticeTagResponse> => {
        try {
            const response: AxiosResponse<PracticeTagResponse> = await axiosInstance.get(baseUrl + getTag(practiseId, tagId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get tag failed");
            }
            throw error;
        }
    },

    updateTag: async (practiseId: number, tagId: number, data: UpdateTagDto): Promise<PracticeTagResponse> => {
        try {
            const response: AxiosResponse<PracticeTagResponse> = await axiosInstance.put(baseUrl + updateTag(practiseId, tagId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Update tag failed");
            }
            throw error;
        }
    },

    deleteTag: async (practiseId: number, tagId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(baseUrl + deleteTag(practiseId, tagId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Delete tag failed");
            }
            throw error;
        }
    },

    // Practice Templates
    getTemplates: async (practiseId: number): Promise<PracticeTemplatesResponse> => {
        try {
            const response: AxiosResponse<PracticeTemplatesResponse> = await axiosInstance.get(baseUrl + getTemplates(practiseId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get templates failed");
            }
            throw error;
        }
    },

    createTemplate: async (practiseId: number, data: CreateTemplateDto): Promise<PracticeTemplateResponse> => {
        try {
            const response: AxiosResponse<PracticeTemplateResponse> = await axiosInstance.post(baseUrl + createTemplate(practiseId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Create template failed");
            }
            throw error;
        }
    },

    getTemplate: async (practiseId: number, templateId: number): Promise<PracticeTemplateResponse> => {
        try {
            const response: AxiosResponse<PracticeTemplateResponse> = await axiosInstance.get(baseUrl + getTemplate(practiseId, templateId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Get template failed");
            }
            throw error;
        }
    },

    updateTemplate: async (practiseId: number, templateId: number, data: UpdateTemplateDto): Promise<PracticeTemplateResponse> => {
        try {
            const response: AxiosResponse<PracticeTemplateResponse> = await axiosInstance.put(baseUrl + updateTemplate(practiseId, templateId), data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Update template failed");
            }
            throw error;
        }
    },

    deleteTemplate: async (practiseId: number, templateId: number): Promise<ApiResponse<string>> => {
        try {
            const response: AxiosResponse<ApiResponse<string>> = await axiosInstance.delete(baseUrl + deleteTemplate(practiseId, templateId));
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                throw new Error(error.response.data.message || "Delete template failed");
            }
            throw error;
        }
    },
};
