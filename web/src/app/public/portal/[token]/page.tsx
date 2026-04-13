'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000' });

// ─── Types ────────────────────────────────────────────────────────────────────

type Payment = {
  id: string; period: string; amount: number;
  dueDate: string; paidDate?: string; status: string; method?: string;
};
type Claim = {
  id: string; category: string; description: string;
  status: string; priority: string; createdAt: string;
  history: { oldStatus: string; newStatus: string; comment?: string; changedAt: string }[];
};
type ClaimForm = {
  category: 'PLUMBING' | 'ELECTRICITY' | 'STRUCTURE' | 'OTHER' | '';
  description: string; photoUrl: string;
};

// ─── Labels ───────────────────────────────────────────────────────────────────

const CAT: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICITY: 'Electricidad', STRUCTURE: 'Estructura', OTHER: 'Otro',
};
const PAY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID:    { label: 'Pagado',    color: '#16a34a', bg: '#f0fdf4' },
  PENDING: { label: 'Pendiente', color: '#d97706', bg: '#fffbeb' },
  LATE:    { label: 'Vencido',   color: '#dc2626', bg: '#fef2f2' },
};
const CLAIM_STATUS: Record<string, { label: string; color: string }> = {
  OPEN:        { label: 'Abierto',  color: '#2563eb' },
  IN_PROGRESS: { label: 'En curso', color: '#d97706' },
  RESOLVED:    { label: 'Resuelto', color: '#16a34a' },
};
const PROP_TYPE: Record<string, string> = {
  APARTMENT: 'Departamento', HOUSE: 'Casa', COMMERCIAL: 'Local comercial', PH: 'PH',
};
const INDEX: Record<string, string> = { IPC: 'IPC (INDEC)', ICL: 'ICL (BCRA)' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

// ─── Comprobante Modal ────────────────────────────────────────────────────────

function ReceiptModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, maxWidth: 400, width: '100%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ background: '#16a34a', padding: '24px 24px 20px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Pago confirmado</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{fmtCurrency(payment.amount)}</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {[
            ['Período',  payment.period],
            ['Método',   payment.method ?? 'Efectivo'],
            ['Fecha de pago', payment.paidDate ? fmtDate(payment.paidDate) : '—'],
            ['Vencimiento',   fmtDate(payment.dueDate)],
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

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'inicio' | 'contrato' | 'pagos' | 'reclamos';

export default function TenantPortalPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('inicio');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState<ClaimForm>({ category: '', description: '', photoUrl: '' });
  const [claimError, setClaimError] = useState('');
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { data: portal, isLoading, error } = useQuery({
    queryKey: ['portal', token],
    queryFn: async () => {
      const res = await api.get(`/public/portal/${token}`);
      return res.data.data;
    },
  });

  const claimMutation = useMutation({
    mutationFn: (data: ClaimForm) =>
      api.post(`/public/claims/${token}`, { ...data, photoUrl: data.photoUrl || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal', token] });
      setClaimForm({ category: '', description: '', photoUrl: '' });
      setClaimError('');
      setShowClaimForm(false);
    },
  });

  const cashMutation = useMutation({
    mutationFn: (paymentId: string) =>
      api.post(`/public/portal/${token}/payments/${paymentId}/cash`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['portal', token] });
      setReceipt(res.data.data);
      setConfirmingId(null);
    },
    onError: () => setConfirmingId(null),
  });

  function submitClaim() {
    if (!claimForm.category)              { setClaimError('Seleccioná una categoría'); return; }
    if (claimForm.description.length < 5) { setClaimError('Describí el problema con al menos 5 caracteres'); return; }
    setClaimError('');
    claimMutation.mutate(claimForm as ClaimForm & { category: Exclude<ClaimForm['category'], ''> });
  }

  // ── Loading / Error ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280' }}>Cargando portal...</p>
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: 16 }}>
        <Card style={{ maxWidth: 400, width: '100%' }}>
          <CardContent style={{ paddingTop: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Enlace no válido</p>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>El enlace no es válido o el contrato venció.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tenant, property, contract, nextPayment, payments, claims } = portal;
  const daysLeft = daysUntil(nextPayment.dueDate);
  const pendingPayments = (payments as Payment[]).filter(p => p.status !== 'PAID');
  const openClaims = (claims as Claim[]).filter(c => c.status !== 'RESOLVED');

  // ── Notifications (computed) ─────────────────────────────────────────────────

  const notifications: { type: string; msg: string; detail: string; action?: () => void }[] = [];

  if (daysLeft <= 7 && daysLeft >= 0) {
    notifications.push({
      type: 'payment',
      msg: `Próximo pago en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
      detail: `${fmtCurrency(nextPayment.amount)} — vence el ${fmtDate(nextPayment.dueDate)}`,
      action: () => setTab('pagos'),
    });
  } else if (daysLeft < 0 && pendingPayments.length > 0) {
    notifications.push({
      type: 'urgent',
      msg: 'Tenés un pago vencido',
      detail: `${fmtCurrency(nextPayment.amount)} — venció el ${fmtDate(nextPayment.dueDate)}`,
      action: () => setTab('pagos'),
    });
  }

  const daysToAdjust = daysUntil(contract.nextAdjustDate);
  if (daysToAdjust >= 0 && daysToAdjust <= 30) {
    notifications.push({
      type: 'adjustment',
      msg: `Ajuste de alquiler en ${daysToAdjust} días`,
      detail: `Índice ${INDEX[contract.indexType] ?? contract.indexType} · Monto actual: ${fmtCurrency(contract.currentAmount)}`,
    });
  }

  for (const c of openClaims) {
    notifications.push({
      type: 'claim',
      msg: `Reclamo ${CLAIM_STATUS[c.status]?.label.toLowerCase() ?? c.status}`,
      detail: `${CAT[c.category] ?? c.category} · Desde ${fmtDate(c.createdAt)}`,
      action: () => setTab('reclamos'),
    });
  }

  // ── Tab Styles ──────────────────────────────────────────────────────────────

  const tabs: { key: TabKey; label: string; badge?: number }[] = [
    { key: 'inicio',   label: 'Inicio', badge: notifications.length || undefined },
    { key: 'contrato', label: 'Contrato' },
    { key: 'pagos',    label: 'Pagos', badge: pendingPayments.length || undefined },
    { key: 'reclamos', label: 'Reclamos', badge: openClaims.length || undefined },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa', fontFamily: 'system-ui, sans-serif' }}>
      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '20px 20px 0', color: '#fff' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Hola, {tenant.name.split(' ')[0]}</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>{PROP_TYPE[property.type] ?? property.type} · {property.address}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: tab === t.key ? 700 : 400,
                  color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.65)',
                  borderBottom: tab === t.key ? '3px solid #fff' : '3px solid transparent',
                  position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {t.label}
                {t.badge ? (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── TAB: INICIO ────────────────────────────────────────────────────── */}
        {tab === 'inicio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Próximo pago card */}
            <div style={{ background: daysLeft < 0 ? '#fef2f2' : daysLeft <= 5 ? '#fffbeb' : '#fff', border: `1px solid ${daysLeft < 0 ? '#fca5a5' : daysLeft <= 5 ? '#fcd34d' : '#e5e7eb'}`, borderRadius: 12, padding: '20px 20px' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Próximo pago</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: daysLeft < 0 ? '#dc2626' : '#111827', marginBottom: 4 }}>
                {fmtCurrency(nextPayment.amount)}
              </div>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                {daysLeft < 0
                  ? `Venció el ${fmtDate(nextPayment.dueDate)} (hace ${Math.abs(daysLeft)} días)`
                  : daysLeft === 0
                  ? `Vence hoy · ${fmtDate(nextPayment.dueDate)}`
                  : `Vence el ${fmtDate(nextPayment.dueDate)} · en ${daysLeft} días`}
              </div>
              <Button
                onClick={() => setTab('pagos')}
                style={{ background: daysLeft < 0 ? '#dc2626' : '#6366f1', color: '#fff', border: 'none' }}
              >
                Ver pagos
              </Button>
            </div>

            {/* Notificaciones */}
            {notifications.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Alertas ({notifications.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notifications.map((n, i) => {
                    const colors: Record<string, { bg: string; icon: string; color: string }> = {
                      payment:    { bg: '#fffbeb', icon: '💰', color: '#d97706' },
                      urgent:     { bg: '#fef2f2', icon: '🚨', color: '#dc2626' },
                      adjustment: { bg: '#f0f9ff', icon: '📈', color: '#0284c7' },
                      claim:      { bg: '#faf5ff', icon: '🔧', color: '#7c3aed' },
                    };
                    const s = colors[n.type] ?? { bg: '#f9fafb', icon: 'ℹ️', color: '#6b7280' };
                    return (
                      <div
                        key={i}
                        onClick={n.action}
                        style={{ display: 'flex', gap: 12, padding: '12px 16px', background: s.bg, borderRadius: 10, border: `1px solid ${s.color}30`, cursor: n.action ? 'pointer' : 'default', alignItems: 'flex-start' }}
                      >
                        <span style={{ fontSize: 20 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{n.msg}</div>
                          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{n.detail}</div>
                        </div>
                        {n.action && <span style={{ marginLeft: 'auto', color: '#9ca3af', fontSize: 18 }}>›</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {notifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Todo en orden</div>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>No tenés alertas pendientes</div>
              </div>
            )}

            {/* Resumen rápido */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div onClick={() => setTab('contrato')} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', cursor: 'pointer' }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Contrato vence</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtDate(contract.endDate)}</div>
              </div>
              <div onClick={() => setTab('reclamos')} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', cursor: 'pointer' }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Reclamos activos</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{openClaims.length} pendiente{openClaims.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: CONTRATO ──────────────────────────────────────────────────── */}
        {tab === 'contrato' && (
          <Card>
            <CardHeader>
              <CardTitle style={{ fontSize: 16 }}>Tu contrato de alquiler</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', fontSize: 14 }}>
                {[
                  ['Inicio del contrato', fmtDate(contract.startDate)],
                  ['Vencimiento', fmtDate(contract.endDate)],
                  ['Monto inicial', fmtCurrency(contract.initialAmount)],
                  ['Monto actual', fmtCurrency(contract.currentAmount)],
                  ['Día de pago', `Día ${contract.paymentDay} de cada mes`],
                  ['Índice de ajuste', INDEX[contract.indexType] ?? contract.indexType],
                  ['Frecuencia ajuste', `Cada ${contract.adjustFrequency} meses`],
                  ['Próximo ajuste', fmtDate(contract.nextAdjustDate)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e7ff' }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Propiedad alquilada</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{property.address}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{PROP_TYPE[property.type] ?? property.type}</div>
              </div>

              <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e7ff' }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Tus datos</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{tenant.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{tenant.email}</div>
                {tenant.phone && <div style={{ fontSize: 13, color: '#6b7280' }}>{tenant.phone}</div>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── TAB: PAGOS ─────────────────────────────────────────────────────── */}
        {tab === 'pagos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Pagos pendientes/vencidos */}
            {pendingPayments.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  Pendientes de pago
                </div>
                {pendingPayments.map((p) => {
                  const st = PAY_STATUS[p.status] ?? PAY_STATUS.PENDING;
                  const isConfirming = confirmingId === p.id;
                  return (
                    <div key={p.id} style={{ background: st.bg, border: `1px solid ${st.color}40`, borderRadius: 12, padding: '16px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 18 }}>{fmtCurrency(p.amount)}</div>
                          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                            {p.period} · Vto. {fmtDate(p.dueDate)}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: st.color, background: '#fff', padding: '3px 8px', borderRadius: 6, border: `1px solid ${st.color}40` }}>
                          {st.label}
                        </span>
                      </div>
                      {!isConfirming ? (
                        <Button
                          onClick={() => setConfirmingId(p.id)}
                          style={{ width: '100%', background: '#6366f1', color: '#fff', border: 'none' }}
                        >
                          💵 Registrar pago en efectivo
                        </Button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: '#fff', borderRadius: 8, padding: '12px', fontSize: 13, color: '#374151', border: '1px solid #e5e7eb' }}>
                            ¿Confirmar que pagaste <strong>{fmtCurrency(p.amount)}</strong> en efectivo?
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              onClick={() => cashMutation.mutate(p.id)}
                              disabled={cashMutation.isPending}
                              style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none' }}
                            >
                              {cashMutation.isPending ? 'Confirmando...' : 'Sí, confirmar'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setConfirmingId(null)}
                              style={{ flex: 1 }}
                            >
                              Cancelar
                            </Button>
                          </div>
                          {cashMutation.isError && (
                            <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>Error al confirmar. Intentá de nuevo.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Historial de pagos */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Historial
              </div>
              {(payments as Payment[]).length === 0 ? (
                <Card><CardContent style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No hay pagos registrados.</CardContent></Card>
              ) : (
                (payments as Payment[]).map((p) => {
                  const st = PAY_STATUS[p.status] ?? PAY_STATUS.PENDING;
                  return (
                    <div
                      key={p.id}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 8, cursor: p.status === 'PAID' ? 'pointer' : 'default' }}
                      onClick={() => p.status === 'PAID' && setReceipt(p)}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.period}</div>
                        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                          Vto. {fmtDate(p.dueDate)}
                          {p.paidDate && ` · Pagado ${fmtDate(p.paidDate)}`}
                          {p.method && ` · ${p.method}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtCurrency(p.amount)}</div>
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
        )}

        {/* ── TAB: RECLAMOS ──────────────────────────────────────────────────── */}
        {tab === 'reclamos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!showClaimForm ? (
              <Button
                onClick={() => setShowClaimForm(true)}
                style={{ background: '#6366f1', color: '#fff', border: 'none', alignSelf: 'flex-start' }}
              >
                + Reportar un problema
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle style={{ fontSize: 16 }}>Nuevo reclamo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <Label>Categoría *</Label>
                      <Select value={claimForm.category} onValueChange={(v) => setClaimForm(f => ({ ...f, category: v as ClaimForm['category'] }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccioná una categoría" /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CAT).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descripción *</Label>
                      <Textarea
                        value={claimForm.description}
                        onChange={e => setClaimForm(f => ({ ...f, description: e.target.value }))}
                        rows={4}
                        placeholder="Describí el problema en detalle..."
                      />
                    </div>
                    <div>
                      <Label>URL de foto (opcional)</Label>
                      <Input
                        value={claimForm.photoUrl}
                        onChange={e => setClaimForm(f => ({ ...f, photoUrl: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    {claimError && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{claimError}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button onClick={submitClaim} disabled={claimMutation.isPending} style={{ background: '#6366f1', color: '#fff', border: 'none' }}>
                        {claimMutation.isPending ? 'Enviando...' : 'Enviar reclamo'}
                      </Button>
                      <Button variant="outline" onClick={() => { setShowClaimForm(false); setClaimForm({ category: '', description: '', photoUrl: '' }); setClaimError(''); }}>
                        Cancelar
                      </Button>
                    </div>
                    {claimMutation.isError && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>Error al enviar. Intentá de nuevo.</p>}
                    {claimMutation.isSuccess && <p style={{ color: '#16a34a', fontSize: 13, margin: 0 }}>✓ Reclamo enviado. El propietario te contactará.</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {(claims as Claim[]).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', color: '#9ca3af' }}>
                No hay reclamos registrados
              </div>
            ) : (
              (claims as Claim[]).map((c) => {
                const st = CLAIM_STATUS[c.status] ?? { label: c.status, color: '#6b7280' };
                return (
                  <Card key={c.id}>
                    <CardContent style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{CAT[c.category] ?? c.category}</div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: st.color, background: `${st.color}15`, padding: '2px 8px', borderRadius: 6 }}>
                          {st.label}
                        </span>
                      </div>
                      <p style={{ color: '#4b5563', fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }}>{c.description}</p>
                      {c.history.length > 0 && (
                        <div style={{ fontSize: 12, color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: 8, marginTop: 8 }}>
                          {c.history.map((h, i) => (
                            <div key={i} style={{ marginBottom: 4 }}>
                              {new Date(h.changedAt).toLocaleDateString('es-AR')} · {CLAIM_STATUS[h.oldStatus]?.label ?? h.oldStatus} → <strong>{CLAIM_STATUS[h.newStatus]?.label ?? h.newStatus}</strong>
                              {h.comment && <span> · "{h.comment}"</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                        Reportado el {fmtDate(c.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
