import { createAuthStore } from '@rently/shared';
import { syncStorage } from '../storage';

export const useAuthStore = createAuthStore(syncStorage);
