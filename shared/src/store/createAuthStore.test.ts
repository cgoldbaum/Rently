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

  it('setAuth on an owner defaults to owner view with no active tenant', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 'o@test.com', role: 'OWNER' as const, canOwner: true, canTenant: false };

    useStore.getState().setAuth(user, 'token-123');

    const state = useStore.getState();
    expect(state.activeView).toBe('owner');
    expect(state.activeTenantId).toBeNull();
    expect(storage.getItem('activeView')).toBe('owner');
    expect(storage.getItem('activeTenantId')).toBeNull();
  });

  it('setAuth on a tenant-only user defaults to tenant view with first tenant id', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 't@test.com', role: 'TENANT' as const, canOwner: false, canTenant: true, tenantIds: ['t1', 't2'] };

    useStore.getState().setAuth(user, 'token-123');

    const state = useStore.getState();
    expect(state.activeView).toBe('tenant');
    expect(state.activeTenantId).toBe('t1');
    expect(storage.getItem('activeTenantId')).toBe('t1');
  });

  it('initFromStorage falls back to a valid view when the stored view is no longer allowed', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 'o@test.com', role: 'OWNER' as const, canOwner: true, canTenant: false };

    storage.setItem('accessToken', 'token-123');
    storage.setItem('user', JSON.stringify(user));
    storage.setItem('activeView', 'tenant'); // ya no puede ser inquilino
    storage.setItem('activeTenantId', 'stale');

    useStore.getState().initFromStorage();

    const state = useStore.getState();
    expect(state.activeView).toBe('owner');
    expect(state.activeTenantId).toBeNull();
    expect(storage.getItem('activeView')).toBe('owner');
    expect(storage.getItem('activeTenantId')).toBeNull();
  });

  it('initFromStorage replaces a stale active tenant id with a valid one', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 't@test.com', role: 'TENANT' as const, canOwner: false, canTenant: true, tenantIds: ['t1', 't2'] };

    storage.setItem('accessToken', 'token-123');
    storage.setItem('user', JSON.stringify(user));
    storage.setItem('activeView', 'tenant');
    storage.setItem('activeTenantId', 'does-not-belong');

    useStore.getState().initFromStorage();

    const state = useStore.getState();
    expect(state.activeView).toBe('tenant');
    expect(state.activeTenantId).toBe('t1');
  });

  it('initFromStorage ignores a malformed stored view', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 'o@test.com', role: 'OWNER' as const, canOwner: true, canTenant: true, tenantIds: ['t1'] };

    storage.setItem('accessToken', 'token-123');
    storage.setItem('user', JSON.stringify(user));
    storage.setItem('activeView', 'garbage');

    useStore.getState().initFromStorage();

    expect(useStore.getState().activeView).toBe('owner');
  });

  it('setActiveView to owner clears the active tenant id', () => {
    const useStore = createAuthStore(storage);
    const user = { id: '1', name: 'Test', email: 't@test.com', role: 'TENANT' as const, canOwner: true, canTenant: true, tenantIds: ['t1'] };

    useStore.getState().setAuth(user, 'token-123');
    useStore.getState().setActiveView('tenant');
    useStore.getState().setActiveTenantId('t1');
    expect(useStore.getState().activeTenantId).toBe('t1');

    useStore.getState().setActiveView('owner');

    expect(useStore.getState().activeView).toBe('owner');
    expect(useStore.getState().activeTenantId).toBeNull();
    expect(storage.getItem('activeTenantId')).toBeNull();
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
