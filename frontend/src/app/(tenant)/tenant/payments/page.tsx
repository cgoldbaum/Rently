'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type Payment = {
  id: string;
  period: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
  method?: string;
  cashNote?: string;
};
type UpcomingPayment = {
  month: string;
  dueDate: string;
  amount: number;
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

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  PAID:                 { label: 'Pagado',                color: 'var(--accent)',  bg: 'var(--accent-bg)' },
  PENDING:              { label: 'Pendiente',             color: 'var(--warning)', bg: 'var(--warning-bg)' },
  LATE:                 { label: 'Vencido',               color: 'var(--danger)',  bg: 'var(--danger-bg)' },
  PENDING_CONFIRMATION: { label: 'Pend. confirmación',   color: '#b45309',        bg: '#fef3c7' },
};

function fmtCurrency(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type ReceiptData = {
  receiptNumber: string;
  issuedAt: string;
  amount: number;
  period: string;
  paidDate?: string;
  method?: string;
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
};

function ReceiptModal({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const { data: receipt, isLoading, isError } = useQuery<ReceiptData>({
    queryKey: ['receipt', paymentId],
    queryFn: async () => {
      const res = await api.get(`/tenant/payments/${paymentId}/receipt`);
      return res.data.data;
    },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 400, width: '100%', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ background: 'var(--accent)', padding: '24px 24px 20px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Comprobante de pago</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {isLoading && <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando...</p>}
          {isError && <p style={{ textAlign: 'center', color: 'var(--danger)' }}>No se pudo cargar el comprobante.</p>}
          {receipt && [
            ['N° comprobante', receipt.receiptNumber.slice(0, 8).toUpperCase()],
            ['Período', receipt.period],
            ['Monto', fmtCurrency(receipt.amount)],
            ['Método', receipt.method ?? 'Efectivo'],
            ['Fecha de pago', receipt.paidDate ? fmtDate(receipt.paidDate) : '—'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          {receipt?.mp && (
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Detalle Mercado Pago
              </div>
              {[
                ['ID operación', receipt.mp.paymentId],
                ['Estado MP', receipt.mp.status],
                ['Detalle estado', receipt.mp.statusDetail ?? '—'],
                ['Medio', receipt.mp.paymentMethodId ?? '—'],
                ['Tipo', receipt.mp.paymentTypeId ?? '—'],
                ['Email pagador', receipt.mp.payerEmail ?? '—'],
                ['Acreditado', receipt.mp.dateApproved ? fmtDate(receipt.mp.dateApproved) : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 600, marginLeft: 12, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onClose}
            style={{ width: '100%', marginTop: 16, padding: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantPaymentsPage() {
  const queryClient = useQueryClient();
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

  const { data: contract } = useQuery<{ monthlyAmount: number; ownerPaymentInfo: OwnerPaymentInfo } | null>({
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
  });

  const mpMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await api.post(`/tenant/payments/${paymentId}/mercadopago`);
      return res.data.data as { initPoint: string; mode: string };
    },
    onSuccess: (data) => {
      window.location.href = data.initPoint;
    },
  });

  const payments = paymentsData?.data ?? [];
  const total = paymentsData?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const FILTERS = [
    { key: '', label: 'Todos' },
    { key: 'PAID', label: 'Pagados' },
    { key: 'PENDING', label: 'Pendientes' },
    { key: 'LATE', label: 'Vencidos' },
    { key: 'PENDING_CONFIRMATION', label: 'En confirmación' },
  ];

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
      {receiptId && <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />}

      {/* Cash payment modal */}
      {showCashModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 420, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Registrar pago en efectivo</div>
            {cashPayment && (
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14, fontSize: 13 }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>Pago seleccionado</div>
                <div style={{ fontWeight: 700 }}>{cashPayment.period} · {fmtCurrency(cashPayment.amount)}</div>
              </div>
            )}
            <form onSubmit={handleCashSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Nota (opcional)</label>
                <textarea
                  placeholder="Ej: Lo coordiné por WhatsApp con el propietario"
                  value={cashNote}
                  onChange={e => setCashNote(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
                />
              </div>
              {cashMutation.isError && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  {(cashMutation.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al registrar el pago.'}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={cashMutation.isPending || !cashPayment}
                  style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  {cashMutation.isPending ? 'Avisando...' : 'Avisar pago'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCashModal(false); setCashPayment(null); setCashNote(''); }}
                  style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {transferPayment && contract?.ownerPaymentInfo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 'var(--radius)', maxWidth: 440, width: '100%', padding: 28, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Pagar por transferencia</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>
              {transferPayment.period} · {fmtCurrency(transferPayment.amount)}
            </div>
            <form onSubmit={handleTransferSubmit}>
              {[
                ['Alias', contract.ownerPaymentInfo.alias],
                ['CBU/CVU', contract.ownerPaymentInfo.cbu],
                ['Titular', contract.ownerPaymentInfo.ownerName],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, wordBreak: 'break-all' }}>{value || 'No configurado'}</div>
                  </div>
                  {value && (
                    <button type="button" onClick={() => copyTransferData(value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Copiar
                    </button>
                  )}
                </div>
              ))}
              <div style={{ marginTop: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Nota o referencia (opcional)</label>
                <textarea
                  placeholder="Ej: Transferí desde Banco Nación, comprobante 1234"
                  value={transferNote}
                  onChange={e => setTransferNote(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
                />
              </div>
              {transferMutation.isError && (
                <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, marginTop: 10 }}>
                  {(transferMutation.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Error al avisar la transferencia.'}
                </div>
              )}
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <button
                  type="submit"
                  disabled={transferMutation.isPending}
                  style={{ flex: 1, padding: 10, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  {transferMutation.isPending ? 'Avisando...' : 'Avisar transferencia'}
                </button>
                <a
                  href={`mailto:${contract.ownerPaymentInfo.email}?subject=Comprobante de pago ${encodeURIComponent(transferPayment.period)}&body=Hola, adjunto/envio el comprobante del pago de ${encodeURIComponent(transferPayment.period)} por ${encodeURIComponent(fmtCurrency(transferPayment.amount))}.`}
                  style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                >
                  Mail
                </a>
                {contract.ownerPaymentInfo.whatsapp && (
                  <a
                    href={`https://wa.me/${contract.ownerPaymentInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te envio el comprobante del pago de ${transferPayment.period} por ${fmtCurrency(transferPayment.amount)}.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ flex: 1, textAlign: 'center', padding: 10, background: '#25d366', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </form>
            <button
              type="button"
              onClick={() => { setTransferPayment(null); setTransferNote(''); }}
              style={{ width: '100%', marginTop: 12, padding: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Upcoming payments */}
      {upcoming.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Próximos pagos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: i === 0 ? 'var(--accent-bg)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{p.month}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vence {new Date(p.dueDate).getDate()}/{new Date(p.dueDate).getMonth() + 1}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{p.amount.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })}</div>
                  {p.hasAdjustment && <div style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>+{p.adjustmentPct}% ajuste</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Historial de pagos</div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1); }}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1.5px solid ${filter === f.key ? 'var(--accent)' : 'var(--border)'}`,
              background: filter === f.key ? 'var(--accent-bg)' : 'var(--bg-card)',
              color: filter === f.key ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Payment list */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {payments.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No hay pagos para mostrar.
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
                  Vto. {fmtDate(p.dueDate)}
                  {p.paidDate && ` · Pagado ${fmtDate(p.paidDate)}`}
                  {p.method && ` · ${p.method}`}
                </div>
                {p.cashNote && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, fontStyle: 'italic' }}>"{p.cashNote}"</div>}
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtCurrency(p.amount)}</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6 }}>
                  {st.label}
                </span>
                {canPay && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); mpMutation.mutate(p.id); }}
                      disabled={mpMutation.isPending}
                      style={{ padding: '6px 10px', border: 0, borderRadius: 6, background: '#009ee3', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      Mercado Pago
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTransferPayment(p); }}
                      style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      Transferencia
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openCashModal(p); }}
                      style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      Efectivo
                    </button>
                  </div>
                )}
                {p.status === 'PENDING_CONFIRMATION' && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Esperando confirmación del propietario</span>
                )}
                {p.status === 'PAID' && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ver comprobante →</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'var(--font)' }}
          >
            ← Anterior
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'var(--font)' }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
