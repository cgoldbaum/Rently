'use client';

import { useTranslation } from 'react-i18next';

interface AlertBannerProps {
  notifications: { type: string; msg: string; detail: string; action?: () => void }[];
}

export default function AlertBanner({ notifications }: AlertBannerProps) {
  const { t } = useTranslation('portal');

  if (notifications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{t('alert.allGood')}</div>
        <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{t('alert.noAlerts')}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {t('alert.title', { count: notifications.length })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map((n, i) => {
          const colors: Record<string, { bg: string; icon: string; color: string }> = {
            payment:    { bg: '#fffbeb', icon: '💰', color: '#d97706' },
            urgent:     { bg: '#fef2f2', icon: '🚨', color: '#dc2626' },
            adjustment: { bg: '#f0f9ff', icon: '📈', color: '#0284c7' },
            claim:      { bg: '#faf5ff', icon: '🔧', color: '#7c3aed' },
          };
          const s = colors[n.type] ?? { bg: '#f9fafb', icon: 'ℹ️', color: '#6b7280' };
          return (
            <div
              key={i}
              onClick={n.action}
              style={{ display: 'flex', gap: 12, padding: '12px 16px', background: s.bg, borderRadius: 10, border: `1px solid ${s.color}30`, cursor: n.action ? 'pointer' : 'default', alignItems: 'flex-start' }}
            >
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{n.msg}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{n.detail}</div>
              </div>
              {n.action && <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 18 }}>›</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
