import { describe, it, expect, beforeEach } from 'vitest';
import { createAuthStore, type SyncStorage } from './createAuthStore';

function createMockStorage(): SyncStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
}

describe('createAuthStore', () => {
  let storage: SyncStorage;

  beforeEach(() => {
    storage = createMockStorage();
  });

  it('starts with null user and accessToken', () => {
    const useStore = createAuthStore(storage);
    const state = useStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('setAuth stores user and token in both memory and storage', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 'test@test.com', role: 'OWNER' as const };

    useStore.getState().setAuth(user, 'token-123');

    const state = useStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('token-123');
    expect(storage.getItem('accessToken')).toBe('token-123');
    expect(storage.getItem('user')).toBe(JSON.stringify(user));
  });

  it('setAuth stores refreshToken if provided', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 'test@test.com', role: 'OWNER' as const };

    useStore.getState().setAuth(user, 'token-123', 'refresh-456');

    expect(storage.getItem('refreshToken')).toBe('refresh-456');
  });

  it('clearAuth removes everything', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 'test@test.com', role: 'OWNER' as const };

    useStore.getState().setAuth(user, 'token-123');
    useStore.getState().clearAuth();

    const state = useStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(storage.getItem('accessToken')).toBeNull();
    expect(storage.getItem('user')).toBeNull();
  });

  it('initFromStorage restores state from storage', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 'test@test.com', role: 'OWNER' as const };

    storage.setItem('accessToken', 'token-123');
    storage.setItem('user', JSON.stringify(user));

    useStore.getState().initFromStorage();

    const state = useStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('token-123');
  });

  it('setUser updates user in both memory and storage', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 'test@test.com', role: 'OWNER' as const };

    useStore.getState().setAuth(user, 'token-123');

    const updatedUser = { ...user, name: 'Updated' };
    useStore.getState().setUser(updatedUser);

    const state = useStore.getState();
    expect(state.user?.name).toBe('Updated');
    expect(storage.getItem('user')).toContain('Updated');
  });
});
