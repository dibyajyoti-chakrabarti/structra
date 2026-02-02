import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/auth/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach Token Automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle Token Refresh
api.interceptors.response.use(
  (response) => response, // If successful, just return response
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 (Unauthorized) and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh');

      if (refreshToken) {
        try {
          // Use a clean axios instance to avoid infinite loops
          const response = await axios.post('http://127.0.0.1:8000/api/auth/token/refresh/', {
            refresh: refreshToken,
          });

          // Save new tokens
          localStorage.setItem('access', response.data.access);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        } catch (refreshError) {
          // If refresh fails (token expired), logout user
          console.error("Session expired", refreshError);
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        // No refresh token available, force logout
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;