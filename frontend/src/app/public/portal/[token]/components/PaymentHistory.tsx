'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney, formatDate } from '@rently/shared';

const PAY_STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  PAID:    { color: '#16a34a', bg: '#f0fdf4' },
  PENDING: { color: '#d97706', bg: '#fffbeb' },
  LATE:    { color: '#dc2626', bg: '#fef2f2' },
};

interface Payment {
  id: string; period: string; amount: number;
  dueDate: string; paidDate?: string; status: string; method?: string;
}

interface PaymentHistoryProps {
  payments: Payment[];
  pendingPayments: Payment[];
  confirmingId: string | null;
  onConfirmStart: (id: string) => void;
  onConfirmSubmit: (id: string) => void;
  onConfirmCancel: () => void;
  isConfirming: boolean;
  confirmError: boolean;
  onViewReceipt: (payment: Payment) => void;
}

export default function PaymentHistory({
  payments, pendingPayments, confirmingId,
  onConfirmStart, onConfirmSubmit, onConfirmCancel,
  isConfirming, confirmError, onViewReceipt,
}: PaymentHistoryProps) {
  const { t } = useTranslation('portal');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {pendingPayments.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            {t('paymentHistory.pending')}
          </div>
          {pendingPayments.map((p) => {
            const st = PAY_STATUS_COLORS[p.status] ?? PAY_STATUS_COLORS.PENDING;
            const stLabel = t(`domain:paymentStatus.${p.status}`, p.status);
            const isConfirmingThis = confirmingId === p.id;
            return (
              <div key={p.id} style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: 12, padding: '16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{formatMoney(p.amount)}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      {p.period} · {t('paymentHistory.dueShort', { date: formatDate(p.dueDate) })}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: st.color, background: '#fff', padding: '3px 8px', borderRadius: 6, border: `1px solid ${st.color}40` }}>
                    {stLabel}
                  </span>
                </div>
                {!isConfirmingThis ? (
                  <Button
                    onClick={() => onConfirmStart(p.id)}
                    style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none' }}
                  >
                    {t('paymentHistory.registerCash')}
                  </Button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '12px', fontSize: 13, color: '#374151', border: '1px solid #e5e7eb' }}
                      dangerouslySetInnerHTML={{ __html: t('paymentHistory.confirmCash', { amount: `<strong>${formatMoney(p.amount)}</strong>` }) }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        onClick={() => onConfirmSubmit(p.id)}
                        disabled={isConfirming}
                        style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none' }}
                      >
                        {isConfirming ? t('paymentHistory.confirming') : t('paymentHistory.yesConfirm')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={onConfirmCancel}
                        style={{ flex: 1 }}
                      >
                        {t('common:cancel')}
                      </Button>
                    </div>
                    {confirmError && (
                      <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{t('paymentHistory.confirmError')}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          {t('paymentHistory.history')}
        </div>
        {payments.length === 0 ? (
          <Card><CardContent style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>{t('paymentHistory.noPay')}</CardContent></Card>
        ) : (
          payments.map((p) => {
            const st = PAY_STATUS_COLORS[p.status] ?? PAY_STATUS_COLORS.PENDING;
            const stLabel = t(`domain:paymentStatus.${p.status}`, p.status);
            return (
              <div
                key={p.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 8, cursor: p.status === 'PAID' ? 'pointer' : 'default' }}
                onClick={() => p.status === 'PAID' && onViewReceipt(p)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.period}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                    {t('paymentHistory.dueShort', { date: formatDate(p.dueDate) })}
                    {p.paidDate && ` · ${t('paymentHistory.paidOn', { date: formatDate(p.paidDate) })}`}
                    {p.method && ` · ${p.method}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{formatMoney(p.amount)}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{stLabel}</span>
                  {p.status === 'PAID' && (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{t('paymentHistory.viewReceipt')}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
