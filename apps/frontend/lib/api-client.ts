import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Persistent access token storage with in-memory caching
const TOKEN_STORAGE_KEY = 'mel_access_token';
let inMemoryToken: string | null = null;

export function setAccessToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors (e.g. private mode)
    }
  }
}

export function getAccessToken(): string | null {
  if (inMemoryToken) {
    return inMemoryToken;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        inMemoryToken = stored;
        return stored;
      }
    } catch {
      // Ignore storage errors
    }
  }
  return null;
}

// Request Interceptor: Attach Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Shared singleton refresh promise to prevent concurrent /auth/refresh theft-detection conflicts
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAuthToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshResponse = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newAccessToken = refreshResponse.data?.accessToken;
      if (newAccessToken) {
        setAccessToken(newAccessToken);
        return newAccessToken;
      }
      setAccessToken(null);
      return null;
    } catch (refreshError) {
      setAccessToken(null);
      throw refreshError;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Response Interceptor: Handle 401 & Silent Token Rotation
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAuthToken();
        if (newAccessToken) {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        setAccessToken(null);
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login?expired=true';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(error: any): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    return error.message || 'Network error communicating with CRM server';
  }
  return error?.message || 'An unexpected error occurred';
}

export async function checkBackendHealth() {
  try {
    const res = await apiClient.get('/health');
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}
