'use client';

import { Button } from '@/components/ui/button';
import { formatMoney, formatDate } from '@rently/shared';

interface PaymentCardProps {
  nextPayment: { amount: number; dueDate: string };
  daysLeft: number;
  onViewPayments: () => void;
}

export default function PaymentCard({ nextPayment, daysLeft, onViewPayments }: PaymentCardProps) {
  return (
    <div style={{
      background: daysLeft < 0 ? '#fef2f2' : daysLeft <= 5 ? '#fffbeb' : '#fff',
      border: `1px solid ${daysLeft < 0 ? '#fca5a5' : daysLeft <= 5 ? '#fcd34d' : '#e5e7eb'}`,
      borderRadius: 12, padding: '20px 20px',
    }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Próximo pago</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: daysLeft < 0 ? '#dc2626' : '#111827', marginBottom: 4 }}>
        {formatMoney(nextPayment.amount)}
      </div>
      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
        {daysLeft < 0
          ? `Venció el ${formatDate(nextPayment.dueDate)} (hace ${Math.abs(daysLeft)} días)`
          : daysLeft === 0
          ? `Vence hoy · ${formatDate(nextPayment.dueDate)}`
          : `Vence el ${formatDate(nextPayment.dueDate)} · en ${daysLeft} días`}
      </div>
      <Button
        onClick={onViewPayments}
        style={{ background: daysLeft < 0 ? '#dc2626' : '#6366f1', color: '#fff', border: 'none' }}
      >
        Ver pagos
      </Button>
    </div>
  );
}
