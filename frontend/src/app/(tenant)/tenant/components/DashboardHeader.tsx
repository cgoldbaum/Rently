'use client';

import Link from 'next/link';
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

type DashboardHeaderProps = {
  userName?: string;
  nextPayment?: UpcomingPayment;
  daysLeft: number | null;
  canPayNext: boolean;
  onPayNow: () => void;
};

export default function DashboardHeader({
  userName,
  nextPayment,
  daysLeft,
  canPayNext,
  onPayNow,
}: DashboardHeaderProps) {
  return (
    <>
      {userName && (
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          Hola, {userName}
        </div>
      )}
      {nextPayment && (
        <div style={{
          background: daysLeft !== null && daysLeft < 0 ? 'var(--danger-bg)' : daysLeft !== null && daysLeft <= 5 ? 'var(--warning-bg)' : 'var(--bg-card)',
          border: `1px solid ${daysLeft !== null && daysLeft < 0 ? 'var(--danger)' : daysLeft !== null && daysLeft <= 5 ? 'var(--warning)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: 24,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 4 }}>
            Próximo pago
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: daysLeft !== null && daysLeft < 0 ? 'var(--danger)' : 'var(--text)', marginBottom: 4 }}>
            {formatMoney(nextPayment.amount)}
            {nextPayment.hasAdjustment && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)', marginLeft: 12, background: 'var(--warning-bg)', padding: '3px 8px', borderRadius: 6 }}>
                Ajuste +{nextPayment.adjustmentPct}%
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {daysLeft === null ? '—' :
              daysLeft < 0 ? `Venció el ${formatDate(nextPayment.dueDate)} (hace ${Math.abs(daysLeft)} días)` :
              daysLeft === 0 ? `Vence hoy · ${formatDate(nextPayment.dueDate)}` :
              `Vence el ${formatDate(nextPayment.dueDate)} · en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {canPayNext && (
              <button
                type="button"
                onClick={onPayNow}
                style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 0, borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                Pagar ahora
              </button>
            )}
            <Link
              href="/tenant/payments"
              style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--bg-card)', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
            >
              Ver pagos
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
