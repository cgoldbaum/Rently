'use client';

import { useEffect, useState } from 'react';
import type { SubscriptionPlan, SubscriptionSummary } from '@/types/subscription';
import api from '@/lib/api';
import Modal from './Modal';

function formatMoney(amount: number, currency: string) {
  return amount.toLocaleString('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 });
}

function limitLabel(plan: SubscriptionPlan) {
  return plan.propertyLimit == null ? 'Propiedades ilimitadas' : `Hasta ${plan.propertyLimit} propiedades`;
}

export default function SubscriptionUpgradeModal({
  summary,
  reason,
  onClose,
  onCheckoutStarted,
}: {
  summary: SubscriptionSummary | null;
  reason?: string | null;
  onClose: () => void;
  onCheckoutStarted?: () => void;
}) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(summary?.plans ?? []);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (summary?.plans?.length) return;
    api.get('/owner/subscription/plans')
      .then(r => setPlans(r.data.data))
      .catch(() => setError('No se pudieron cargar los planes.'));
  }, [summary]);

  async function startCheckout(planCode: string) {
    setLoadingPlan(planCode);
    setError('');
    try {
      const { data } = await api.post('/owner/subscription/checkout', { planCode });
      const initPoint = data.data.initPoint;
      if (initPoint) {
        window.location.href = initPoint;
        onCheckoutStarted?.();
        return;
      }
      setError('Mercado Pago no devolvió un link de pago.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? 'No se pudo iniciar el checkout.');
    } finally {
      setLoadingPlan(null);
    }
  }

  const title = reason === 'PROPERTY_LIMIT_REACHED' ? 'Mejorá tu plan' : 'Activá tu suscripción';

  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {reason === 'PROPERTY_LIMIT_REACHED'
            ? `Tenés ${summary?.usage.properties ?? 0} propiedades cargadas y llegaste al límite de tu plan actual.`
            : 'Para crear propiedades necesitás una suscripción activa de propietario.'}
        </div>

        {plans.map(plan => {
          const current = summary?.subscription?.plan.code === plan.code;
          return (
            <div key={plan.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{plan.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{limitLabel(plan)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--accent)' }}>
                  {formatMoney(plan.price, plan.currency)}
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 8 }}
                  disabled={loadingPlan === plan.code || current}
                  onClick={() => startCheckout(plan.code)}
                >
                  {current ? 'Plan actual' : loadingPlan === plan.code ? 'Abriendo...' : 'Elegir'}
                </button>
              </div>
            </div>
          );
        })}

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, padding: 10, fontSize: 13 }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
