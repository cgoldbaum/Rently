'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { formatDateFull } from '@rently/shared';
import { AppLayout } from '@/components/layout/AppLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import type { SubscriptionSummary } from '@/types/subscription';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);
  const clearAuth = useAuthStore(s => s.clearAuth);
  const initFromStorage = useAuthStore(s => s.initFromStorage);
  const { t } = useTranslation('dashboard');
  const navItems = [
    { href: '/', label: t('nav.dashboard'), icon: 'home' },
    { href: '/properties', label: t('nav.properties'), icon: 'building' },
    { href: '/payments', label: t('nav.payments'), icon: 'dollar' },
    { href: '/claims', label: t('nav.claims'), icon: 'clipboard' },
    { href: '/adjustments', label: t('nav.adjustments'), icon: 'trending' },
    { href: '/chat', label: t('nav.chat'), icon: 'message' },
    { href: '/ai-chat', label: t('nav.aiChat'), icon: 'star' },
    { href: '/performance', label: t('nav.performance'), icon: 'chart' },
    { href: '/reports', label: t('nav.reports'), icon: 'file' },
  ];
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

  const pageTitleMap: Record<string, string> = useMemo(() => ({
    '/': t('nav.dashboard'),
    '/properties': t('nav.properties'),
    '/payments': t('nav.payments'),
    '/claims': t('nav.claims'),
    '/adjustments': t('nav.adjustments'),
    '/chat': t('nav.chat'),
    '/ai-chat': t('nav.aiChat'),
    '/photos': t('nav.photos'),
    '/reports': t('nav.reports'),
    '/performance': t('nav.performance'),
    '/settings': t('nav.settings'),
  }), [t]);

  const isOnDashboard = pathname === '/';
  const title = isOnDashboard
    ? t('greeting', { name: user?.name?.split(' ')[0] ?? t('user') })
    : pageTitleMap[pathname] ?? (pathname.startsWith('/properties/') ? t('nav.properties') : 'Rently');
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U';
  const userPlan = subscription?.subscription
    ? t('sidebar.ownerPlan', { plan: subscription.subscription.plan.name })
    : t('sidebar.ownerNoPlan');

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
