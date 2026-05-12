'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

interface Payment {
  id: string;
  amount: number;
  currency?: 'ARS' | 'USD';
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

interface PaymentReceipt {
  receiptNumber: string;
  issuedAt: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  period: string;
  paidDate?: string;
  method?: string;
  property?: string;
  mp?: {
    paymentId: string;
    status: string;
    statusDetail?: string;
    paymentMethodId?: string;
    paymentTypeId?: string;
    transactionAmount?: number;
    currencyId?: string;
    payerEmail?: string;
    dateApproved?: string;
  } | null;
}

function formatMoney(amount: number, currency: 'ARS' | 'USD' = 'USD') {
  const s = new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  return currency === 'USD' ? s.replace('US$', 'USD') : s;
}

function fitFontSize(str: string, base: number): number {
  if (str.length <= 9) return base;
  if (str.length <= 12) return Math.round(base * 0.78);
  if (str.length <= 15) return Math.round(base * 0.62);
  return Math.round(base * 0.50);
}

const filters = [['all', 'Todos'], ['PAID', 'Pagados'], ['PENDING', 'Pendientes'], ['PENDING_CONFIRMATION', 'A confirmar'], ['LATE', 'En mora']];

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
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    const res = await api.get('/payments');
    setPayments(res.data.data);
  }, []);

  useEffect(() => {
    loadPayments().catch(() => {});
  }, [loadPayments]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadPayments().catch(() => {});
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadPayments]);

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const totalPaidUsd = payments.filter(p => p.status === 'PAID' && (p.currency ?? 'USD') === 'USD').reduce((s, p) => s + p.amount, 0);
  const totalPaidArs = payments.filter(p => p.status === 'PAID' && p.currency === 'ARS').reduce((s, p) => s + p.amount, 0);
  const pendingUsd = payments.filter(p => (p.status === 'PENDING' || p.status === 'LATE') && (p.currency ?? 'USD') === 'USD').reduce((s, p) => s + p.amount, 0);
  const pendingArs = payments.filter(p => (p.status === 'PENDING' || p.status === 'LATE') && p.currency === 'ARS').reduce((s, p) => s + p.amount, 0);
  const lateCount = payments.filter(p => p.status === 'LATE').length;

  function openMarkPaid(payment: Payment) {
    setPendingPayment(payment);
    setSelectedMethod(payment.method || 'Transferencia');
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
      setToast(pendingPayment.status === 'PENDING_CONFIRMATION' ? 'Pago confirmado' : 'Cobro registrado como pagado');
    } catch {
      setToast('Error al actualizar el cobro');
    } finally {
      setConfirming(false);
    }
  }

  async function downloadPdf() {
    setDownloadingPdf(true);
    try {
      const { data } = await api.get('/owner/reports/payments/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-cobros-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast('Error al generar el PDF');
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function openReceipt(paymentId: string) {
    setReceiptPaymentId(paymentId);
    setReceipt(null);
    setReceiptLoading(true);
    try {
      const res = await api.get(`/payments/${paymentId}/receipt`);
      setReceipt(res.data.data);
    } catch {
      setToast('No se pudo cargar el comprobante');
    } finally {
      setReceiptLoading(false);
    }
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card hero">
          <div className="stat-label">Total cobrado</div>
          <div className="stat-value" style={{ fontSize: fitFontSize(formatMoney(totalPaidUsd, 'USD'), 38) }}>
            {formatMoney(totalPaidUsd, 'USD')}
          </div>
          <div className="stat-sub">{formatMoney(totalPaidArs, 'ARS')} en cobros pagados</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Pendiente</div>
          <div className="stat-value" style={{ fontSize: fitFontSize(formatMoney(pendingUsd, 'USD'), 28), color: (pendingUsd + pendingArs) > 0 ? 'var(--danger)' : 'inherit' }}>
            {formatMoney(pendingUsd, 'USD')}
          </div>
          <div className="stat-sub">{formatMoney(pendingArs, 'ARS')} · {lateCount > 0 ? `${lateCount} en mora` : 'todo al día ✓'}</div>
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
          <button className="btn btn-secondary btn-sm" onClick={downloadPdf} disabled={downloadingPdf}>
            <Icon name="file" size={14} /> {downloadingPdf ? 'Generando...' : 'Descargar PDF'}
          </button>
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
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{formatMoney(p.amount, p.currency ?? 'USD')}</td>
                    <td>{new Date(p.dueDate).toLocaleDateString('es-AR')}</td>
                    <td><MethodBadge method={p.method} /></td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      {p.status === 'PAID' && (
                        <button className="btn btn-sm btn-secondary" onClick={() => openReceipt(p.id)}>
                          <Icon name="file" size={13} /> Ver comprobante
                        </button>
                      )}
                      {(p.status === 'PENDING' || p.status === 'LATE' || p.status === 'PENDING_CONFIRMATION') && (
                        <button className="btn btn-sm btn-secondary" onClick={() => openMarkPaid(p)}>
                          <Icon name="check" size={13} /> {p.status === 'PENDING_CONFIRMATION' ? 'Confirmar pago' : 'Marcar pagado'}
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

      {/* Mark Paid Modal */}
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
              {formatMoney(pendingPayment.amount, pendingPayment.currency ?? 'USD')}
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
                    flex: 1, padding: '10px 8px', borderRadius: 8,
                    border: selectedMethod === key ? `2px solid ${cfg.color}` : '2px solid var(--border)',
                    background: selectedMethod === key ? cfg.bg : 'var(--bg-elevated)',
                    color: selectedMethod === key ? cfg.color : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {receiptPaymentId && (
        <Modal
          title="Comprobante de pago"
          onClose={() => { setReceiptPaymentId(null); setReceipt(null); }}
          footer={
            <button className="btn btn-primary" onClick={() => { setReceiptPaymentId(null); setReceipt(null); }}>
              Cerrar
            </button>
          }
        >
          {receiptLoading && <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Cargando comprobante...</div>}
          {!receiptLoading && receipt && (
            <div style={{ display: 'grid', gap: 8, background: '#f9f7f3', border: '1px solid #e5e0d8', borderRadius: 10, padding: '14px 14px 10px' }}>
              {[
                ['ID de operación', receipt.mp?.paymentId ?? receipt.receiptNumber.slice(0, 8).toUpperCase()],
                ['Propiedad', receipt.property ?? '—'],
                ['Período', receipt.period],
                ['Monto', formatMoney(receipt.amount, receipt.currency ?? 'USD')],
                ['Método', receipt.method ?? 'Efectivo'],
                ['Fecha pago', receipt.paidDate ? new Date(receipt.paidDate).toLocaleDateString('es-AR') : '—'],
                ...(receipt.mp?.status !== 'approved' ? [['Estado MP', receipt.mp?.status ?? '—']] : []),
                ...(receipt.mp?.statusDetail && receipt.mp.statusDetail !== 'accredited' ? [['Detalle estado', receipt.mp.statusDetail]] : []),
                ...(receipt.mp?.payerEmail ? [['Pagado por', receipt.mp.payerEmail]] : []),
                ...(receipt.mp?.dateApproved ? [['Fecha de acreditación', new Date(receipt.mp.dateApproved).toLocaleDateString('es-AR')]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, borderBottom: '1px solid #e5e0d8', paddingBottom: 7 }}>
                  <span style={{ color: '#7b7468', fontWeight: 600 }}>{k}</span>
                  <span style={{ fontWeight: 700, color: '#2f2b26', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
