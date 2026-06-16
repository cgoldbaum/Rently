'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney, formatDate } from '@rently/shared';

const PAY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID:    { label: 'Pagado',    color: '#16a34a', bg: '#f0fdf4' },
  PENDING: { label: 'Pendiente', color: '#d97706', bg: '#fffbeb' },
  LATE:    { label: 'Vencido',   color: '#dc2626', bg: '#fef2f2' },
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {pendingPayments.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
            Pendientes de pago
          </div>
          {pendingPayments.map((p) => {
            const st = PAY_STATUS[p.status] ?? PAY_STATUS.PENDING;
            const isConfirmingThis = confirmingId === p.id;
            return (
              <div key={p.id} style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: 12, padding: '16px', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{formatMoney(p.amount)}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      {p.period} · Vto. {formatDate(p.dueDate)}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: st.color, background: '#fff', padding: '3px 8px', borderRadius: 6, border: `1px solid ${st.color}40` }}>
                    {st.label}
                  </span>
                </div>
                {!isConfirmingThis ? (
                  <Button
                    onClick={() => onConfirmStart(p.id)}
                    style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none' }}
                  >
                    💵 Registrar pago en efectivo
                  </Button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '12px', fontSize: 13, color: '#374151', border: '1px solid #e5e7eb' }}>
                      ¿Confirmar que pagaste <strong>{formatMoney(p.amount)}</strong> en efectivo?
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        onClick={() => onConfirmSubmit(p.id)}
                        disabled={isConfirming}
                        style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none' }}
                      >
                        {isConfirming ? 'Confirmando...' : 'Sí, confirmar'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={onConfirmCancel}
                        style={{ flex: 1 }}
                      >
                        Cancelar
                      </Button>
                    </div>
                    {confirmError && (
                      <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>Error al confirmar. Intentá de nuevo.</p>
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
          Historial
        </div>
        {payments.length === 0 ? (
          <Card><CardContent style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No hay pagos registrados.</CardContent></Card>
        ) : (
          payments.map((p) => {
            const st = PAY_STATUS[p.status] ?? PAY_STATUS.PENDING;
            return (
              <div
                key={p.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 8, cursor: p.status === 'PAID' ? 'pointer' : 'default' }}
                onClick={() => p.status === 'PAID' && onViewReceipt(p)}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.period}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                    Vto. {formatDate(p.dueDate)}
                    {p.paidDate && ` · Pagado ${formatDate(p.paidDate)}`}
                    {p.method && ` · ${p.method}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{formatMoney(p.amount)}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span>
                  {p.status === 'PAID' && (
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Ver comprobante →</span>
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
