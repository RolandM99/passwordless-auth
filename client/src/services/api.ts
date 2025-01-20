/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const webAuthnApi = {
  getRegistrationOptions: async (email: string) => {
    const response = await api.post('/auth/register/options', { email });
    return response.data;
  },

  verifyRegistration: async (email: string, response: any) => {
    const res = await api.post('/auth/register/verify', { email, response });
    return res.data;
  },

  getAuthenticationOptions: async (email: string) => {
    const response = await api.post('/auth/login/options', { email });
    return response.data;
  },

  verifyAuthentication: async (email: string, response: any) => {
    const res = await api.post('/auth/login/verify', { email, response });
    return res.data;
  },
};

// Add request interceptor to include JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
