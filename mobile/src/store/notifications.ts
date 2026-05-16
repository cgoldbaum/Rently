import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'owner_notif_read';

interface OwnerNotifReadState {
  readIds: Set<string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggle: (id: string) => void;
  markAllRead: (ids: string[]) => void;
}

// Owner notifications have no backend read state — it is tracked locally,
// mirroring the web app's localStorage approach.
export const useOwnerNotifRead = create<OwnerNotifReadState>((set, get) => ({
  readIds: new Set(),
  hydrated: false,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) set({ readIds: new Set(JSON.parse(raw) as string[]) });
    } catch {
      // Ignore corrupt data — start fresh.
    }
    set({ hydrated: true });
  },
  toggle: (id) => {
    const next = new Set(get().readIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    set({ readIds: next });
  },
  markAllRead: (ids) => {
    const next = new Set([...get().readIds, ...ids]);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    set({ readIds: next });
  },
}));
