'use client';

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
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 420, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Registrar pago en efectivo</div>
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14, fontSize: 13 }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Pago seleccionado</div>
          <div style={{ fontWeight: 700 }}>{payment.period} · {formatMoney(payment.amount, payment.currency ?? 'ARS')}</div>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Nota (opcional)</label>
            <textarea
              placeholder="Ej: Lo coordiné por WhatsApp con el propietario"
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
            />
          </div>
          {isError && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
              {(error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al registrar el pago.'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={isPending}
              style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              {isPending ? 'Avisando...' : 'Avisar pago'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
