import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handling of global errors or refresh token rotation (implemented in Phase 04)
    return Promise.reject(error);
  },
);

export async function checkBackendHealth() {
  try {
    const res = await apiClient.get('/health');
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to connect to Melayurveda backend API',
    };
  }
}
