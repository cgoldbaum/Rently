'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import Toast from '@/components/Toast';

interface Payment {
  id: string;
  amount: number;
  period: string;
  dueDate: string;
  paidDate?: string;
  status: string;
  method?: string;
  contract: {
    property: { name?: string; address: string };
    tenant?: { name: string };
  };
}

const filters = [['all', 'Todos'], ['PAID', 'Pagados'], ['PENDING', 'Pendientes'], ['LATE', 'En mora']];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get('/payments').then(r => setPayments(r.data.data)).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);

  const thisMonthPaid = payments
    .filter(p => p.status === 'PAID')
    .reduce((s, p) => s + p.amount, 0);

  const pending = payments
    .filter(p => p.status === 'PENDING' || p.status === 'LATE')
    .reduce((s, p) => s + p.amount, 0);

  const lateCount = payments.filter(p => p.status === 'LATE').length;

  async function markPaid(payment: Payment) {
    try {
      const { data } = await api.patch(`/payments/${payment.id}`, {
        status: 'PAID',
        paidDate: new Date().toISOString(),
        method: payment.method ?? 'Transferencia',
      });
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: data.data.status, paidDate: data.data.paidDate } : p));
      setToast('Cobro marcado como pagado');
    } catch {
      setToast('Error al actualizar el cobro');
    }
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card hero">
          <div className="stat-label">Total cobrado</div>
          <div className="stat-value">USD {thisMonthPaid.toLocaleString('es-AR')}</div>
          <div className="stat-sub">en cobros pagados</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Pendiente</div>
          <div className="stat-value" style={{ color: pending > 0 ? 'var(--danger)' : 'inherit' }}>
            USD {pending.toLocaleString('es-AR')}
          </div>
          <div className="stat-sub">{lateCount > 0 ? `${lateCount} en mora` : 'todo al día ✓'}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Cobros totales</div>
          <div className="stat-value">{payments.length}</div>
          <div className="stat-sub">registrados</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Pagados</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{payments.filter(p => p.status === 'PAID').length}</div>
          <div className="stat-sub">confirmados</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" style={{ marginBottom: 0 }}>
            {filters.map(([v, l]) => (
              <button key={v} className={`tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="dollar" size={32} /></div>
            <div className="empty-text">No hay cobros{filter !== 'all' ? ' en este estado' : ''}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Propiedad</th><th>Inquilino</th><th>Período</th><th>Monto</th><th>Vencimiento</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.contract.property.name ?? p.contract.property.address}</td>
                    <td>{p.contract.tenant?.name ?? '—'}</td>
                    <td>{p.period}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>USD {p.amount.toLocaleString('es-AR')}</td>
                    <td>{new Date(p.dueDate).toLocaleDateString('es-AR')}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      {(p.status === 'PENDING' || p.status === 'LATE') && (
                        <button className="btn btn-sm btn-secondary" onClick={() => markPaid(p)}>
                          <Icon name="check" size={13} /> Marcar pagado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
