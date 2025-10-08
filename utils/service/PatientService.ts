import axios from 'axios';

import {Patient} from './models/ResponseModels';
import {CreatePatientRequest} from './models/RequestModels';
import {UpdatePatientRequest} from './models/RequestModels';
import {routes} from '@/routes/routes';
import axiosInstance from '../AxiosInstans';
import {Status} from '@/models/enums';

const {
  baseUrl,
  patient: {create, list, getById, update, delete: deleteRoute},
} = routes;

const PatientService = {
  CreatePatient: async (
    practiceId: string | number,
    payload: CreatePatientRequest,
  ): Promise<Patient> => {
    try {
      const response = await axiosInstance.post<Patient>(
        baseUrl + create(practiceId),
        payload,
      );
      if (response.status === Status.Ok || response.status === Status.Created) {
        return response.data;
      }
      throw new Error(`Request failed with status ${response.status}`);
    } catch (error) {
      console.error('Error in CreatePatient:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Unknown error occurred',
        );
      }
      throw error;
    }
  },

  GetPatients: async (practiceId: string | number): Promise<Patient[]> => {
    try {
      const response = await axiosInstance.get<Patient[]>(
        baseUrl + list(practiceId),
      );
      if (response.status === Status.Ok) {
        return response.data;
      }
      throw new Error(`Request failed with status ${response.status}`);
    } catch (error) {
      console.error('Error in GetPatients:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Unknown error occurred',
        );
      }
      throw error;
    }
  },

  GetPatientById: async (
    practiceId: string | number,
    patientId: string | number,
  ): Promise<Patient> => {
    try {
      const response = await axiosInstance.get<Patient>(
        baseUrl + getById(practiceId, patientId),
      );
      if (response.status === Status.Ok) {
        return response.data;
      }
      throw new Error(`Request failed with status ${response.status}`);
    } catch (error) {
      console.error('Error in GetPatientById:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Unknown error occurred',
        );
      }
      throw error;
    }
  },

  UpdatePatient: async (
    practiceId: string | number,
    patientId: string | number,
    payload: UpdatePatientRequest,
  ): Promise<Patient> => {
    try {
      const response = await axiosInstance.put<Patient>(
        baseUrl + update(practiceId, patientId),
        payload,
      );
      if (response.status === Status.Ok) {
        return response.data;
      }
      throw new Error(`Request failed with status ${response.status}`);
    } catch (error) {
      console.error('Error in UpdatePatient:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Unknown error occurred',
        );
      }
      throw error;
    }
  },

  DeletePatient: async (
    practiceId: string | number,
    patientId: string | number,
  ): Promise<void> => {
    try {
      const response = await axiosInstance.delete<void>(
        baseUrl + deleteRoute(practiceId, patientId),
      );
      if (
        response.status === Status.Ok ||
        response.status === Status.NoContent
      ) {
        return;
      }
      throw new Error(`Request failed with status ${response.status}`);
    } catch (error) {
      console.error('Error in DeletePatient:', error);
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Unknown error occurred',
        );
      }
      throw error;
    }
  },
};

export default PatientService;
