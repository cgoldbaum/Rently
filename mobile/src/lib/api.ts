import { createApiClient } from '@rently/shared';
import { router } from 'expo-router';
import { syncStorage } from '../storage';

const baseURLs = process.env.EXPO_PUBLIC_API_URL
  ? [process.env.EXPO_PUBLIC_API_URL]
  : ['http://localhost:4000', 'http://localhost:4001'];

export const api = createApiClient({
  baseURLs,
  getToken: () => syncStorage.getItem('accessToken'),
  setToken: (token) => syncStorage.setItem('accessToken', token),
  clearToken: () => syncStorage.removeItem('accessToken'),
  onUnauthorized: () => router.replace('/(auth)/login'),
  getRefreshToken: () => syncStorage.getItem('refreshToken'),
  setRefreshToken: (token) => syncStorage.setItem('refreshToken', token),
});
