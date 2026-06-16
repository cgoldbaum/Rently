'use client';

import Link from 'next/link';
import Icon from '@/components/Icon';
import { formatDateShort } from '@rently/shared';

export interface Notification {
  id: string;
  type: string;
  message: string;
  detail?: string;
  date?: string;
  propertyAddress?: string;
  read?: boolean;
}

export interface NotificationDropdownProps {
  notifications: Notification[];
  readIds: Set<string>;
  notifOpen: boolean;
  setNotifOpen: (open: boolean) => void;
  toggleRead: (id: string, e: React.MouseEvent) => void;
  markAllRead: () => void;
  onItemClick: () => void;
}

const typeStyles: Record<string, { bg: string; color: string; icon: string }> = {
  claim:      { bg: '#fef2f2', color: '#dc2626', icon: '⚠' },
  payment:    { bg: '#fffbeb', color: '#d97706', icon: '$' },
  adjustment: { bg: '#f0f9ff', color: '#0284c7', icon: '↑' },
  contract:   { bg: '#faf5ff', color: '#7c3aed', icon: '📋' },
};

function getTypeStyle(type: string) {
  return typeStyles[type] ?? { bg: '#f9fafb', color: '#6b7280', icon: '•' };
}

function getHref(type: string) {
  return type === 'claim' ? '/claims' : type === 'payment' ? '/payments' : type === 'contract' ? '/properties' : '/adjustments';
}

export default function NotificationDropdown({
  notifications,
  readIds,
  notifOpen,
  setNotifOpen,
  toggleRead,
  markAllRead,
  onItemClick,
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <>
      <button
        className="btn-icon"
        style={{ position: 'relative' }}
        onClick={() => setNotifOpen(!notifOpen)}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
        aria-expanded={notifOpen}
        aria-haspopup="true"
      >
        <Icon name="bell" size={18} />
        {unreadCount > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 999, background: 'var(--danger)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {notifOpen && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 340, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notificaciones</span>
            {unreadCount > 0 && (
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
              const s = getTypeStyle(n.type);
              const href = getHref(n.type);
              const dateStr = n.date ? formatDateShort(n.date) : '';
              return (
                <div key={n.id} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-light)', alignItems: 'flex-start', background: isRead ? '#fff' : 'var(--accent-bg)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <Link href={href} onClick={onItemClick} style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: isRead ? 400 : 600, color: 'var(--text)' }}>{n.message}</p>
                    {n.detail && <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{n.detail}</p>}
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      {n.propertyAddress ? `${n.propertyAddress} · ` : ''}{dateStr}
                    </p>
                  </Link>
                  <button
                    onClick={(e) => toggleRead(n.id, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', flexShrink: 0, color: isRead ? 'var(--text-muted)' : 'var(--accent)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}
                  >
                    {isRead ? 'leída' : 'No Leída'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
