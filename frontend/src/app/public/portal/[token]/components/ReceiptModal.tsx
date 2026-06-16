'use client';

import { formatMoney, formatDate } from '@rently/shared';

interface Payment {
  id: string; period: string; amount: number;
  dueDate: string; paidDate?: string; status: string; method?: string;
}

export default function ReceiptModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 400, width: '100%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ background: '#16a34a', padding: '24px 24px 20px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Pago confirmado</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{formatMoney(payment.amount)}</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {[
            ['Período',  payment.period],
            ['Método',   payment.method ?? 'Efectivo'],
            ['Fecha de pago', payment.paidDate ? formatDate(payment.paidDate) : '—'],
            ['Vencimiento',   formatDate(payment.dueDate)],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>
              <span style={{ color: '#6b7280' }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <button
            onClick={onClose}
            style={{ width: '100%', marginTop: 16, padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
