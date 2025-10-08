    import axiosInstance from '../AxiosInstans';
import {routes} from '../../routes/routes';
import {
  AddMemberDto,
  CreatePracticeDto,
  UpdatePracticeDto,
} from './models/RequestModels';
import axios from 'axios';

const {
  practice: {create, addMember, delete: deletePractice, getById, list, update},
} = routes;

export const PracticeService = {
  createPractice: async (data: CreatePracticeDto) => {
    try {
      const response = await axiosInstance.post(create(), data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Create practice failed');
      }
      throw error;
    }
  },
  addMember: async (id: number, data: AddMemberDto) => {
    try {
      const response = await axiosInstance.post(addMember(id), data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Add member failed');
      }
      throw error;
    }
  },
  deletePractice: async (id: number) => {
    try {
      const response = await axiosInstance.delete(deletePractice(id));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Delete practice failed');
      }
      throw error;
    }
  },
  getPracticeById: async (id: number) => {
    try {
      const response = await axiosInstance.get(getById(id));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Get practice by id failed');
      }
      throw error;
    }
  },
  getPracticeList: async () => {
    try {
        const response = await axiosInstance.get(list());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Get practice list failed');
      }
      throw error;
    }
  },
  updatePractice: async (id: number, data: UpdatePracticeDto) => {
    try {
      const response = await axiosInstance.put(update(id), data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Update practice failed');
      }
      throw error;
    }
  },
};
