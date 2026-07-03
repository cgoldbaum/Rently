'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'sonner';
import { i18n } from '@/lib/i18n';
import { enableLocaleHydration, useLocaleStore } from '@/store/locale';
import { enableThemeHydration, useThemeStore } from '@/store/theme';

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  }));

  const language = useLocaleStore((s) => s.language);
  const themePreference = useThemeStore((s) => s.preference);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    enableLocaleHydration();
    useLocaleStore.getState().hydrate();
    enableThemeHydration();
    useThemeStore.getState().hydrate();
  }, []);

  // Mantiene el atributo lang del <html> en sync con el idioma activo.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Mantiene la clase 'dark' del <html> en sync con el tema activo.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Si la preferencia es 'system', sigue los cambios de tema del SO en vivo.
  useEffect(() => {
    if (themePreference !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => useThemeStore.getState().hydrate();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [themePreference]);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster theme={theme} richColors position="top-right" />
      </QueryClientProvider>
    </I18nextProvider>
  );
}
