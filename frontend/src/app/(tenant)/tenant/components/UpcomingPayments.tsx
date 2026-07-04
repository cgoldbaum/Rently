'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatDate } from '@rently/shared';

type UpcomingPayment = {
  id: string;
  month: string;
  dueDate: string;
  amount: number;
  status: string;
  method?: string;
  hasAdjustment: boolean;
  adjustmentPct: number | null;
};

type UpcomingPaymentsProps = {
  payments: UpcomingPayment[];
};

export default function UpcomingPayments({ payments }: UpcomingPaymentsProps) {
  const { t } = useTranslation('dashboard');
  if (payments.length === 0) return null;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{t('tenant.nextPayment')}</div>
        <Link href="/tenant/payments" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>{t('tenant.viewPayments')}</Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {payments.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: i === 0 ? 'var(--accent-bg)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: `1px solid ${i === 0 ? 'rgba(91,123,94,0.25)' : 'transparent'}` }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', textTransform: 'capitalize' }}>{p.month}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('tenant.dueOn', { date: formatDate(p.dueDate) })}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{formatMoney(p.amount)}</div>
              {p.hasAdjustment && (
                <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>{t('tenant.adjustmentBadge', { pct: p.adjustmentPct })}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
