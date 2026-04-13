'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

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

const METHOD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Efectivo':      { label: 'Efectivo',      color: '#166534', bg: '#dcfce7' },
  'Mercado Pago':  { label: 'Mercado Pago',  color: '#1d4ed8', bg: '#dbeafe' },
  'Transferencia': { label: 'Transferencia', color: '#374151', bg: '#f3f4f6' },
};

function MethodBadge({ method }: { method?: string }) {
  if (!method) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  const cfg = METHOD_CONFIG[method] ?? { label: method, color: '#374151', bg: '#f3f4f6' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, borderRadius: 4, padding: '2px 8px' }}>
      {cfg.label}
    </span>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('Transferencia');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api.get('/payments').then(r => setPayments(r.data.data)).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);

  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const pending   = payments.filter(p => p.status === 'PENDING' || p.status === 'LATE').reduce((s, p) => s + p.amount, 0);
  const lateCount = payments.filter(p => p.status === 'LATE').length;

  function openMarkPaid(payment: Payment) {
    setPendingPayment(payment);
    setSelectedMethod('Transferencia');
  }

  async function confirmMarkPaid() {
    if (!pendingPayment) return;
    setConfirming(true);
    try {
      const { data } = await api.patch(`/payments/${pendingPayment.id}`, {
        status: 'PAID',
        paidDate: new Date().toISOString(),
        method: selectedMethod,
      });
      setPayments(prev => prev.map(p => p.id === pendingPayment.id ? { ...p, ...data.data } : p));
      setPendingPayment(null);
      setToast('Cobro registrado como pagado');
    } catch {
      setToast('Error al actualizar el cobro');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card hero">
          <div className="stat-label">Total cobrado</div>
          <div className="stat-value">USD {totalPaid.toLocaleString('es-AR')}</div>
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
                <tr>
                  <th>Propiedad</th><th>Inquilino</th><th>Período</th>
                  <th>Monto</th><th>Vencimiento</th><th>Método</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.contract.property.name ?? p.contract.property.address}</td>
                    <td>{p.contract.tenant?.name ?? '—'}</td>
                    <td>{p.period}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>USD {p.amount.toLocaleString('es-AR')}</td>
                    <td>{new Date(p.dueDate).toLocaleDateString('es-AR')}</td>
                    <td><MethodBadge method={p.method} /></td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      {(p.status === 'PENDING' || p.status === 'LATE') && (
                        <button className="btn btn-sm btn-secondary" onClick={() => openMarkPaid(p)}>
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

      {pendingPayment && (
        <Modal
          title="Registrar pago"
          onClose={() => setPendingPayment(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPendingPayment(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmMarkPaid} disabled={confirming}>
                {confirming ? 'Guardando...' : 'Confirmar pago'}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {pendingPayment.contract.property.name ?? pendingPayment.contract.property.address}
              {pendingPayment.contract.tenant && ` · ${pendingPayment.contract.tenant.name}`}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22 }}>
              USD {pendingPayment.amount.toLocaleString('es-AR')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Período {pendingPayment.period}</div>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Método de pago</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {Object.entries(METHOD_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMethod(key)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: selectedMethod === key ? `2px solid ${cfg.color}` : '2px solid var(--border)',
                    background: selectedMethod === key ? cfg.bg : 'var(--bg-elevated)',
                    color: selectedMethod === key ? cfg.color : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
