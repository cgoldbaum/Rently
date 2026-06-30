'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';
import ViewSwitch from '@/components/ViewSwitch';

export type NavItem = { href: string; label: string; icon: string };

export function Sidebar({
  navItems,
  sidebarOpen,
  setSidebarOpen,
  initials,
  userName,
  userPlan,
  settingsHref = '/settings',
  onLogout,
}: {
  navItems: NavItem[];
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  initials: string;
  userName: string;
  userPlan: string;
  settingsHref?: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
      <div className="sidebar-logo">
        <img src="/rently_logo.svg" alt="Rently" style={{ height: 64, width: 64, objectFit: 'contain', borderRadius: 16, filter: 'invert(52%) sepia(78%) saturate(600%) hue-rotate(349deg) brightness(70%) contrast(95%)' }} />
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => {
          const isActive = item.href === '/' || item.href === '/tenant'
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon name={item.icon as any} size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <Link
          href={settingsHref}
          className="sidebar-user"
          style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
          onClick={() => setSidebarOpen(false)}
        >
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-user-plan">{userPlan}</div>
          </div>
          <Icon name="settings" size={14} color="var(--text-muted)" />
        </Link>
        <ViewSwitch />
        <button
          className="nav-item"
          style={{ color: 'var(--danger)', marginTop: 4 }}
          onClick={onLogout}
        >
          <Icon name="logout" size={16} color="var(--danger)" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
