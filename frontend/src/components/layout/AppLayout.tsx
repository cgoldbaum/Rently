'use client';

import { ReactNode } from 'react';
import ToastProvider from '@/components/ToastProvider';

export function AppLayout({
  sidebarOpen,
  setSidebarOpen,
  sidebar,
  topbar,
  children,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app">
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {sidebar}

      <main className="main">
        {topbar}
        <div className="page-content">
          {children}
        </div>
      </main>
      <ToastProvider />
    </div>
  );
}
