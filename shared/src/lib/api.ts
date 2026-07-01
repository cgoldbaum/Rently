import axios, { type InternalAxiosRequestConfig } from 'axios';

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _fallbackRetry?: boolean;
  _retry?: boolean;
};

interface ApiClientOptions {
  baseURLs: string[];
  getToken: () => string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  onUnauthorized: () => void;
  // Native clients have no cookie jar — they pass the refresh token explicitly.
  getRefreshToken?: () => string | null;
  setRefreshToken?: (token: string) => void;
  // Alquiler activo (perfil de inquilino) para usuarios con más de un alquiler.
  getTenantId?: () => string | null;
  /** Idioma actual del frontend (ej. `i18n.language`) para mandar como Accept-Language. */
  getLanguage?: () => string | null | undefined;
}

export function createApiClient({
  baseURLs,
  getToken,
  setToken,
  clearToken,
  onUnauthorized,
  getRefreshToken,
  setRefreshToken,
  getTenantId,
  getLanguage,
}: ApiClientOptions) {
  const api = axios.create({
    baseURL: baseURLs[0],
    withCredentials: true,
  });

  api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const tenantId = getTenantId?.();
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    }
    const lang = getLanguage?.();
    if (lang) {
      config.headers['Accept-Language'] = lang;
    }
    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config as RetriableRequestConfig | undefined;
      if (!original) return Promise.reject(error);

      if (baseURLs.length > 1 && !error.response && !original._fallbackRetry) {
        original._fallbackRetry = true;
        const currentBaseUrl = original.baseURL || api.defaults.baseURL;
        const fallbackBaseUrl = baseURLs.find((url) => url !== currentBaseUrl);
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
          const storedRefreshToken = getRefreshToken?.();
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
            { withCredentials: true }
          );
          const newToken = data.data.accessToken;
          setToken(newToken);
          if (data.data.refreshToken && setRefreshToken) {
            setRefreshToken(data.data.refreshToken);
          }
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          clearToken();
          onUnauthorized();
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
}
