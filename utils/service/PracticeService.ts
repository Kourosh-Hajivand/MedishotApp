import axios from 'axios';
import axiosInstance from '../AxiosInstans';
import {AxiosResponse} from 'axios';
import {routes} from '../../routes/routes';
import {
  AddMemberDto,
  CreatePracticeDto,
  UpdatePracticeDto,
  UpdateMemberRoleDto,
  TransferOwnershipDto,
} from './models/RequestModels';
import {
  PracticeListResponse,
  PracticeDetailResponse,
  PracticeMembersResponse,
  ApiResponse,
} from './models/ResponseModels';

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
  },
} = routes;

export const PracticeService = {
  // Practice Management
  getPracticeList: async (): Promise<PracticeListResponse> => {
    try {
      const response: AxiosResponse<PracticeListResponse> =
        await axiosInstance.get(baseUrl + list());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Get practice list failed',
        );
      }
      throw error;
    }
  },

  createPractice: async (
    data: CreatePracticeDto,
  ): Promise<PracticeDetailResponse> => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('type', data.type);

      if (data.image) {
        formData.append('image', data.image);
      }

      if (data.metadata) {
        Object.entries(data.metadata).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(`metadata[${key}]`, String(value));
          }
        });
      }

      const response: AxiosResponse<PracticeDetailResponse> =
        await axiosInstance.post(baseUrl + create(), formData, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Create practice failed',
        );
      }
      throw error;
    }
  },

  getPracticeById: async (id: number): Promise<PracticeDetailResponse> => {
    try {
      const response: AxiosResponse<PracticeDetailResponse> =
        await axiosInstance.get(baseUrl + getById(id));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Get practice by id failed',
        );
      }
      throw error;
    }
  },

  updatePractice: async (
    id: number,
    data: UpdatePracticeDto,
  ): Promise<PracticeDetailResponse> => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);

      if (data.image) {
        formData.append('image', data.image);
      }

      if (data.metadata) {
        formData.append('metadata', data.metadata);
      }

      const response: AxiosResponse<PracticeDetailResponse> =
        await axiosInstance.put(baseUrl + update(id), formData, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Update practice failed',
        );
      }
      throw error;
    }
  },

  deletePractice: async (id: number): Promise<ApiResponse<string>> => {
    try {
      const response: AxiosResponse<ApiResponse<string>> =
        await axiosInstance.delete(baseUrl + deletePractice(id));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Delete practice failed',
        );
      }
      throw error;
    }
  },

  // Member Management
  getMembers: async (practiseId: number): Promise<PracticeMembersResponse> => {
    try {
      const response: AxiosResponse<PracticeMembersResponse> =
        await axiosInstance.get(baseUrl + getMembers(practiseId));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Get members failed');
      }
      throw error;
    }
  },

  addMember: async (
    practiseId: number,
    data: AddMemberDto,
  ): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> =
        await axiosInstance.post(baseUrl + addMember(practiseId), data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Add member failed');
      }
      throw error;
    }
  },

  updateMemberRole: async (
    practiseId: number,
    memberId: number,
    data: UpdateMemberRoleDto,
  ): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> =
        await axiosInstance.put(
          baseUrl + updateMemberRole(practiseId, memberId),
          data,
        );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Update member role failed',
        );
      }
      throw error;
    }
  },

  removeMember: async (
    practiseId: number,
    memberId: number,
  ): Promise<ApiResponse<string>> => {
    try {
      const response: AxiosResponse<ApiResponse<string>> =
        await axiosInstance.delete(baseUrl + removeMember(practiseId, memberId));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Remove member failed');
      }
      throw error;
    }
  },

  leavePractice: async (practiseId: number): Promise<ApiResponse<string>> => {
    try {
      const response: AxiosResponse<ApiResponse<string>> =
        await axiosInstance.post(baseUrl + leave(practiseId));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Leave practice failed');
      }
      throw error;
    }
  },

  transferOwnership: async (
    practiseId: number,
    data: TransferOwnershipDto,
  ): Promise<ApiResponse<any>> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> =
        await axiosInstance.post(baseUrl + transferOwnership(practiseId), data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Transfer ownership failed',
        );
      }
      throw error;
    }
  },
};
