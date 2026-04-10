'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import Icon from '@/components/Icon';

const navItems = [
  { href: '/', label: 'Dashboard', icon: 'home' as const },
  { href: '/properties', label: 'Propiedades', icon: 'building' as const },
  { href: '/payments', label: 'Cobros', icon: 'dollar' as const },
  { href: '/claims', label: 'Reclamos', icon: 'clipboard' as const },
  { href: '/adjustments', label: 'Ajustes por índice', icon: 'trending' as const },
  { href: '/photos', label: 'Registro fotográfico', icon: 'camera' as const },
  { href: '/professionals', label: 'Profesionales', icon: 'wrench' as const },
  { href: '/reports', label: 'Reportes', icon: 'chart' as const },
  { href: '/settings', label: 'Configuración', icon: 'settings' as const },
];

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/properties': 'Propiedades',
  '/payments': 'Cobros',
  '/claims': 'Reclamos',
  '/adjustments': 'Ajustes por Índice',
  '/photos': 'Registro Fotográfico',
  '/professionals': 'Red de Profesionales',
  '/reports': 'Reportes',
  '/settings': 'Configuración',
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/properties/')) return 'Propiedades';
  return 'Rently';
}

function formatDate() {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth, initFromStorage } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) router.replace('/login');
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
          <div className="sidebar-logo-icon">R</div>
          <span className="sidebar-logo-text">Rently</span>
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
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name ?? '—'}</div>
              <div className="sidebar-user-plan">Propietario · Plan Pro</div>
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
            <button
              className="btn-icon"
              style={{ display: 'none' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Icon name="menu" size={22} />
            </button>
            <div>
              <div className="topbar-title">{title}</div>
              <div className="topbar-subtitle">{formatDate()}</div>
            </div>
          </div>
          <div className="topbar-right">
            <Link href="/claims" className="btn-icon" style={{ position: 'relative' }}>
              <Icon name="bell" size={18} />
              <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }} />
            </Link>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}
