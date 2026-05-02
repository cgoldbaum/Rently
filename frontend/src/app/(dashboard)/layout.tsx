'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Icon from '@/components/Icon';

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'home' as const },
  { href: '/properties', label: 'Propiedades', icon: 'building' as const },
  { href: '/payments', label: 'Cobros', icon: 'dollar' as const },
  { href: '/claims', label: 'Reclamos', icon: 'clipboard' as const },
  { href: '/adjustments', label: 'Ajustes por índice', icon: 'trending' as const },
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/properties': 'Propiedades',
  '/payments': 'Cobros',
  '/claims': 'Reclamos',
  '/adjustments': 'Ajustes por Índice',
  '/photos': 'Registro Fotográfico',
  '/reports': 'Reportes',
  '/settings': 'Configuración',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/properties/')) return 'Propiedades';
  return 'Rently';
}

function formatDate(date: Date) {
  return date.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth, initFromStorage } = useAuthStore();
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
        if (u.role === 'TENANT') router.replace('/tenant');
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
          <img src="/rently_logo.png" alt="Rently" style={{ height: 64, width: 64, objectFit: 'contain', borderRadius: 16, filter: 'invert(52%) sepia(78%) saturate(600%) hue-rotate(349deg) brightness(70%) contrast(95%)' }} />
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
              <div className="sidebar-user-plan">Propietario · Plan Pro</div>
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
            <button
              className="btn-icon"
              style={{ display: 'none' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Icon name="menu" size={22} />
            </button>
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-subtitle">{today ? formatDate(today) : ''}</div>
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
                {notifications.filter(n => !readIds.has(n.id)).length > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 999, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                    {notifications.filter(n => !readIds.has(n.id)).length > 9 ? '9+' : notifications.filter(n => !readIds.has(n.id)).length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones</span>
                    {notifications.filter(n => !readIds.has(n.id)).length > 0 && (
                      <button onClick={markAllRead} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}>
                        Marcar todo como leído
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                        Todo al día, sin pendientes
                      </div>
                    ) : notifications.map((n) => {
                      const isRead = readIds.has(n.id);
                      const styles: Record<string, { bg: string; color: string; icon: string }> = {
                        claim:      { bg: '#fef2f2', color: '#dc2626', icon: '⚠' },
                        payment:    { bg: '#fffbeb', color: '#d97706', icon: '$' },
                        adjustment: { bg: '#f0f9ff', color: '#0284c7', icon: '↑' },
                        contract:   { bg: '#faf5ff', color: '#7c3aed', icon: '📋' },
                      };
                      const s = styles[n.type] ?? { bg: '#f9fafb', color: '#6b7280', icon: '•' };
                      const href = n.type === 'claim' ? '/claims' : n.type === 'payment' ? '/payments' : n.type === 'contract' ? '/properties' : '/adjustments';
                      const dateStr = new Date(n.date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
                      return (
                        <div key={n.id} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-light)', alignItems: 'flex-start', background: isRead ? '#fff' : 'var(--accent-bg)' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                            {s.icon}
                          </div>
                          <Link href={href} onClick={() => setNotifOpen(false)} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: isRead ? 400 : 600, color: 'var(--text)' }}>{n.message}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{n.detail}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{n.propertyAddress} · {dateStr}</p>
                          </Link>
                          <button
                            onClick={(e) => toggleRead(n.id, e)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', flexShrink: 0, color: isRead ? 'var(--text-muted)' : 'var(--accent)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}
                          >
                            {isRead ? 'No leída' : 'Leída'}
                          </button>
                        </div>
                      );
                    })}
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
