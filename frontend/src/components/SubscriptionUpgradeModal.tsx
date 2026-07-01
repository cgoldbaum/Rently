'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SubscriptionPlan, SubscriptionSummary } from '@/types/subscription';
import api from '@/lib/api';
import Modal from './Modal';
import { formatMoney } from '@rently/shared';

function limitLabel(plan: SubscriptionPlan, t: (key: string, opts?: any) => string) {
  return plan.propertyLimit == null
    ? t('subscription.limitLabel')
    : t('subscription.limitLabelCount', { count: plan.propertyLimit });
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
  const { t } = useTranslation('dashboard');
  const [plans, setPlans] = useState<SubscriptionPlan[]>(summary?.plans ?? []);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (summary?.plans?.length) return;
    api.get('/owner/subscription/plans')
      .then(r => setPlans(r.data.data))
      .catch(() => setError(t('subscription.errorLoadingPlans')));
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
      setError(t('subscription.errorNoLink'));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg ?? t('subscription.checkoutError'));
    } finally {
      setLoadingPlan(null);
    }
  }

  const title = reason === 'PROPERTY_LIMIT_REACHED' ? t('subscription.upgradeTitle') : t('subscription.activateTitle');

  return (
    <Modal title={title} onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {reason === 'PROPERTY_LIMIT_REACHED'
            ? t('subscription.limitReached', { count: summary?.usage.properties ?? 0 })
            : t('subscription.needSubscription')}
        </div>

        {plans.map(plan => {
          const current = summary?.subscription?.plan.code === plan.code;
          return (
            <div key={plan.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{plan.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>{limitLabel(plan, t)}</div>
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
                  {current ? t('subscription.currentPlan') : loadingPlan === plan.code ? t('subscription.opening') : t('subscription.choose')}
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
