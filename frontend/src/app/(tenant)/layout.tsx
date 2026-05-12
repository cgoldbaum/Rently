'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Icon from '@/components/Icon';

const navItems = [
  { href: '/tenant', label: 'Inicio', icon: 'home' as const },
  { href: '/tenant/contract', label: 'Contrato', icon: 'file' as const },
  { href: '/tenant/payments', label: 'Pagos', icon: 'dollar' as const },
  { href: '/tenant/claims', label: 'Reclamos', icon: 'clipboard' as const },
  { href: '/tenant/expensas', label: 'Expensas', icon: 'chart' as const },
];

type Notification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user, clearAuth, initFromStorage } = useAuthStore();
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
  const unreadCount = notifData?.unreadCount ?? 0;
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'I';

  const typeIcon: Record<string, 'dollar' | 'trending' | 'wrench' | 'photo'> = {
    PAYMENT: 'dollar',
    ADJUSTMENT: 'trending',
    CLAIM: 'wrench',
    PHOTO: 'photo',
  };

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
          <img src="/rently_logo.png" alt="Rently" style={{ height: 64, width: 64, objectFit: 'contain', borderRadius: 16, filter: 'invert(52%) sepia(78%) saturate(600%) hue-rotate(349deg) brightness(70%) contrast(95%)' }} />
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
          <div className="sidebar-user" style={{ textDecoration: 'none', color: 'inherit', cursor: 'default' }}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name ?? '—'}</div>
              <div className="sidebar-user-plan">Inquilino</div>
            </div>
          </div>
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
                {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                className="btn-icon"
                style={{ position: 'relative' }}
                onClick={() => setNotifOpen(o => !o)}
              >
                <Icon name="bell" size={18} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 999, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllReadMutation.mutate()}
                        style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}
                      >
                        Marcar todo como leído
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                        Todo al día, sin novedades
                      </div>
                    ) : notifications.map(n => (
                      <div
                        key={n.id}
                        style={{
                          display: 'flex',
                          gap: 12,
                          padding: '10px 16px',
                          borderBottom: '1px solid var(--border-light)',
                          background: n.read ? '#fff' : 'var(--accent-bg)',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name={typeIcon[n.type] ?? 'bell'} size={16} color="var(--text-muted)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: n.read ? 400 : 600, color: 'var(--text)' }}>{n.message}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{relativeTime(n.createdAt)}</p>
                        </div>
                        <button
                          onClick={() => n.read ? markUnreadMutation.mutate(n.id) : markReadMutation.mutate(n.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', flexShrink: 0, color: n.read ? 'var(--text-muted)' : 'var(--accent)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}
                        >
                          {n.read ? 'No leída' : 'Leída'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
