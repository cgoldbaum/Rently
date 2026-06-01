import { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { hydrateStorage } from '../src/storage';
import { useAuthStore } from '../src/store/auth';
import { registerForPushNotificationsAsync, savePushToken } from '../src/lib/pushNotifications';

type AuthState = ReturnType<typeof useAuthStore.getState>;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const initFromStorage = useAuthStore((s: AuthState) => s.initFromStorage);
  const user = useAuthStore((s: AuthState) => s.user);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    hydrateStorage().then(() => initFromStorage());
  }, []);

  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) savePushToken(token);
    });

    notifListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notificación recibida en primer plano — Expo la muestra automáticamente
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data) return;

      if (data.type === 'chat' && data.contractId) {
        router.push(`/chat/${data.contractId}` as any);
      } else if (data.type === 'claim') {
        router.push(user.role === 'TENANT' ? '/(tenant)/claims' : '/(owner)/claims');
      } else if (data.type === 'payment') {
        router.push(user.role === 'TENANT' ? '/(tenant)/payments' : '/(owner)/payments');
      } else if (data.type === 'contract') {
        router.push('/(tenant)/contract');
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
