'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Icon from '@/components/Icon';
import NotificationDropdown from '@/components/NotificationDropdown';
import ToastProvider from '@/components/ToastProvider';
import ViewSwitch from '@/components/ViewSwitch';
import { formatDateFull } from '@rently/shared';
import type { SubscriptionSummary } from '@/types/subscription';

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'home' as const },
  { href: '/properties', label: 'Propiedades', icon: 'building' as const },
  { href: '/payments', label: 'Cobros', icon: 'dollar' as const },
  { href: '/claims', label: 'Reclamos', icon: 'clipboard' as const },
  { href: '/adjustments', label: 'Ajustes por índice', icon: 'trending' as const },
  { href: '/chat', label: 'Chat', icon: 'message' as const },
  { href: '/ai-chat', label: 'Asistente IA', icon: 'star' as const },
  { href: '/performance', label: 'Rendimiento', icon: 'chart' as const },
  { href: '/reports', label: 'Reportes', icon: 'file' as const },
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
    // Solo-cliente: se inicializa tras el montaje para no romper la hidratación SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    // La fecha actual se fija en el cliente para evitar desajustes de hidratación SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(new Date());
  }, []);

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

  return (
    <div className="app">
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/rently_logo.svg" alt="Rently" style={{ height: 64, width: 64, objectFit: 'contain', borderRadius: 16, filter: 'invert(52%) sepia(78%) saturate(600%) hue-rotate(349deg) brightness(70%) contrast(95%)' }} />
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)) ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link href="/settings" className="sidebar-user" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }} onClick={() => setSidebarOpen(false)}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name ?? '—'}</div>
              <div className="sidebar-user-plan">
                Propietario · {subscription?.subscription ? `Plan ${subscription.subscription.plan.name}` : 'Sin plan'}
              </div>
            </div>
            <Icon name="settings" size={14} color="var(--text-muted)" />
          </Link>
          <ViewSwitch />
          <button
            className="nav-item"
            style={{ color: 'var(--danger)', marginTop: 4 }}
            onClick={handleLogout}
          >
            <Icon name="logout" size={16} color="var(--danger)" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              className="btn-icon"
              style={{ display: 'none' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Abrir menú de navegación"
              aria-expanded={sidebarOpen}
            >
              <Icon name="menu" size={22} />
            </button>
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-subtitle">{today ? formatDateFull(today) : ''}</div>
            </div>
          </div>
          <div className="topbar-right">
            <div ref={notifRef} style={{ position: 'relative' }}>
              <NotificationDropdown
                notifications={notifications}
                readIds={readIds}
                notifOpen={notifOpen}
                setNotifOpen={setNotifOpen}
                toggleRead={toggleRead}
                markAllRead={markAllRead}
                onItemClick={() => setNotifOpen(false)}
              />
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
      <ToastProvider />
    </div>
  );
}
