'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import MethodBadge from '@/components/MethodBadge';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { useToastStore } from '@/store/toast';
import { formatMoney, formatDateShort } from '@rently/shared';

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
    tenants?: { name: string }[];
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

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('payments');
  const [filter, setFilter] = useState('all');
  const filters: [string, string][] = [
    ['all', t('filters.all')],
    ['PENDING', t('filters.pending')],
    ['LATE', t('filters.overdue')],
    ['PAID', t('filters.paid')],
  ];
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('Transferencia');
  const METHOD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    Transferencia: { label: t('markPaid.methodTransfer'), color: 'var(--purple)', bg: 'var(--purple-bg)' },
    Efectivo: { label: t('markPaid.methodCash'), color: 'var(--accent)', bg: 'var(--accent-bg)' },
    'Mercado Pago': { label: t('markPaid.methodMp'), color: 'var(--info)', bg: 'var(--info-bg)' },
    MERCADO_PAGO: { label: t('markPaid.methodMp'), color: 'var(--info)', bg: 'var(--info-bg)' },
  };
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments').then(r => r.data.data),
    refetchInterval: 10000,
  });

  const markPaidMutation = useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) =>
      api.patch(`/payments/${id}`, {
        status: 'PAID',
        paidDate: new Date().toISOString(),
        method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const filtered = useMemo(() => filter === 'all' ? payments : payments.filter(p => p.status === filter), [payments, filter]);
  const totalPaidUsd = useMemo(() => payments.filter(p => p.status === 'PAID' && (p.currency ?? 'USD') === 'USD').reduce((s, p) => s + p.amount, 0), [payments]);
  const totalPaidArs = useMemo(() => payments.filter(p => p.status === 'PAID' && p.currency === 'ARS').reduce((s, p) => s + p.amount, 0), [payments]);
  const pendingUsd = useMemo(() => payments.filter(p => (p.status === 'PENDING' || p.status === 'LATE') && (p.currency ?? 'USD') === 'USD').reduce((s, p) => s + p.amount, 0), [payments]);
  const pendingArs = useMemo(() => payments.filter(p => (p.status === 'PENDING' || p.status === 'LATE') && p.currency === 'ARS').reduce((s, p) => s + p.amount, 0), [payments]);
  const lateCount = useMemo(() => payments.filter(p => p.status === 'LATE').length, [payments]);

  function openMarkPaid(payment: Payment) {
    setPendingPayment(payment);
    setSelectedMethod(payment.method || 'Transferencia');
  }

  async function confirmMarkPaid() {
    if (!pendingPayment) return;
    try {
      await markPaidMutation.mutateAsync({ id: pendingPayment.id, method: selectedMethod });
      setPendingPayment(null);
      useToastStore.getState().showToast(pendingPayment.status === 'PENDING_CONFIRMATION' ? t('toast.paymentConfirmed') : t('toast.markedAsPaid'));
    } catch {
      useToastStore.getState().showToast(t('toast.updateError'));
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
      useToastStore.getState().showToast(t('toast.pdfError'));
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
      useToastStore.getState().showToast(t('toast.receiptError'));
    } finally {
      setReceiptLoading(false);
    }
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card hero">
          <div className="stat-label">{t('stats.totalCollected')}</div>
          <div className="stat-value">
            {formatMoney(totalPaidUsd, 'USD')}
          </div>
          <div className="stat-sub">{formatMoney(totalPaidArs, 'ARS')} {t('stats.inPaidCharges')}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">{t('stats.pending')}</div>
          <div className="stat-value" style={{ color: (pendingUsd + pendingArs) > 0 ? 'var(--danger)' : 'inherit' }}>
            {formatMoney(pendingUsd, 'USD')}
          </div>
          <div className="stat-sub">{formatMoney(pendingArs, 'ARS')} · {lateCount > 0 ? `${lateCount} ${t('stats.overdue')}` : t('stats.allCaughtUp')}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">{t('stats.totalPayments')}</div>
          <div className="stat-value">{payments.length}</div>
          <div className="stat-sub">{t('stats.registered')}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">{t('stats.paid')}</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{payments.filter(p => p.status === 'PAID').length}</div>
          <div className="stat-sub">{t('stats.confirmed')}</div>
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
            <Icon name="file" size={14} /> {downloadingPdf ? t('actions.generating') : t('actions.downloadPdf')}
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="dollar" size={32} /></div>
            <div className="empty-text">{t('empty.noPayments')}{filter !== 'all' ? ` ${t('empty.inThisStatus')}` : ''}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('table.property')}</th><th>{t('table.tenant')}</th><th>{t('table.period')}</th>
                  <th>{t('table.amount')}</th><th>{t('table.dueDate')}</th><th>{t('table.method')}</th><th>{t('table.status')}</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.contract.property.name ?? p.contract.property.address}</td>
                    <td>{p.contract.tenants?.map(t => t.name).join(', ') || '—'}</td>
                    <td>{p.period}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{formatMoney(p.amount, p.currency ?? 'USD')}</td>
                    <td>{formatDateShort(p.dueDate)}</td>
                    <td><MethodBadge method={p.method} /></td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      {p.status === 'PAID' && (
                        <button className="btn btn-sm btn-secondary" onClick={() => openReceipt(p.id)}>
                          <Icon name="file" size={13} /> {t('actions.viewReceipt')}
                        </button>
                      )}
                      {(p.status === 'PENDING' || p.status === 'LATE' || p.status === 'PENDING_CONFIRMATION') && (
                        <button className="btn btn-sm btn-secondary" onClick={() => openMarkPaid(p)}>
                          <Icon name="check" size={13} /> {p.status === 'PENDING_CONFIRMATION' ? t('actions.confirmPayment') : t('actions.markPaid')}
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
          title={t('markPaid.title')}
          onClose={() => setPendingPayment(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPendingPayment(null)}>{t('actions.cancel')}</button>
              <button className="btn btn-primary" onClick={confirmMarkPaid} disabled={markPaidMutation.isPending}>
                {markPaidMutation.isPending ? t('actions.saving') : t('actions.confirmPayment')}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {pendingPayment.contract.property.name ?? pendingPayment.contract.property.address}
              {pendingPayment.contract.tenants?.length ? ` · ${pendingPayment.contract.tenants.map(t => t.name).join(', ')}` : ''}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22 }}>
              {formatMoney(pendingPayment.amount, pendingPayment.currency ?? 'USD')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t('markPaid.period')} {pendingPayment.period}</div>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label id="method-label">{t('markPaid.methodLabel')}</label>
            <div role="radiogroup" aria-labelledby="method-label" style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {Object.entries(METHOD_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selectedMethod === key}
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
          title={t('receipt.title')}
          onClose={() => { setReceiptPaymentId(null); setReceipt(null); }}
          footer={
            <button className="btn btn-primary" onClick={() => { setReceiptPaymentId(null); setReceipt(null); }}>
              {t('actions.close')}
            </button>
          }
        >
          {receiptLoading && <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('receipt.loading')}</div>}
          {!receiptLoading && receipt && (
            <div style={{ display: 'grid', gap: 8, background: '#FCEEE1', border: '1px solid #F0D3B0', borderRadius: 10, padding: '14px 14px 10px' }}>
              {[
                [t('receipt.operationId'), receipt.mp?.paymentId ?? receipt.receiptNumber.slice(0, 8).toUpperCase()],
                [t('receipt.property'), receipt.property ?? '—'],
                [t('receipt.period'), receipt.period],
                [t('receipt.amount'), formatMoney(receipt.amount, receipt.currency ?? 'USD')],
                [t('receipt.method'), receipt.method ?? t('domain:paymentMethod.CASH')],
                [t('receipt.paymentDate'), receipt.paidDate ? formatDateShort(receipt.paidDate) : '—'],
                ...(receipt.mp?.status !== 'approved' ? [[t('receipt.mpStatus'), receipt.mp?.status ?? '—']] : []),
                ...(receipt.mp?.statusDetail && receipt.mp.statusDetail !== 'accredited' ? [[t('receipt.mpDetail'), receipt.mp.statusDetail]] : []),
                ...(receipt.mp?.payerEmail ? [[t('receipt.paidBy'), receipt.mp.payerEmail]] : []),
                ...(receipt.mp?.dateApproved ? [[t('receipt.accreditationDate'), formatDateShort(receipt.mp.dateApproved)]] : []),
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

    </>
  );
}
