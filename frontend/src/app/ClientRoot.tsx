'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@/lib/i18n';
import { enableLocaleHydration, useLocaleStore } from '@/store/locale';

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

  useEffect(() => {
    enableLocaleHydration();
    useLocaleStore.getState().hydrate();
  }, []);

  // Mantiene el atributo lang del <html> en sync con el idioma activo.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </I18nextProvider>
  );
}
