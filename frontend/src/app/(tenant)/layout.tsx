'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateFull } from '@rently/shared';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import RentalSwitcher from '@/components/RentalSwitcher';
import AiAssistantWidget from '@/components/AiAssistantWidget';
import type { User } from '@rently/shared';

const navItems = [
  { href: '/tenant', label: 'Inicio', icon: 'home' },
  { href: '/tenant/contract', label: 'Contrato', icon: 'file' },
  { href: '/tenant/payments', label: 'Pagos', icon: 'dollar' },
  { href: '/tenant/claims', label: 'Reclamos', icon: 'clipboard' },
  { href: '/tenant/expensas', label: 'Expensas', icon: 'chart' },
  { href: '/tenant/chat', label: 'Chat', icon: 'message' },
  { href: '/tenant/ai-chat', label: 'Asistente IA', icon: 'star' },
];

type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);
  const initFromStorage = useAuthStore(s => s.initFromStorage);
  const setUser = useAuthStore(s => s.setUser);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useQuery<{ data: Notification[]; unreadCount: number }>({
    queryKey: ['tenant-notifications'],
    queryFn: async () => {
      const res = await api.get('/tenant/notifications');
      return res.data.data;
    },
    refetchInterval: 60000,
    enabled: typeof window !== 'undefined' && !!sessionStorage.getItem('accessToken'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/tenant/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-notifications'] }),
  });

  const markUnreadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/tenant/notifications/${id}/unread`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/tenant/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenant-notifications'] }),
  });

  // Refresca canOwner/canTenant al entrar a la app: si te acaban de dar de alta
  // como inquilino (o sos propietario en otra cuenta con el mismo email), el
  // switch de vista debe aparecer sin necesidad de volver a loguearse.
  const { data: freshUser } = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data ?? res.data;
    },
    enabled: typeof window !== 'undefined' && !!sessionStorage.getItem('accessToken'),
    staleTime: 30000,
  });
  useEffect(() => { if (freshUser) setUser(freshUser); }, [freshUser, setUser]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  useEffect(() => { initFromStorage(); }, [initFromStorage]);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    const userRaw = sessionStorage.getItem('user');
    if (!token) {
      router.replace('/login');
    } else if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        const canOwner = u.canOwner ?? (u.role === 'OWNER');
        const canTenant = u.canTenant ?? (u.role === 'TENANT');
        const view = sessionStorage.getItem('activeView') ?? (canOwner ? 'owner' : 'tenant');
        if (!canTenant || view === 'owner') router.replace('/');
      } catch {}
    }
  }, [router]);

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    router.push('/login');
  }

  const notifications = notifData?.data ?? [];
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'I';
  const readIds = new Set(notifications.filter(n => n.read).map(n => n.id));

  function toggleRead(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const n = notifications.find(n => n.id === id);
    if (n?.read) {
      markUnreadMutation.mutate(id);
    } else {
      markReadMutation.mutate(id);
    }
  }

  function markAllRead() {
    markAllReadMutation.mutate();
  }

  function onItemClick() {
    setNotifOpen(false);
  }

  const title = user ? `Hola, ${user.name.split(' ')[0]}` : 'Portal Inquilino';

  return (
    <AppLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
      sidebar={
        <Sidebar
          navItems={navItems}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          initials={initials}
          userName={user?.name ?? '—'}
          userPlan="Inquilino"
          settingsHref="/tenant/settings"
          onLogout={handleLogout}
        />
      }
      topbar={
        <Topbar
          title={title}
          subtitle={formatDateFull(new Date())}
          notifRef={notifRef}
          notifications={notifications}
          readIds={readIds}
          notifOpen={notifOpen}
          setNotifOpen={setNotifOpen}
          toggleRead={toggleRead}
          markAllRead={markAllRead}
          onItemClick={onItemClick}
        >
          <RentalSwitcher />
        </Topbar>
      }
    >
      {children}
      <AiAssistantWidget />
    </AppLayout>
  );
}
