import axios, { type InternalAxiosRequestConfig } from 'axios';

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _fallbackRetry?: boolean;
  _retry?: boolean;
};

const localApiUrls = ['http://localhost:4000', 'http://localhost:4001'];
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiBaseUrls = configuredApiUrl ? [configuredApiUrl] : localApiUrls;

export function getApiBaseUrl() {
  return api.defaults.baseURL || apiBaseUrls[0];
}

const api = axios.create({
  baseURL: apiBaseUrls[0],
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as RetriableRequestConfig | undefined;

    if (!original) {
      return Promise.reject(error);
    }

    if (!configuredApiUrl && !error.response && !original._fallbackRetry) {
      original._fallbackRetry = true;
      const currentBaseUrl = original.baseURL || api.defaults.baseURL;
      const fallbackBaseUrl = apiBaseUrls.find((baseUrl) => baseUrl !== currentBaseUrl);

      if (fallbackBaseUrl) {
        original.baseURL = fallbackBaseUrl;
        api.defaults.baseURL = fallbackBaseUrl;
        return api(original);
      }
    }

    const isAuthRoute = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.data.accessToken;
        sessionStorage.setItem('accessToken', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        sessionStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
