'use client';

import { RefObject } from 'react';
import NotificationDropdown from '@/components/NotificationDropdown';

export function Topbar({
  title,
  subtitle,
  notifRef,
  notifications,
  readIds,
  notifOpen,
  setNotifOpen,
  toggleRead,
  markAllRead,
  onItemClick,
  children,
}: {
  title: string;
  subtitle: string;
  notifRef: RefObject<HTMLDivElement | null>;
  notifications: { id: string; type: string; message: string; date?: string; detail?: string; propertyAddress?: string }[];
  readIds: Set<string>;
  notifOpen: boolean;
  setNotifOpen: (open: boolean) => void;
  toggleRead: (id: string, e: React.MouseEvent) => void;
  markAllRead: () => void;
  onItemClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-subtitle">{subtitle}</div>
        </div>
      </div>
      <div className="topbar-right">
        {children}
        <div ref={notifRef as RefObject<HTMLDivElement>} style={{ position: 'relative' }}>
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
  );
}
