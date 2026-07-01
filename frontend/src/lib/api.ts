import { createApiClient } from '@rently/shared';
import { i18n } from './i18n';

const localApiUrls = ['http://localhost:4001', 'http://localhost:4000'];
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiBaseUrls = configuredApiUrl ? [configuredApiUrl] : localApiUrls;

const api = createApiClient({
  baseURLs: apiBaseUrls,
  getToken: () => (typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null),
  getTenantId: () => (typeof window !== 'undefined' ? sessionStorage.getItem('activeTenantId') : null),
  getLanguage: () => i18n.language,
  setToken: (token: string) => sessionStorage.setItem('accessToken', token),
  clearToken: () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
  },
  onUnauthorized: () => {
    window.location.href = '/login';
  },
});

export function getApiBaseUrl() {
  return api.defaults.baseURL || apiBaseUrls[0];
}

export default api;
