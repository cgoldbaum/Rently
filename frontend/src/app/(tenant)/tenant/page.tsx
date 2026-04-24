'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type UpcomingPayment = {
  month: string;
  dueDate: string;
  amount: number;
  hasAdjustment: boolean;
  adjustmentPct: number | null;
};

type Claim = { id: string; status: string; title?: string; category: string };

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

  const { data: contract } = useQuery<{ endDate: string; monthlyAmount: number; progress: number } | null>({
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

  const next = upcoming[0];
  const daysLeft = next ? daysUntil(next.dueDate) : null;
  const openClaims = claims.filter(c => c.status !== 'RESOLVED').length;

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
          <Link
            href="/tenant/payments"
            style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            Ver pagos
          </Link>
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
