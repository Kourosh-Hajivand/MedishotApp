import axios from 'axios';
import {getTokens} from './helper/tokenStorage';

import {routes} from '../routes/routes';

const axiosInstance = axios.create({
  baseURL: routes.baseUrl,
});

axiosInstance.interceptors.request.use(async config => {
  const tokens = await getTokens();
  console.log('tokens', tokens);
  if (tokens.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    const originalRequest = error.config;

    // Log detailed error information
    if (error.response) {
      console.error('Axios Error Response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      console.error('Axios Error Request:', error.request);
    } else {
      console.error('Axios Error Message:', error.message);
    }
    // if (originalRequest.url?.includes('auth/refresh')) {
    //   await removeTokens();
    //   navigate('Auth');
    //   throw error;
    // }
    // if (error.response?.status === 401 && !originalRequest._retry) {
    //   originalRequest._retry = true;
    //   console.warn('Unauthorized (401), removing tokens...');
    //   await removeTokens();
    //   navigate('Auth');
    //   throw error;
    // }
    throw error;
  },
);

export default axiosInstance;
