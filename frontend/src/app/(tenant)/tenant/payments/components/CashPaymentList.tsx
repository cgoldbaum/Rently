'use client';

import { useTranslation } from 'react-i18next';
import { formatMoney } from '@rently/shared';

type Payment = {
  id: string;
  period: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  dueDate: string;
  paidDate?: string;
  status: string;
  method?: string;
  cashNote?: string;
};

type CashPaymentListProps = {
  payment: Payment;
  note: string;
  onNoteChange: (note: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
};

export default function CashPaymentList({
  payment,
  note,
  onNoteChange,
  onSubmit,
  onClose,
  isPending,
  isError,
  error,
}: CashPaymentListProps) {
  const { t } = useTranslation('payments');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', maxWidth: 420, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>{t('cash.title')}</div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14, fontSize: 13 }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{t('cash.description')}</div>
          <div style={{ fontWeight: 700 }}>{payment.period} · {formatMoney(payment.amount, payment.currency ?? 'ARS')}</div>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>{t('cash.note')}</label>
            <textarea
              placeholder={t('cash.notePlaceholder')}
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
            />
          </div>
          {isError && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              {(error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? t('cash.toastError')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={isPending}
              style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              {isPending ? t('cash.submitting') : t('cash.submit')}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              {t('cash.close')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
