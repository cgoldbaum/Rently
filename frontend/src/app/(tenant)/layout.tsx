'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateFull } from '@rently/shared';
import Icon from '@/components/Icon';
import ToastProvider from '@/components/ToastProvider';
import NotificationDropdown from '@/components/NotificationDropdown';

const navItems = [
  { href: '/tenant', label: 'Inicio', icon: 'home' as const },
  { href: '/tenant/contract', label: 'Contrato', icon: 'file' as const },
  { href: '/tenant/payments', label: 'Pagos', icon: 'dollar' as const },
  { href: '/tenant/claims', label: 'Reclamos', icon: 'clipboard' as const },
  { href: '/tenant/expensas', label: 'Expensas', icon: 'chart' as const },
  { href: '/tenant/chat', label: 'Chat', icon: 'message' as const },
  { href: '/tenant/ai-chat', label: 'Asistente IA', icon: 'star' as const },
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
    const token = sessionStorage.getItem('accessToken');
    const userRaw = sessionStorage.getItem('user');
    if (!token) {
      router.replace('/login');
    } else if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u.role !== 'TENANT') router.replace('/');
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
          {navItems.map(item => {
            const isActive = item.href === '/tenant' ? pathname === '/tenant' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Link
            href="/tenant/settings"
            className="sidebar-user"
            style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
            onClick={() => setSidebarOpen(false)}
          >
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name ?? '—'}</div>
              <div className="sidebar-user-plan">Inquilino</div>
            </div>
            <Icon name="settings" size={14} color="var(--text-muted)" />
          </Link>
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
            <div>
              <div className="topbar-title">
                {user ? `Hola, ${user.name.split(' ')[0]}` : 'Portal Inquilino'}
              </div>
              <div className="topbar-subtitle">
                {formatDateFull(new Date())}
              </div>
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
                onItemClick={onItemClick}
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
