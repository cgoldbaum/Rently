'use client';

import { Suspense, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';

type DemoPaymentLink = {
  preferenceId: string;
  amount: number;
  period: string;
  description?: string;
  status: string;
  property: { name?: string; address: string };
  tenant?: { name: string } | null;
};

function fmtCurrency(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function DemoCheckout() {
  const params = useSearchParams();
  const linkId = params.get('linkId') ?? '';
  const paymentId = params.get('paymentId') ?? '';
  const checkoutId = paymentId || linkId;
  const isTenantPayment = Boolean(paymentId);
  const [rejected, setRejected] = useState(false);

  const { data: link, isLoading, isError } = useQuery<DemoPaymentLink>({
    queryKey: ['mp-demo-link', checkoutId, isTenantPayment],
    enabled: Boolean(checkoutId),
    queryFn: async () => {
      const url = isTenantPayment ? `/public/tenant-payments/${paymentId}` : `/public/payment-links/${linkId}`;
      const res = await api.get(url);
      return res.data.data;
    },
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const url = isTenantPayment ? `/public/tenant-payments/${paymentId}/mock-pay` : `/public/payment-links/${linkId}/mock-pay`;
      const res = await api.post(url);
      return res.data.data;
    },
  });

  const paid = link?.status === 'PAID' || payMutation.isSuccess;

  return (
    <main style={{ minHeight: '100vh', background: '#f4f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <section style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 18px 50px rgba(15, 23, 42, 0.14)' }}>
        <header style={{ background: '#00a8e0', color: '#fff', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Mercado Pago</div>
          <div style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.2)', borderRadius: 999, padding: '4px 10px' }}>Demo</div>
        </header>

        <div style={{ padding: 24 }}>
          {!checkoutId && (
            <div style={{ color: '#b91c1c', fontWeight: 600 }}>Falta el identificador del link de pago.</div>
          )}

          {isLoading && <div style={{ color: '#64748b', fontSize: 14 }}>Cargando checkout...</div>}
          {isError && <div style={{ color: '#b91c1c', fontWeight: 600 }}>No se pudo cargar este pago demo.</div>}

          {link && (
            <>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Pagás a Rently</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{fmtCurrency(link.amount)}</div>
              <div style={{ fontSize: 14, color: '#475569', marginBottom: 22 }}>
                {link.description || `Alquiler ${link.period}`}
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Propiedad</span>
                  <strong style={{ textAlign: 'right', color: '#0f172a' }}>{link.property.name ?? link.property.address}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <span style={{ color: '#64748b' }}>Período</span>
                  <strong style={{ color: '#0f172a' }}>{link.period}</strong>
                </div>
                {link.tenant && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ color: '#64748b' }}>Inquilino</span>
                    <strong style={{ color: '#0f172a' }}>{link.tenant.name}</strong>
                  </div>
                )}
              </div>

              {paid ? (
                <div style={{ background: '#dcfce7', color: '#166534', borderRadius: 8, padding: 14, fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
                  Pago aprobado. Ya podés volver a Rently.
                </div>
              ) : rejected ? (
                <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: 14, fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
                  Pago rechazado para probar el flujo.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={() => payMutation.mutate()}
                    disabled={payMutation.isPending}
                    style={{ width: '100%', border: 0, borderRadius: 6, background: '#009ee3', color: '#fff', padding: '12px 14px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
                  >
                    {payMutation.isPending ? 'Procesando...' : 'Pagar con tarjeta de prueba'}
                  </button>
                  <button
                    onClick={() => setRejected(true)}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#334155', padding: '11px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Simular rechazo
                  </button>
                </div>
              )}

              <p style={{ marginTop: 18, color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
                Entorno demo de Rently. No se usa una cuenta real ni se procesa dinero.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function MercadoPagoDemoPage() {
  return (
    <Suspense fallback={null}>
      <DemoCheckout />
    </Suspense>
  );
}
