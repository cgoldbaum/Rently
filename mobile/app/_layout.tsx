import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { hydrateStorage } from '../src/storage';
import { useAuthStore } from '../src/store/auth';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage);

  useEffect(() => {
    hydrateStorage().then(() => initFromStorage());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
