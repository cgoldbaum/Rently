'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useToastStore } from '@/store/toast';
import { formatMoney, formatDate } from '@rently/shared';
import PaymentSummaryCards from './components/PaymentSummaryCards';
import MercadoPagoPayment from './components/MercadoPagoPayment';
import TransferPaymentInfo from './components/TransferPaymentInfo';
import CashPaymentList from './components/CashPaymentList';
import PaymentReceiptModal from './components/PaymentReceiptModal';

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
type UpcomingPayment = {
  id: string;
  month: string;
  dueDate: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  status: string;
  method?: string;
  hasAdjustment: boolean;
  adjustmentPct: number | null;
};
type OwnerPaymentInfo = {
  alias: string;
  cbu: string;
  email: string;
  whatsapp: string;
  ownerName: string;
};

export default function TenantPaymentsPage() {
  const { t } = useTranslation('payments');
  const queryClient = useQueryClient();
  const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    PAID:                 { label: t('tenant.statusPaid'),                color: 'var(--accent)',  bg: 'var(--accent-bg)' },
    PENDING:              { label: t('tenant.statusPending'),             color: 'var(--warning)', bg: 'var(--warning-bg)' },
    LATE:                 { label: t('tenant.statusLate'),               color: 'var(--danger)',  bg: 'var(--danger-bg)' },
    PENDING_CONFIRMATION: { label: t('tenant.statusPendingConfirmation'),   color: 'var(--warning)', bg: 'var(--warning-bg)' },
  };
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashPayment, setCashPayment] = useState<Payment | null>(null);
  const [cashNote, setCashNote] = useState('');
  const [transferPayment, setTransferPayment] = useState<Payment | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const { data: paymentsData } = useQuery<{ data: Payment[]; total: number; page: number }>({
    queryKey: ['tenant-payments', filter, page],
    queryFn: async () => {
      const res = await api.get('/tenant/payments', {
        params: { status: filter || undefined, page },
      });
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const { data: upcoming = [] } = useQuery<UpcomingPayment[]>({
    queryKey: ['tenant-upcoming'],
    queryFn: async () => {
      const res = await api.get('/tenant/payments/upcoming');
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const { data: contract } = useQuery<{ monthlyAmount: number; currency?: 'ARS' | 'USD'; ownerPaymentInfo: OwnerPaymentInfo } | null>({
    queryKey: ['tenant-contract'],
    queryFn: async () => {
      try { const res = await api.get('/tenant/contract'); return res.data.data; }
      catch { return null; }
    },
  });

  const cashMutation = useMutation({
    mutationFn: (data: { paymentId: string; note?: string; method?: string }) =>
      api.post('/tenant/payments/cash', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-upcoming'] });
      setShowCashModal(false);
      setCashPayment(null);
      setCashNote('');
    },
    onError: () => useToastStore.getState().showToast(t('cash.toastError')),
  });

  const transferMutation = useMutation({
    mutationFn: (data: { paymentId: string; note?: string }) =>
      api.post('/tenant/payments/cash', { ...data, method: 'Transferencia' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payments'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-upcoming'] });
      setTransferPayment(null);
      setTransferNote('');
    },
    onError: () => useToastStore.getState().showToast(t('transfer.toastError')),
  });

  const mpMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await api.post(`/tenant/payments/${paymentId}/mercadopago`);
      return res.data.data as { initPoint: string; mode: string };
    },
    onSuccess: (data) => {
      window.open(data.initPoint, '_blank', 'noopener');
    },
    onError: () => useToastStore.getState().showToast(t('mp.error')),
  });

  const payments = paymentsData?.data ?? [];
  const total = paymentsData?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const totalPaid = payments.filter(p => p.status === 'PAID').length;
  const totalPending = payments.filter(p => p.status === 'PENDING' || p.status === 'PENDING_CONFIRMATION').length;
  const totalLate = payments.filter(p => p.status === 'LATE').length;

  function handleCashSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cashPayment) return;
    cashMutation.mutate({ paymentId: cashPayment.id, note: cashNote || undefined });
  }

  function openCashModal(payment: Payment) {
    setCashPayment(payment);
    setCashNote('');
    setShowCashModal(true);
  }

  function copyTransferData(value: string) {
    navigator.clipboard?.writeText(value);
  }

  function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!transferPayment) return;
    transferMutation.mutate({ paymentId: transferPayment.id, note: transferNote || undefined });
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {receiptId && <PaymentReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />}

      {showCashModal && cashPayment && (
        <CashPaymentList
          payment={cashPayment}
          note={cashNote}
          onNoteChange={setCashNote}
          onSubmit={handleCashSubmit}
          onClose={() => { setShowCashModal(false); setCashPayment(null); setCashNote(''); }}
          isPending={cashMutation.isPending}
          isError={cashMutation.isError}
          error={cashMutation.error}
        />
      )}

      {transferPayment && contract?.ownerPaymentInfo && (
        <TransferPaymentInfo
          payment={transferPayment}
          ownerInfo={contract.ownerPaymentInfo}
          note={transferNote}
          onNoteChange={setTransferNote}
          onCopy={copyTransferData}
          onSubmit={handleTransferSubmit}
          onClose={() => { setTransferPayment(null); setTransferNote(''); }}
          isPending={transferMutation.isPending}
          isError={transferMutation.isError}
          error={transferMutation.error}
        />
      )}

      {upcoming.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>{t('tenant.upcomingTitle')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: i === 0 ? 'var(--accent-bg)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{p.month}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('tenant.dueDate', { date: `${new Date(p.dueDate).getDate()}/${new Date(p.dueDate).getMonth() + 1}` })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{formatMoney(p.amount, p.currency ?? contract?.currency ?? 'ARS')}</div>
                  {p.hasAdjustment && <div style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>{t('tenant.adjustment', { pct: p.adjustmentPct })}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PaymentSummaryCards
        totalPaid={totalPaid}
        totalPending={totalPending}
        totalLate={totalLate}
        activeFilter={filter}
        onFilterChange={(f) => { setFilter(f); setPage(1); }}
      />

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {payments.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            {t('tenant.noPayments')}
          </div>
        ) : payments.map((p, i) => {
          const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.PENDING;
          const canPay = p.status === 'PENDING' || p.status === 'LATE';
          return (
            <div
              key={p.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '14px 18px', borderBottom: i < payments.length - 1 ? '1px solid var(--border-light)' : 'none', cursor: p.status === 'PAID' ? 'pointer' : 'default' }}
              onClick={() => p.status === 'PAID' && setReceiptId(p.id)}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>{p.period}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t('tenant.dueDate', { date: formatDate(p.dueDate) })}
                  {p.paidDate && ` · ${t('tenant.paidOn', { date: formatDate(p.paidDate) })}`}
                  {p.method && ` · ${p.method}`}
                </div>
                {p.cashNote && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, fontStyle: 'italic' }}>&ldquo;{p.cashNote}&rdquo;</div>}
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{formatMoney(p.amount)}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6 }}>
                  {st.label}
                </span>
                {canPay && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 4 }}>
                    <MercadoPagoPayment
                      paymentId={p.id}
                      isLoading={mpMutation.isPending}
                      onPay={(id) => mpMutation.mutate(id)}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTransferPayment(p); }}
                      style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      {t('tenant.payByTransfer')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openCashModal(p); }}
                      style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      {t('tenant.payByCash')}
                    </button>
                  </div>
                )}
                {p.status === 'PENDING_CONFIRMATION' && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('tenant.pendingConfirmation')}</span>
                )}
                {p.status === 'PAID' && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('tenant.viewReceipt')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'var(--font)' }}
          >
            {t('tenant.previous')}
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            {t('tenant.pageOf', { page, total: totalPages })}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'var(--font)' }}
          >
            {t('tenant.next')}
          </button>
        </div>
      )}
    </div>
  );
}
