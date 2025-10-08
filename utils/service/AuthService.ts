import axios from 'axios';
import axiosInstance from '../AxiosInstans';
import {AxiosResponse} from 'axios';
import {routes} from '../../routes/routes';
import {LoginBody, RegisterBody} from './models/RequestModels';
import {
  LoginResponse,
  RegisterResponse,
  ProfileResponse,
} from './models/ResponseModels';
import {storeTokens} from '../helper/tokenStorage';

const {
  baseUrl,
  auth: {
    login,
    register,
    profile,
    google,
    googleCallback,
    apple,
    appleCallback,
  },
} = routes;

export const AuthService = {
  login: async (body: LoginBody): Promise<LoginResponse> => {
    try {
      const response: AxiosResponse<LoginResponse> = await axiosInstance.post(
        baseUrl + login(),
        body,
      );
      storeTokens(response.data.data.token.access_token);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Login failed');
      }
      throw error;
    }
  },

  register: async (body: RegisterBody): Promise<RegisterResponse> => {
    try {
      const response: AxiosResponse<RegisterResponse> =
        await axiosInstance.post(baseUrl + register(), body);
      // storeTokens(response.data.data.token.access_token);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Register failed');
      }
      throw error;
    }
  },

  getProfile: async (): Promise<ProfileResponse> => {
    try {
      const response: AxiosResponse<ProfileResponse> = await axiosInstance.get(
        baseUrl + profile(),
      );
      console.log('response', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Fetching profile failed',
        );
      }
      throw error;
    }
  },

  googleLogin: async (): Promise<any> => {
    try {
      const response = await axiosInstance.get(baseUrl + google());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Google login failed');
      }
      throw error;
    }
  },

  googleCallback: async (): Promise<any> => {
    try {
      const response = await axiosInstance.get(baseUrl + googleCallback());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(
          error.response.data.message || 'Google callback failed',
        );
      }
      throw error;
    }
  },

  appleLogin: async (): Promise<any> => {
    try {
      const response = await axiosInstance.get(baseUrl + apple());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Apple login failed');
      }
      throw error;
    }
  },

  appleCallback: async (): Promise<any> => {
    try {
      const response = await axiosInstance.get(baseUrl + appleCallback());
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Apple callback failed');
      }
      throw error;
    }
  },
};
