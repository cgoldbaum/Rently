'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { formatMoney, formatDate } from '@rently/shared';

interface PaymentCardProps {
  nextPayment: { amount: number; dueDate: string };
  daysLeft: number;
  onViewPayments: () => void;
}

export default function PaymentCard({ nextPayment, daysLeft, onViewPayments }: PaymentCardProps) {
  const { t } = useTranslation('portal');

  let dueDateText: string;
  if (daysLeft < 0) {
    dueDateText = t('payment.overdue', { date: formatDate(nextPayment.dueDate), days: Math.abs(daysLeft) });
  } else if (daysLeft === 0) {
    dueDateText = t('payment.dueToday', { date: formatDate(nextPayment.dueDate) });
  } else {
    dueDateText = t('payment.dueIn', { date: formatDate(nextPayment.dueDate), days: daysLeft });
  }

  return (
    <div style={{
      background: daysLeft < 0 ? '#fef2f2' : daysLeft <= 5 ? '#fffbeb' : '#fff',
      border: `1px solid ${daysLeft < 0 ? '#fca5a5' : daysLeft <= 5 ? '#fcd34d' : '#e5e7eb'}`,
      borderRadius: 12, padding: '20px 20px',
    }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{t('payment.nextPayment')}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: daysLeft < 0 ? '#dc2626' : '#111827', marginBottom: 4 }}>
        {formatMoney(nextPayment.amount)}
      </div>
      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
        {dueDateText}
      </div>
      <Button
        onClick={onViewPayments}
        style={{ background: daysLeft < 0 ? '#dc2626' : '#6366f1', color: '#fff', border: 'none' }}
      >
        {t('payment.viewPayments')}
      </Button>
    </div>
  );
}
