'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney, formatDate } from '@rently/shared';

import PortalHeader from './components/PortalHeader';
import PaymentCard from './components/PaymentCard';
import AlertBanner from './components/AlertBanner';
import ContractInfo from './components/ContractInfo';
import PaymentHistory from './components/PaymentHistory';
import ClaimsSection from './components/ClaimsSection';
import ReceiptModal from './components/ReceiptModal';

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

// ─── Labels (needed for notification computation) ─────────────────────────────

const CAT: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICITY: 'Electricidad', STRUCTURE: 'Estructura', OTHER: 'Otro',
};
const CLAIM_STATUS: Record<string, { label: string; color: string }> = {
  OPEN:        { label: 'Abierto',  color: '#2563eb' },
  IN_PROGRESS: { label: 'En curso', color: '#d97706' },
  RESOLVED:    { label: 'Resuelto', color: '#16a34a' },
};
const INDEX: Record<string, string> = { IPC: 'IPC (INDEC)', ICL: 'ICL (BCRA)' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
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
      detail: `${formatMoney(nextPayment.amount)} — vence el ${formatDate(nextPayment.dueDate)}`,
      action: () => setTab('pagos'),
    });
  } else if (daysLeft < 0 && pendingPayments.length > 0) {
    notifications.push({
      type: 'urgent',
      msg: 'Tenés un pago vencido',
      detail: `${formatMoney(nextPayment.amount)} — venció el ${formatDate(nextPayment.dueDate)}`,
      action: () => setTab('pagos'),
    });
  }

  const daysToAdjust = daysUntil(contract.nextAdjustDate);
  if (daysToAdjust >= 0 && daysToAdjust <= 30) {
    notifications.push({
      type: 'adjustment',
      msg: `Ajuste de alquiler en ${daysToAdjust} días`,
      detail: `Índice ${INDEX[contract.indexType] ?? contract.indexType} · Monto actual: ${formatMoney(contract.currentAmount)}`,
    });
  }

  for (const c of openClaims) {
    notifications.push({
      type: 'claim',
      msg: `Reclamo ${CLAIM_STATUS[c.status]?.label.toLowerCase() ?? c.status}`,
      detail: `${CAT[c.category] ?? c.category} · Desde ${formatDate(c.createdAt)}`,
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

      <PortalHeader
        tenant={tenant}
        property={property}
        activeTab={tab}
        tabs={tabs}
        onTabChange={(key) => setTab(key as TabKey)}
      />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px' }}>

        {/* ── TAB: INICIO ────────────────────────────────────────────────────── */}
        {tab === 'inicio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PaymentCard
              nextPayment={nextPayment}
              daysLeft={daysLeft}
              onViewPayments={() => setTab('pagos')}
            />

            <AlertBanner notifications={notifications} />

            {/* Resumen rápido */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button type="button" onClick={() => setTab('contrato')} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', cursor: 'pointer', textAlign: 'left', font: 'inherit', display: 'block', width: '100%' }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Contrato vence</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{formatDate(contract.endDate)}</div>
              </button>
              <button type="button" onClick={() => setTab('reclamos')} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', cursor: 'pointer', textAlign: 'left', font: 'inherit', display: 'block', width: '100%' }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Reclamos activos</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{openClaims.length} pendiente{openClaims.length !== 1 ? 's' : ''}</div>
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: CONTRATO ──────────────────────────────────────────────────── */}
        {tab === 'contrato' && (
          <ContractInfo contract={contract} property={property} tenant={tenant} />
        )}

        {/* ── TAB: PAGOS ─────────────────────────────────────────────────────── */}
        {tab === 'pagos' && (
          <PaymentHistory
            payments={payments as Payment[]}
            pendingPayments={pendingPayments}
            confirmingId={confirmingId}
            onConfirmStart={setConfirmingId}
            onConfirmSubmit={(id) => cashMutation.mutate(id)}
            onConfirmCancel={() => setConfirmingId(null)}
            isConfirming={cashMutation.isPending}
            confirmError={cashMutation.isError}
            onViewReceipt={setReceipt}
          />
        )}

        {/* ── TAB: RECLAMOS ──────────────────────────────────────────────────── */}
        {tab === 'reclamos' && (
          <ClaimsSection
            claims={claims as Claim[]}
            showForm={showClaimForm}
            formData={claimForm}
            formError={claimError}
            isSubmitting={claimMutation.isPending}
            submitError={claimMutation.isError}
            submitSuccess={claimMutation.isSuccess}
            onToggleForm={() => setShowClaimForm(true)}
            onFormFieldChange={(field, value) => setClaimForm(f => ({ ...f, [field]: value }))}
            onSubmit={submitClaim}
            onCancelForm={() => {
              setShowClaimForm(false);
              setClaimForm({ category: '', description: '', photoUrl: '' });
              setClaimError('');
            }}
          />
        )}
      </div>
    </div>
  );
}
