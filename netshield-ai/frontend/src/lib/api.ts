// API client configuration
import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || '';
const API_BASE = rawApiUrl.replace(/\/+$/, '');

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('netshield_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('netshield_token');
      localStorage.removeItem('netshield_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
