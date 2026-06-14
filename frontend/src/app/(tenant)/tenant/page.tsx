'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToastStore } from '@/store/toast';
import DashboardHeader from './components/DashboardHeader';
import PaymentActions from './components/PaymentActions';
import UpcomingPayments from './components/UpcomingPayments';
import QuickLinks from './components/QuickLinks';

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
    onError: () => useToastStore.getState().showToast('No se pudo iniciar el pago con Mercado Pago. Intentá de nuevo.'),
  });

  const cashMutation = useMutation({
    mutationFn: async (data: { paymentId: string; note?: string }) => api.post('/tenant/payments/cash', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-upcoming'] });
      setPayModal(null);
      setCashNote('');
    },
    onError: () => useToastStore.getState().showToast('No se pudo registrar el pago. Intentá de nuevo.'),
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
      <PaymentActions
        isOpen={payModal !== null}
        payModal={payModal}
        nextPayment={next!}
        ownerInfo={contract?.ownerPaymentInfo}
        cashNote={cashNote}
        onCashNoteChange={setCashNote}
        onClose={() => setPayModal(null)}
        onSelectMethod={setPayModal}
        onMpPay={() => next && mpMutation.mutate(next.id)}
        mpIsPending={mpMutation.isPending}
        onCashSubmit={handleCashSubmit}
        cashIsPending={cashMutation.isPending}
        onCopy={copyValue}
      />

      <DashboardHeader
        userName={user?.name || user?.email?.split('@')[0]}
        nextPayment={next}
        daysLeft={daysLeft}
        canPayNext={canPayNext}
        onPayNow={openPayModal}
      />

      <QuickLinks
        contractEndDate={contract?.endDate}
        contractProgress={contract?.progress}
        openClaims={openClaims}
      />

      <UpcomingPayments payments={upcoming} />
    </div>
  );
}
