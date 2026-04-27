'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type UpcomingPayment = {
  id: string;
  month: string;
  dueDate: string;
  amount: number;
  status: string;
  method?: string;
  hasAdjustment: boolean;
  adjustmentPct: number | null;
};

type Claim = { id: string; status: string; title?: string; category: string };
type OwnerPaymentInfo = {
  alias: string;
  cbu: string;
  email: string;
  whatsapp: string;
  ownerName: string;
};

function fmtCurrency(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function TenantDashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [payModal, setPayModal] = useState<'methods' | 'transfer' | 'cash' | null>(null);
  const [cashNote, setCashNote] = useState('');

  const { data: upcoming = [], isError: upcomingError } = useQuery<UpcomingPayment[]>({
    queryKey: ['tenant-upcoming'],
    queryFn: async () => {
      const res = await api.get('/tenant/payments/upcoming');
      return res.data.data;
    },
  });

  const { data: claims = [] } = useQuery<Claim[]>({
    queryKey: ['tenant-claims'],
    queryFn: async () => {
      const res = await api.get('/tenant/claims');
      return res.data.data;
    },
  });

  const { data: contract } = useQuery<{ endDate: string; monthlyAmount: number; progress: number; ownerPaymentInfo: OwnerPaymentInfo } | null>({
    queryKey: ['tenant-contract'],
    queryFn: async () => {
      try {
        const res = await api.get('/tenant/contract');
        return res.data.data;
      } catch {
        return null;
      }
    },
  });

  const mpMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const res = await api.post(`/tenant/payments/${paymentId}/mercadopago`);
      return res.data.data as { initPoint: string };
    },
    onSuccess: (data) => {
      window.location.href = data.initPoint;
    },
  });

  const cashMutation = useMutation({
    mutationFn: async (data: { paymentId: string; note?: string }) => api.post('/tenant/payments/cash', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-upcoming'] });
      setPayModal(null);
      setCashNote('');
    },
  });

  const next = upcoming.find(p => p.status !== 'PAID') ?? upcoming[0];
  const daysLeft = next ? daysUntil(next.dueDate) : null;
  const openClaims = claims.filter(c => c.status !== 'RESOLVED').length;
  const canPayNext = next && (next.status === 'PENDING' || next.status === 'LATE');

  function openPayModal() {
    setPayModal('methods');
    setCashNote('');
  }

  function handleCashSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!next) return;
    cashMutation.mutate({ paymentId: next.id, note: cashNote || undefined });
  }

  function copyValue(value: string) {
    navigator.clipboard?.writeText(value);
  }

  // No contract linked yet
  if (!upcomingError && upcoming.length === 0 && !contract) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Cuenta sin propiedad vinculada</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            Tu cuenta aún no está vinculada a ninguna propiedad. Pedile a tu propietario que te cargue en el sistema con tu email: <strong>{user?.email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {payModal && next && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Pagar alquiler</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'capitalize' }}>
                  {next.month} · {fmtCurrency(next.amount)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayModal(null)}
                style={{ border: 0, background: 'transparent', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ×
              </button>
            </div>

            {payModal === 'methods' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => mpMutation.mutate(next.id)}
                  disabled={mpMutation.isPending}
                  style={{ textAlign: 'left', padding: 14, border: '1px solid #bae6fd', background: '#f0f9ff', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  <div style={{ fontWeight: 800, color: '#0369a1' }}>{mpMutation.isPending ? 'Abriendo Mercado Pago...' : 'Mercado Pago'}</div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Pago online de prueba. Se acredita automáticamente.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPayModal('transfer')}
                  style={{ textAlign: 'left', padding: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  <div style={{ fontWeight: 800 }}>Transferencia</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Copiá alias/CBU y enviá el comprobante al propietario.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPayModal('cash')}
                  style={{ textAlign: 'left', padding: 14, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  <div style={{ fontWeight: 800 }}>Efectivo</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Coordiná con el propietario. Él lo marcará como pagado cuando lo reciba.</div>
                </button>
              </div>
            )}

            {payModal === 'transfer' && contract?.ownerPaymentInfo && (
              <div>
                {[
                  ['Alias', contract.ownerPaymentInfo.alias],
                  ['CBU/CVU', contract.ownerPaymentInfo.cbu],
                  ['Titular', contract.ownerPaymentInfo.ownerName],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, wordBreak: 'break-all' }}>{value || 'No configurado'}</div>
                    </div>
                    {value && (
                      <button type="button" onClick={() => copyValue(value)} style={{ alignSelf: 'center', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        Copiar
                      </button>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <a
                    href={`mailto:${contract.ownerPaymentInfo.email}?subject=Comprobante de pago ${encodeURIComponent(next.month)}&body=Hola, te envio el comprobante del pago de ${encodeURIComponent(next.month)} por ${encodeURIComponent(fmtCurrency(next.amount))}.`}
                    style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}
                  >
                    Mail
                  </a>
                  {contract.ownerPaymentInfo.whatsapp && (
                    <a
                      href={`https://wa.me/${contract.ownerPaymentInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te envio el comprobante del pago de ${next.month} por ${fmtCurrency(next.amount)}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ flex: 1, textAlign: 'center', padding: 10, background: '#25d366', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
                <button type="button" onClick={() => setPayModal('methods')} style={{ width: '100%', marginTop: 12, padding: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' }}>
                  Volver
                </button>
              </div>
            )}

            {payModal === 'cash' && (
              <form onSubmit={handleCashSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Coordiná el pago con el propietario. Al avisar pago, el propietario recibe la notificación y lo confirma cuando tenga el dinero.
                </div>
                <textarea
                  value={cashNote}
                  onChange={e => setCashNote(e.target.value)}
                  rows={3}
                  placeholder="Nota opcional"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontFamily: 'var(--font)', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setPayModal('methods')} style={{ flex: 1, padding: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontWeight: 700, cursor: 'pointer' }}>
                    Volver
                  </button>
                  <button type="submit" disabled={cashMutation.isPending} style={{ flex: 1, padding: 10, border: 0, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 800, cursor: 'pointer' }}>
                    {cashMutation.isPending ? 'Avisando...' : 'Avisar pago'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Next payment card */}
      {next && (
        <div style={{
          background: daysLeft !== null && daysLeft < 0 ? 'var(--danger-bg)' : daysLeft !== null && daysLeft <= 5 ? 'var(--warning-bg)' : 'var(--bg-card)',
          border: `1px solid ${daysLeft !== null && daysLeft < 0 ? 'var(--danger)' : daysLeft !== null && daysLeft <= 5 ? 'var(--warning)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: 24,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 4 }}>
            Próximo pago
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: daysLeft !== null && daysLeft < 0 ? 'var(--danger)' : 'var(--text)', marginBottom: 4 }}>
            {fmtCurrency(next.amount)}
            {next.hasAdjustment && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warning)', marginLeft: 12, background: 'var(--warning-bg)', padding: '3px 8px', borderRadius: 6 }}>
                Ajuste +{next.adjustmentPct}%
              </span>
            )}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {daysLeft === null ? '—' :
              daysLeft < 0 ? `Venció el ${fmtDate(next.dueDate)} (hace ${Math.abs(daysLeft)} días)` :
              daysLeft === 0 ? `Vence hoy · ${fmtDate(next.dueDate)}` :
              `Vence el ${fmtDate(next.dueDate)} · en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {canPayNext && (
              <button
                type="button"
                onClick={openPayModal}
                style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 0, borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                Pagar ahora
              </button>
            )}
            <Link
              href="/tenant/payments"
              style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--bg-card)', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
            >
              Ver pagos
            </Link>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Link href="/tenant/contract" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, cursor: 'pointer', transition: 'box-shadow var(--transition)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Contrato vence</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
              {contract ? fmtDate(contract.endDate) : '—'}
            </div>
            {contract && (
              <div style={{ marginTop: 8, height: 4, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--accent)', width: `${contract.progress}%`, borderRadius: 4 }} />
              </div>
            )}
          </div>
        </Link>

        <Link href="/tenant/claims" style={{ textDecoration: 'none' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, cursor: 'pointer' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Reclamos activos</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: openClaims > 0 ? 'var(--warning)' : 'var(--accent)' }}>
              {openClaims} pendiente{openClaims !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Ver todos →</div>
          </div>
        </Link>
      </div>

      {/* Upcoming payments preview */}
      {upcoming.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Próximos 3 pagos</div>
            <Link href="/tenant/payments" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Ver todo →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: i === 0 ? 'var(--accent-bg)' : 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: `1px solid ${i === 0 ? 'rgba(91,123,94,0.25)' : 'transparent'}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', textTransform: 'capitalize' }}>{p.month}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vence el {fmtDate(p.dueDate)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtCurrency(p.amount)}</div>
                  {p.hasAdjustment && (
                    <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>+{p.adjustmentPct}% ajuste</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
