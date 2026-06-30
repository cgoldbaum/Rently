'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateFull } from '@rently/shared';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import type { SubscriptionSummary } from '@/types/subscription';

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'home' },
  { href: '/properties', label: 'Propiedades', icon: 'building' },
  { href: '/payments', label: 'Cobros', icon: 'dollar' },
  { href: '/claims', label: 'Reclamos', icon: 'clipboard' },
  { href: '/adjustments', label: 'Ajustes por índice', icon: 'trending' },
  { href: '/chat', label: 'Chat', icon: 'message' },
  { href: '/ai-chat', label: 'Asistente IA', icon: 'star' },
  { href: '/performance', label: 'Rendimiento', icon: 'chart' },
  { href: '/reports', label: 'Reportes', icon: 'file' },
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/properties': 'Propiedades',
  '/payments': 'Cobros',
  '/claims': 'Reclamos',
  '/adjustments': 'Ajustes por Índice',
  '/chat': 'Chat',
  '/ai-chat': 'Asistente IA',
  '/photos': 'Registro Fotográfico',
  '/reports': 'Reportes',
  '/performance': 'Rendimiento',
  '/settings': 'Configuración',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/properties/')) return 'Propiedades';
  return 'Rently';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);
  const initFromStorage = useAuthStore(s => s.initFromStorage);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setReadIds(new Set(JSON.parse(localStorage.getItem('owner_notif_read') || '[]'))); } catch {}
  }, []);

  function toggleRead(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setReadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('owner_notif_read', JSON.stringify([...next]));
      return next;
    });
  }

  function markAllRead() {
    const allIds = notifications.map(n => n.id);
    const next = new Set(allIds);
    localStorage.setItem('owner_notif_read', JSON.stringify([...next]));
    setReadIds(next);
  }

  const { data: notifications = [] } = useQuery<{
    type: string; subtype: string; message: string; detail: string;
    propertyAddress: string; date: string; id: string;
  }[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/dashboard/notifications');
      return res.data.data;
    },
    refetchInterval: 60000,
    enabled: typeof window !== 'undefined' && !!sessionStorage.getItem('accessToken'),
  });

  const { data: subscription } = useQuery<SubscriptionSummary>({
    queryKey: ['owner-subscription-summary'],
    queryFn: async () => {
      const res = await api.get('/owner/subscription');
      return res.data.data;
    },
    enabled: typeof window !== 'undefined' && !!sessionStorage.getItem('accessToken') && user?.role !== 'TENANT',
    staleTime: 30000,
  });

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
  useEffect(() => { setToday(new Date()); }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    const userRaw = sessionStorage.getItem('user');
    if (!token) {
      router.replace('/login');
    } else if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        const canOwner = u.canOwner ?? (u.role === 'OWNER');
        const view = sessionStorage.getItem('activeView') ?? (canOwner ? 'owner' : 'tenant');
        if (!canOwner || view === 'tenant') router.replace('/tenant');
      } catch {}
    }
  }, [router]);

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    router.push('/login');
  }

  const isOnDashboard = pathname === '/';
  const title = isOnDashboard ? `Hola, ${user?.name?.split(' ')[0] ?? 'usuario'} 👋` : getPageTitle(pathname);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U';
  const userPlan = subscription?.subscription ? `Propietario · Plan ${subscription.subscription.plan.name}` : 'Propietario · Sin plan';

  return (
    <AppLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
      sidebar={
        <Sidebar
          navItems={navItems}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          initials={initials}
          userName={user?.name ?? '—'}
          userPlan={userPlan}
          onLogout={handleLogout}
        />
      }
      topbar={
        <Topbar
          title={title}
          subtitle={today ? formatDateFull(today) : ''}
          notifRef={notifRef}
          notifications={notifications}
          readIds={readIds}
          notifOpen={notifOpen}
          setNotifOpen={setNotifOpen}
          toggleRead={toggleRead}
          markAllRead={markAllRead}
          onItemClick={() => setNotifOpen(false)}
        />
      }
    >
      {children}
    </AppLayout>
  );
}
